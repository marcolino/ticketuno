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

  console.log("FROM:", from);
  console.log("TO:", to);

  // Performances store date + time as separate TEXT columns, e.g. "2025-06-10" + "20:30"
  // We query by reconstructed ISO string: "2025-06-10T20:30"
  const bookings = await database.getBookingsForReminder(
    from.toISOString().slice(0, 16), // "YYYY-MM-DDTHH:MM"
    to.toISOString().slice(0, 16)
  );

  console.log("BOOKINGS:", bookings);

  let sent = 0;
  let skipped = 0;
  let language = config.app.defaultLanguage;
  let user_id = null;
  let t = i18n.getFixedT(language, 'common');

  for (const booking of bookings) {
    console.log("BOOKING:", booking);
    const subs = await database.getPushSubscriptionsByUserId(booking.user_id);
    console.log("SUBS:", subs);

    // get user's language, if not done yet, or if user is changed
    if (!user_id || user_id !== booking.user_id) {
      user_id = booking.user_id;
      const user = await database.getUserByEmail(user_id);
      language = user?.language || config.app.defaultLanguage
      language = language.toLowerCase().split('-')[0];
      console.log("USER'S LANGUAGE:", language);
      t = i18n.getFixedT(language, 'common');
    }

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

    console.log("FORMATTED DATE:", formattedDate);

    // TODO: group by user !!!
    const { sent: pushSent } = await sendPushToUser(subs, booking.user_id, {
      title: '🎭' + ' ' + booking.event_title + ' ' + t('is tomorrow'),
      body: t('Booking references:') + ': ' + booking.booking_ref + '—' + formattedDate,
      url: `/bookings/${booking.booking_ref}`, // TODO
      icon: '/icons/icon-192x192.png',
    });
    console.log("PUSH SENT:", pushSent);

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
