import { database } from '../db/database';
import { sendPushToUser } from '../services/pushService';
import { sendBookingRememberEmail } from '../utils/email';
import { humanizedDate } from '../utils/misc';
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

  let sent = 0;
  let skipped = 0;
  let language = config.app.defaultLanguage;
  let userId = null;
  let user = null;
  let t = i18n.getFixedT(language, 'common');

  for (const booking of bookings) {
    console.log("BOOKING:", booking);
    const subs = await database.getPushSubscriptionsByUserId(booking.user_id);
    console.log("SUBS:", subs);

    // get user's language, if not done yet, or if user is changed
    if (!user || !userId || userId !== booking.user_id) {
      userId = booking.user_id;
      user = await database.getUserById(userId);
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

    const date = humanizedDate(
      `${booking.performance_date}T${booking.start_time}`,
      config.app.defaultLanguage,
      config.app.defaultTimezone,
      t,
    );
    console.log("HUMANIZED DATE:", date);

    // Generate a short-lived token so an unauthenticated click still works
    const viewToken = await database.createToken(booking.user_id, 'booking.view');

    // TODO: group by user !!!
    const { sent: pushSent } = await sendPushToUser(subs, booking.user_id, {
      title: '🎭' + ' ' + booking.event_title + ' ' + t('is tomorrow'),
      //body: t('Booking references:') + ': ' + booking.booking_ref + '—' + formattedDate,
      body: t('Remember the event on {{date}}', { date: date }),
      //url: `/bookings/${booking.booking_ref}`, // TODO
      url: `${config.app.baseUrlFrontend}/bookings/my?token=${viewToken}`,
      icon: '/icons/icon-192x192.png',
    });
    console.log("PUSH SENT:", pushSent);

    await database.markReminderSent(booking.booking_id);

    // Send also an email to remember the event
    if (user) {
      const showInfo = {
        theater: theater.name ?? '',
        titleLine1: event.title ?? '',
        titleLine2: event.playwright ? req.t('By {{playwright}}', { playwright: event.playwright }) : '',
        subtitle: event.producer ? req.t('Produced by {{producer}}', { producer: event.producer }) : '',
        poster: event.posterImage ?
          path.join(config.uploads.path, event.posterImage) :
          path.join(__dirname, '..', config.assets.path, 'images', config.assets.defaultEventPosterImageName)
        ,
        date: formatFullDate(performance.performanceDate, user.language),
        dayOfWeek: formatWeekday(performance.performanceDate, user.language),
        time: performance.startTime,
        duration: (performance.endTime && performance.startTime) ?
          formatTimeDifference(performance.endTime, performance.startTime) :
          '--'
        ,
        theaterDescription: theater.description ?? '',
        address: theater.address ?? '',
        contactPhone: theater.contactPhone ?? '',
        contactEmail: theater.contactEmail ?? '',
        leadRole: event.cast?.length ? event.cast?.[0].role : req.t('Lead role'),
        lead: event.cast?.length ? event.cast?.[0].name : '--',
      };
      
      const email = user.email;
      const userName = `${user.firstName} ${user.lastName}`;
      const eventName = showInfo.titleLine1;
      //const bookingRef = booking.bookingRef;
      const dateOfPerformance = showInfo.date;
      const timeOfPerformance = showInfo.time;
      const theaterName = showInfo.theater;
      const theaterAddress = theater.address;
      const seatNumbers = booking.seats.map(seat => seatLabel(seat.seatId)).join(', ');
      const totalPaidAmount = event.currency ?
        formatMoney(event.baseTicketPrice, user.language ?? config.app.defaultLanguage, event.currency) :
        ''
      ;
      const contactPhone = showInfo.contactPhone;
      const contactEmail = showInfo.contactEmail;

      const bookingIsPaid = config.app.reservations.purchases.gateway !== 'free';
      const useQrcode = config.app.reservations.ticketing.useQrcode;
      
      await sendBookingRememberEmail(
        email,
        language,
        userName,
        eventName,
        dateOfPerformance,
        timeOfPerformance,
        theaterName,
        theaterAddress,
        seatNumbers,
        totalPaidAmount,
        contactPhone,
        contactEmail,
        //linkToTermsAndConditions,
        bookingIsPaid,
        useQrcode,
      );
    }

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
