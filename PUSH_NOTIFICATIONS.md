# Push Notifications - Custom Plan

This is a fully custom, lock-in-free solution, completely feasible and well-supported.
The stack is built on open W3C standards (Web Push Protocol + VAPID), and the only npm dependency you need on the backend is web-push. No Firebase, no third-party service.

## How It Works (the big picture)

Browser                  Your Backend             Browser Push Service
   |                          |                    (Google/Mozilla/Apple)
   |-- subscribe() ---------> |                           |
   |   (PushSubscription)     |-- store subscription      |
   |                          |                           |
   |                   [cron: event approaching]          |
   |                          |-- POST /push -----------> |
   |                          |   (VAPID-signed payload)  |
   |                          |                           |
   |<-- push event ------------------------------------ push|
   |   (Service Worker        |                           |
   |    wakes up, shows       |                           |
   |    notification)         |                           |

The browser's built-in push service (different per browser, but all speak the same open protocol) acts as the relay.
The server never connects directly to the user's device — it talks to the push service via VAPID-authenticated HTTP requests. No middleman SaaS needed.

## Backend Plan

1. Generate VAPID Keys (one-time setup)
```bash
npx web-push generate-vapid-keys
Store the resulting VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your .env. The public key is also sent to the frontend.
```

2. Install web-push
```bash
npm install web-push
npm install -D @types/web-push
```

3. New DB Table — push_subscriptions
```sql
CREATE TABLE push_subscriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT    NOT NULL UNIQUE,
  p256dh      TEXT    NOT NULL,   -- encryption key
  auth        TEXT    NOT NULL,   -- auth secret
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);
```

One user can have multiple subscriptions (phone + desktop + tablet), so it's a one-to-many relationship.

4. New API Routes
### Method   Route                        Purpose
### POST     /api/push/subscribe          Save a new PushSubscription (authenticated)
### DELETE   /api/push/subscribe          Remove a subscription by endpoint
### GET      /api/push/vapid-public-key   Return the VAPID public key to the frontend#

5. Push Service Module — pushService.ts
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:you@ticketuno.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(userId: number, payload: PushPayload) {
  const subs = db.getSubscriptionsForUser(userId);
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err: any) {
      // 410 Gone = subscription expired/revoked → clean it up
      if (err.statusCode === 410) db.deleteSubscription(sub.endpoint);
    }
  }
}
```

6. Cron Job — Reminder Scheduler
A cron job (e.g. using node-cron) runs periodically (e.g. every hour) and:

 - Queries performances happening in ~24h (and optionally ~2h)
 - Finds all bookings for those performances
 - Calls sendPushToUser() for each booking owner
 - Marks the notification as sent (add a push_reminders_sent column on bookings or a separate log table to avoid double-firing)

```typescript
import cron from 'node-cron';

// Runs every hour
cron.schedule('0 * * * *', async () => {
  const upcoming = db.getPerformancesStartingIn({ hours: 24 });
  for (const perf of upcoming) {
    const bookings = db.getActiveBookingsForPerformance(perf.id);
    for (const booking of bookings) {
      if (!booking.reminder_sent) {
        await sendPushToUser(booking.user_id, {
          title: 'Your show is tomorrow!',
          body: `${perf.event_name} — ${formatDate(perf.starts_at)}`,
          url: `/bookings/${booking.booking_ref}`
        });
        db.markReminderSent(booking.id);
      }
    }
  }
});
```

# Frontend Plan
1. Service Worker — sw.ts (or extend your existing Vite PWA SW)
This is the critical piece. The SW wakes up even when the app is closed.
```typescript
// Handle incoming push
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: { url: data.url },
    })
  );
});

// Handle notification click → open/focus the app
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

With vite-plugin-pwa we can inject this into SW via injectManifest mode or use the additionalManifestEntries + custom SW file approach.

2. Subscription Hook — usePushNotifications.ts
```typescript
export function usePushNotifications() {
  const [status, setStatus] = useState<'idle'|'granted'|'denied'|'unsupported'>('idle');

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { setStatus('denied'); return; }

    const reg = await navigator.serviceWorker.ready;
    const vapidKey = await api.get('/push/vapid-public-key');

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,  // required — no silent pushes
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });

    await api.post('/push/subscribe', subscription.toJSON());
    setStatus('granted');
  };

  const unsubscribe = async () => { /* reverse of above */ };

  return { status, subscribe, unsubscribe };
}
```

3. UI — Opt-in Component
Push notifications require explicit user opt-in (you cannot subscribe silently). A good pattern: show a non-intrusive banner or a toggle in the user's account settings page.
```tsx
function PushNotificationToggle() {
  const { status, subscribe, unsubscribe } = usePushNotifications();

  return (
    <FormControlLabel
      control={<Switch checked={status === 'granted'} onChange={...} />}
      label="Remind me before my bookings"
    />
  );
}
```

Avoid triggering requestPermission() on page load — browsers penalize that pattern and users dismiss it. Tie it to a deliberate user action.

### Browser Compatibility Note
-----------------------------------------
Browser           Support
Chrome / Edge     ✅ Full
Firefox           ✅ Full
Safari macOS      ✅ Safari 16+
Safari iOS        ✅ iOS 16.4+ — *but only if the PWA is installed to home screen*

The iOS caveat is the main gotcha. Push only works from an installed PWA on iOS, not from the browser tab. Worth communicating to your users.

