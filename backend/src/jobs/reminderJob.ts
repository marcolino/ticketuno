import path from 'path';
import { database } from '../db/database';
import { sendPushToUser } from '../services/pushService';
import { sendBookingRememberEmail } from '../utils/email';
import { humanizedDate } from '../utils/misc';
import { applyDisplayNumbers, generateSeats } from '../shared/utils/layoutToSeats';
import type { ShowInfo } from '../shared/types/ticket';
import { formatMoney, formatFullDate, formatWeekday, formatTimeDifference } from '../shared/utils/misc';
import { i18n } from '../i18n';
import config from '../config';

export async function runReminderJob(): Promise<{ sent: number; skipped: number }> {
  const now = new Date();

  // const from = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h from now
  // const to = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25h from now
  // TODO !!!!!!!!!!!!!!!!!!!!
  const from = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1h from now
  const to = new Date(now.getTime() + 9999 * 60 * 60 * 1000); // 1Y from now

  const bookings = await database.getBookingsForReminder(
    from.toISOString().slice(0, 16), // "YYYY-MM-DDTHH:MM"
    to.toISOString().slice(0, 16),
  );

  // ── Group by (user_id, performance_id) ────────────────────────────────────
  // Each group = one push + one email, listing all seats for that user+show.
  type BookingRow = (typeof bookings)[number];
  const groups = new Map<string, BookingRow[]>();

  for (const booking of bookings) {
    const key = `${booking.user_id}::${booking.performance_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(booking);
  }

  let sent = 0;
  let skipped = 0;

  // Simple per-job user cache — avoids redundant DB calls when the same user
  // has bookings for multiple performances in the same job run.
  const userCache = new Map<string, Awaited<ReturnType<typeof database.getUserById>>>();

  for (const [, groupBookings] of groups) {
    const first = groupBookings[0]; // all rows in the group share user_id, performance_id, event_id
    const { user_id, performance_id, event_id } = first;
    const bookingIds = groupBookings.map(b => b.booking_id);

    // ── Fetch user (cached) ──────────────────────────────────────────────────
    const user = userCache.get(user_id) ?? await database.getUserById(user_id);
    if (user) userCache.set(user_id, user);

    const language = (user?.language ?? config.app.defaultLanguage).toLowerCase().split('-')[0];
    const t = i18n.getFixedT(language, 'common');

    // ── No push subscriptions → mark skipped and move on ────────────────────
    const subs = await database.getPushSubscriptionsByUserId(user_id);
    if (subs.length === 0) {
      for (const id of bookingIds) await database.markReminderSent(id);
      skipped++;
      continue;
    }

    // ── Fetch event, theater, performance ────────────────────────────────────
    const event = await database.getEventById(event_id);
    if (!event) {
      console.warn(`[reminderJob] Event ${event_id} not found — skipping group`);
      skipped++;
      continue;
    }

    const theater = await database.getTheaterById(event.theaterId);
    if (!theater) {
      console.warn(`[reminderJob] Theater for event ${event_id} not found — skipping group`);
      skipped++;
      continue;
    }

    const performance = await database.getPerformanceById(performance_id);
    if (!performance) {
      console.warn(`[reminderJob] Performance ${performance_id} not found — skipping group`);
      skipped++;
      continue;
    }

    // ── Build seat label map (same logic as booking controller) ──────────────
    const seatLabelMap = new Map<string, string>();
    if (theater.currentLayoutId) {
      const layoutRecord = await database.getLayoutById(theater.currentLayoutId);
      if (layoutRecord) {
        const layoutJSON = JSON.parse(layoutRecord.json);
        applyDisplayNumbers(generateSeats(layoutJSON)).forEach(s => {
          seatLabelMap.set(s.seatId, `${s.sectionName}-${s.rowId}-${s.displayNumber ?? s.seatNumber}`);
        });
      }
    }
    const seatLabel = (seatId: string) => seatLabelMap.get(seatId) ?? seatId;

    // ── Seat list for this group ──────────────────────────────────────────────
    // const seatNumbers = groupBookings.map(b => seatLabel(b.seat_id)).join(', ');
    // const bookingRefs = groupBookings.map(b => b.booking_ref).join(', ');
    // const ticketCount = groupBookings.length;

    const seatNumbers = groupBookings
      .flatMap(b => (JSON.parse(b.seat_ids) as string[]).map(seatLabel))
      .join(', ')
    ;
    const ticketCount = groupBookings.reduce(
      (sum, b) => sum + (JSON.parse(b.seat_ids) as string[]).length, 0
    );
    const bookingRefs = groupBookings.map(b => b.booking_ref).join(', ');

    // ── Humanized date (for push body) ───────────────────────────────────────
    const humanDate = humanizedDate(
      `${first.performance_date}T${first.start_time}`,
      config.app.defaultLanguage,
      config.app.defaultTimezone,
      t,
    );

    // ── Short-lived view token so an unauthenticated tap still works ─────────
    const viewToken = await database.createToken(user_id, 'booking.view');

    // ── ONE push notification per group ──────────────────────────────────────
    const { sent: pushSent } = await sendPushToUser(subs, user_id, {
      title: `🎭 ${first.event_title} — ${t('is tomorrow')}`,
      body: t('Remember the event on {{date}}', { date: humanDate }),
      url: `${config.app.baseUrlFrontend}/bookings/my?token=${viewToken}`,
      icon: '/icons/icon-192x192.png',
    });

    // ── ONE reminder email per group ─────────────────────────────────────────
    if (user) {
      const showInfo: ShowInfo = {
        theater: theater.name ?? '',
        titleLine1: event.title ?? '',
        titleLine2: event.playwright  ? t('By {{playwright}}', { playwright: event.playwright }) : '',
        subtitle: event.producer   ? t('Produced by {{producer}}', { producer: event.producer }) : '',
        poster: event.posterImage
          ? path.join(config.uploads.path, event.posterImage)
          : path.join(__dirname, '..', config.assets.path, 'images', config.assets.defaultEventPosterImageName),
        date: formatFullDate(performance.performanceDate, user.language),
        dayOfWeek: formatWeekday(performance.performanceDate,  user.language),
        time: performance.startTime,
        duration: (performance.endTime && performance.startTime)
          ? formatTimeDifference(performance.endTime, performance.startTime)
          : '--',
        theaterDescription: theater.description  ?? '',
        address: theater.address ?? '',
        contactPhone: theater.contactPhone ?? '',
        contactEmail: theater.contactEmail ?? '',
        leadRole: event.cast?.length ? event.cast[0].role : t('Lead role'),
        lead: event.cast?.length ? event.cast[0].name : '--',
      };

      try {
        await sendBookingRememberEmail(
          user.email,
          language,
          `${user.firstName} ${user.lastName}`,
          showInfo.titleLine1,
          bookingRefs, // all refs for this group
          showInfo.date,
          showInfo.time,
          showInfo.theater,
          theater.address ?? '',
          seatNumbers, // all seats for this group
          ticketCount, // number of tickets — add to sendBookingRememberEmail if not there yet
          event.currency
            ? formatMoney(event.baseTicketPrice, user.language ?? config.app.defaultLanguage, event.currency)
            : '',
          showInfo.contactPhone,
          showInfo.contactEmail,
          config.app.reservations.purchases.gateway !== 'free',
          config.app.reservations.ticketing.useQrcode,
        );
      } catch (error) {
        console.error(`[reminderJob] Reminder email failed for user ${user_id}:`, error);
        // Non-fatal: push was already sent; still mark as reminded below.
      }
    }

    // ── Mark every booking in the group as reminded ───────────────────────────
    for (const id of bookingIds) await database.markReminderSent(id);

    if (pushSent > 0) {
      sent++;
    } else {
      skipped++;
    }
  }

  return { sent, skipped };
}
