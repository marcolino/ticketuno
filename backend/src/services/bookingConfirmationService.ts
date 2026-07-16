import path from 'path';
import { database } from '../db/database';
import {
  ShowInfo,
  formatMoney,
  formatFullDate,
  formatWeekday,
  formatTimeDifference,
  applyDisplayNumbers,
  generateSeats,
} from '@ticketuno/shared';
import { generateTickets } from './ticketService';
import { sendBookingConfirmationEmail } from '../utils/email';
import { PerformanceSeatsResponse, SeatData} from '@ticketuno/shared';
import { i18n } from '../i18n';
import config from '../config';

class BookingConfirmationService {
  /**
   * Builds and sends ONE confirmation email (one PDF ticket per seat attached)
   * for a group of per-seat bookings that share the same checkout session.
   * Mirrors the ticket-generation logic from the deprecated /book_ route.
   */
  async sendBookingConfirmationForGroup(
    bookings: Awaited<ReturnType<typeof database.getBookingById>>[],
    sessionId: string,
  ): Promise<void> {
    const first = bookings[0]!;
    const user = await database.getUserById(first.userId);
    if (!user) {
      console.warn(`⚠️ User not found for booking confirmation email (session ${sessionId})`);
      return;
    }

    const performance = await database.getPerformanceById(first.performanceId);
    if (!performance) {
      console.warn(`⚠️ Performance not found for booking confirmation email (session ${sessionId})`);
      return;
    }
    const event = await database.getEventById(performance.eventId);
    if (!event) {
      console.warn(`⚠️ Event not found for booking confirmation email (session ${sessionId})`);
      return;
    }
    const theater = await database.getTheaterById(event.theaterId);

    const performanceSeats = await database.getSeatsByPerformanceIdGroupedBySection(first.performanceId);

    // Seat display-label map (Section-Row-DisplayNumber), same as reminderJob/old route
    const seatLabelMap = new Map<string, string>();
    if (theater?.currentLayoutId) {
      const layoutRecord = await database.getLayoutById(theater.currentLayoutId);
      if (layoutRecord) {
        const layoutJSON = JSON.parse(layoutRecord.json);
        applyDisplayNumbers(generateSeats(layoutJSON)).forEach(s => {
          const dn = s.displayNumber ?? s.seatNumber;
          seatLabelMap.set(s.seatId, `${s.sectionName}-${s.rowId}-${dn}`);
        });
      }
    }
    const seatLabel = (seatId: string) => seatLabelMap.get(seatId) ?? seatId;

    const language = user.language || config.app.defaultLanguage;
    const t = i18n.getFixedT(language.toLowerCase().split('-')[0], 'common');

    const showInfo: ShowInfo = {
      theater: theater?.name ?? '',
      titleLine1: event.title ?? '',
      titleLine2: event.playwright ? t('By {{playwright}}', { playwright: event.playwright }) : '',
      subtitle: event.producer ? t('Produced by {{producer}}', { producer: event.producer }) : '',
      poster: event.posterImage
        ? path.join(config.uploads.path, event.posterImage)
        : path.join(__dirname, '..', config.assets.path, 'images', config.assets.defaultEventPosterImageName),
      date: formatFullDate(performance.performanceDate, user.language),
      dayOfWeek: formatWeekday(performance.performanceDate, user.language),
      time: performance.startTime,
      duration: (performance.endTime && performance.startTime)
        ? formatTimeDifference(performance.endTime, performance.startTime)
        : '--',
      theaterDescription: theater?.description ?? '',
      address: theater?.address ?? '',
      contactPhone: theater?.contactPhone ?? '',
      contactEmail: theater?.contactEmail ?? '',
      leadRole: event.cast?.length ? event.cast[0].role : t('Lead role'),
      lead: event.cast?.length ? event.cast[0].name : '--',
    };

    // One seatsInfo entry per BOOKING ROW (each row = 1 seat, per bookSeatsWithPaymentMethod)
    const seatsInfo = bookings.map(b => {
      const seatId = b!.seatIds[0];
      const seatInfo = this.findSeatById(seatId, performanceSeats);
      return {
        bookingRef: b!.bookingRef,
        seatId,
        seat: seatLabel(seatId),
        row: seatInfo?.rowId ?? '',
        tier: seatInfo?.sectionName ?? '',
        gate: '',
        price: event.currency
          ? formatMoney(b!.totalPrice, user.language, event.currency)
          : '',
        holderName: config.app.reservations.ticketing.nominal ? '--' : t('The seats are not nominal'),
      };
    });

    const pdfs = await generateTickets({
      show: showInfo,
      seats: seatsInfo,
      nominal: config.app.reservations.ticketing.nominal,
      bookingIsPaid: true, // Stripe path only reaches here once payment succeeded
      useQrcode: config.app.reservations.ticketing.useQrcode,
      language,
    });

    const attachedTickets = pdfs.map((buf: Buffer, i: number) => ({
      filename: `ticket-${bookings[i]!.bookingRef}.pdf`,
      content: buf,
    }));

    const bookingRefs = bookings.map(b => b!.bookingRef).join(', ');
    const seatNumbers = bookings
      .map(b => seatLabel(b!.seatIds[0]))
      .join(', ');
    const totalPaidAmount = event.currency
      ? formatMoney(
        bookings.reduce((sum, b) => sum + b!.totalPrice, 0),
        user.language ?? config.app.defaultLanguage,
        event.currency,
      )
      : '';

    await sendBookingConfirmationEmail(
      user.email,
      language,
      `${user.firstName} ${user.lastName}`,
      showInfo.titleLine1,
      bookingRefs,
      showInfo.date,
      showInfo.time,
      showInfo.theater,
      seatNumbers,
      totalPaidAmount,
      showInfo.contactPhone,
      showInfo.contactEmail,
      true,
      config.app.reservations.ticketing.useQrcode,
      attachedTickets,
    );

    console.log(`✅ Confirmation email sent for checkout ${sessionId} (${bookings.length} seat(s))`);
  }

  private findSeatById(seatId: string, performanceSeats: PerformanceSeatsResponse): SeatData | null {
    // Loop over sections with keys
    for (const section of Object.values<PerformanceSeatsResponse[string]>(performanceSeats)) {
      // section is typed as { [row: string]: SeatData[] }
      for (const row of Object.values<SeatData[]>(section)) {
        const found = row.find((seat: SeatData) => seat.seatId === seatId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
}

export const bookingConfirmationService = new BookingConfirmationService();