## Summary of Moving Parts
Backend
├── .env               VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
├── push_subscriptions (DB table)
├── pushService.ts     webpush.sendNotification()
├── routes/push.ts     subscribe / unsubscribe / vapid-key
└── jobs/reminders.ts  node-cron → sendPushToUser()

Frontend
├── sw.ts              push event handler, notificationclick
├── usePushNotifications.ts  subscribe/unsubscribe hook
└── PushNotificationToggle   UI opt-in (in account settings)

This is a self-contained, standards-based solution. The only external dependency is the browser vendor's push relay (which can't be avoided — that's baked into the browser), but code has zero coupling to any specific vendor.

## GitHub Actions Scheduled Workflow — instead of node-cron solution for free plans
This is actually a clean, zero-cost pattern used in production. The idea:

GitHub Actions fires on a cron schedule (always reliable, runs on GitHub's infrastructure)
It makes an authenticated POST to a protected endpoint on your backend
The request wakes your Fly.io machine naturally
Your endpoint runs the reminder logic and returns

GitHub Actions (cron)
       |
       | POST /api/internal/send-booking-reminders
       | Authorization: Bearer <CRON_SECRET>
       ↓
  Fly.io machine wakes up
       |
       ↓
  reminderService.ts runs

## What to Build
Backend — add one protected route:
```typescript
// routes/internal.ts
router.post('/send-booking-reminders', (req, res) => {
  const secret = req.headers.authorization?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // fire-and-forget, respond immediately so the Action doesn't time out
  res.json({ ok: true });
  runReminderJob(); // async, runs after response
});
```

Add CRON_SECRET to your .env and Fly.io secrets (fly secrets set CRON_SECRET=...).
GitHub Actions workflow — .github/workflows/reminders.yml:
yamlname: Send booking reminders

on:
  schedule:
    - cron: '0 * * * *'   # every hour — adjust as needed

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger reminder endpoint
        run: |
          curl -f -X POST https://your-app.fly.dev/api/internal/send-booking-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"

Store CRON_SECRET in your GitHub repo → Settings → Secrets and variables → Actions.

A Few Practical Notes

GitHub Actions schedule is not exact — it can drift by 15–30 min under load. Fine for "reminder the day before", not great for "reminder 10 minutes before". For theater bookings, hourly precision is more than enough.
Keep runReminderJob() idempotent — use the reminder_sent flag on bookings so re-runs don't double-notify.
Fly.io machine wake-up takes ~1–3 seconds on cold start. Your curl will just wait — no issue.
If you ever move off free tier and run the machine 24/7, you can drop the GitHub Action and switch back to node-cron with zero changes to your reminder logic, since it's isolated in runReminderJob().
Please start implementing backend stuff.05:36Ha pensato per 8sHa pensato per 8sI'll write the full set of files. Let me structure them cleanly so each has a single responsibility and fits your existing architecture.Architected TypeScript backend implementation across multiple filesArchitected TypeScript backend implementation across multiple filesThese are pure TypeScript files — I'll write them as a reference artifact you can drop into your project.File creato, file lettoFile creato, file lettoSix files + the GitHub Actions workflow. A few things worth flagging:
On pushSubscriptionService.ts — I kept it as a separate class rather than adding methods to your existing database.ts. Given how large that file already is, this keeps concerns isolated.
On reminderJob.ts — adjust the column names if yours differ (e.name, p.starts_at, etc). The 23h–25h window gives a ±1h tolerance around "24h before", so hourly cron granularity is fine without any risk of missing a show.
On routes/push.ts — the req.user!.id assumes your JWT middleware attaches the decoded user to req.user. Adjust to match whatever your middleware sets (might be req.userId or similar).
On the migration — if bookings is an existing populated table, use ALTER TABLE bookings ADD COLUMN reminder_24h_sent INTEGER NOT NULL DEFAULT 0; rather than including it in a CREATE TABLE.
Once the backend is merged, just shout and we can move on to the frontend (SW + hook + toggle UI).Push notifications backendDocumento · MD Scaricaskipped is always 0 ???I do not see b.canceled = 0 clause ...what is p256dh ?Please putconst token = req.headers.authorization?.replace('Bearer ', '');
    if (!token || token !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }In a new requireCronAuth function , like requireAuth, or integrate with it (or don't do it at all), as you think it's best...06:01Reconciled code issues and clarified technical implementation detailsReconciled code issues and clarified technical implementation detailsGood catches, let me address all four:

skipped — declared but never incremented. I'll actually track meaningful skips (bookings in window where user has no push subscription).
Cancellation check — I did write b.deleted_at IS NULL but if your bookings table uses a different column I need to match it. I'll note the assumption clearly.
p256dh explained below.
requireCronAuth — separate middleware makes more sense than integrating with requireAuth, since one validates a JWT user, the other validates a static server secret. Different purposes.


## What is p256dh?
When a browser subscribes to push notifications, it generates an encryption keypair using the P-256 elliptic curve (a NIST standard). p256dh stands for P-256 Diffie-Hellman — it's the browser's public key. Your server uses it (together with auth, a random 16-byte secret) to encrypt the payload before sending it to the browser's push relay. Only that specific browser instance can decrypt it. You never handle these values directly — web-push does the crypto for you — but you must store and pass them back faithfully.
