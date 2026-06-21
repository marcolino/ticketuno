import webpush, { WebPushError } from 'web-push';
import { database } from '../db/database';
import { getErrorMessage } from '@ticketuno/shared';
import { i18n } from '../i18n';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_MAILTO } = process.env;
  if (!VAPID_PUBLIC_KEY) throw new Error(i18n.t('VAPID_PUBLIC_KEY env var not set'));
  if (!VAPID_PRIVATE_KEY) throw new Error(i18n.t('VAPID_PRIVATE_KEY env var not set'));
  if (!VAPID_MAILTO) throw new Error(i18n.t('VAPID_MAILTO env var not set'));
  webpush.setVapidDetails(`mailto:${VAPID_MAILTO}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  initialized = true;
}

export async function sendPushToUser(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; cleaned: number }> {
  ensureInitialized();

  // const subs = await database.getPushSubscriptionsByUserId(userId);
  if (subs.length === 0) {
    return {
      sent: 0,
      cleaned: 0,
    };
  }

  let sent = 0;
  let cleaned = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        console.log("SENDING PUSH NOTIFICATION:", )
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        await database.touchPushSubscription(sub.endpoint);
        sent++;
        console.log("SENT:", sent)
      } catch (error) {
        // 410 Gone / 404 = browser unsubscribed or endpoint expired
        if (error instanceof WebPushError && (error?.statusCode === 410 || error?.statusCode === 404)) {
          await database.deletePushSubscription(sub.endpoint);
          cleaned++;
        } else {
          console.error(`[push] Failed for user ${userId}:`, { err: getErrorMessage(error) });
        }
      }
    })
  );

  return {
    sent,
    cleaned,
  };
}
