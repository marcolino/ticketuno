import { database } from '../db/database';
import { sendPushToUser } from '../services/pushService';
import { i18n } from '../i18n';
import config from '../shared/config';

export async function runReminderJob(): Promise<{ sent: number; skipped: number }> {
  const now = new Date();

  // const from = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h from now - TODO: to config
  // const to = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25h from now - TODO: to config

  // TODO: DEBUG ONLY!!!
  const from = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1h from now
  const to = new Date(now.getTime() + 8760 * 60 * 60 * 1000); // 8760h from now

  // Performances store date + time as separate TEXT columns, e.g. "2025-06-10" + "20:30"
  // We query by reconstructed ISO string: "2025-06-10T20:30"
  const bookings = await database.getBookingsForReminder(
    from.toISOString().slice(0, 16), // "YYYY-MM-DDTHH:MM"
    to.toISOString().slice(0, 16)
  );

  let sent = 0;
  let skipped = 0;

  for (const booking of bookings) {
    const subs = await database.getPushSubscriptionsByUserId(booking.user_id);

    if (subs.length === 0) {
      // User never opted in — mark so we don't re-check every hour
      await database.markReminderSent(booking.booking_id);
      skipped++;
      continue;
    }

    const formattedDate = new Date(`${booking.performance_date}T${booking.start_time}`)
      .toLocaleDateString(config.app.defaultCountry, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

    const { sent: pushSent } = await sendPushToUser(booking.user_id, {
      title: '🎭' + ' ' + booking.event_title + ' ' + i18n.t('is tomorrow'),
      body: booking.booking_ref + '—' + formattedDate,
      url: `/bookings/${booking.booking_ref}`, // TODO
      icon: '/icons/icon-192x192.png',
    });

    await database.markReminderSent(booking.booking_id);

    // Count as sent only if at least one push actually went through
    if (pushSent > 0) {
      sent++;
    } else {
      skipped++;
    }
  }
  //console.log(`[reminderJob] sent=${sent} skipped=${skipped}`);

  return { sent, skipped };
}
