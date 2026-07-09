import { Router, Request, Response } from 'express';
import path from 'path';
import { database } from '../db/database';
import { getSetup } from '../services/setupService';
import { requireAuthentication, requireOperator } from '../middleware/auth';
import { generateTickets } from '../services/ticketService';
import { notify } from '../services/notificationService';
import { sendBookingConfirmationEmail } from '../utils/email';
import { Event, EventPerformance, EventStats } from '@ticketuno/shared';
import { EventQueryOptions } from '@ticketuno/shared';
import { ShowInfo } from '@ticketuno/shared';
import { generateSeats, applyDisplayNumbers } from '@ticketuno/shared';
import { PerformanceSeatsResponse, SeatData} from '@ticketuno/shared';
import { getErrorMessage } from '@ticketuno/shared';
import { formatMoney, formatFullDate, formatWeekday, formatTimeDifference } from '@ticketuno/shared';
import config from '../config';


const router = Router();

// ========== EVENTS ==========

// Public: Get all events with stats
router.get('/', async (req, res) => {
  try {
    const options: EventQueryOptions = {
      pastToo: req.query.pastToo === 'true',
      canceledToo: req.query.canceledToo === 'true',
    };
    const events = await database.getAllEvents(options);
    if (!events) {
      return res.json([]);
    }
    const stats: EventStats[] = await Promise.all(
      events.map(async (event) => {
        const theater = await database.getTheaterById(event.theaterId);
        const performances = await database.getPerformancesByEventId(event.id);
        const upcomingPerformances = performances ? performances.filter(p =>
          new Date(p.performanceDate) >= new Date() && (event.status === 'in progress' || event.status === 'scheduled')
        ) : [];

        return {
          id: event.id,
          title: event.title,
          description: event.description || '',
          theaterName: theater?.name || req.t('Unknown'),
          genres: event.genres,
          openingDate: event.openingDate,
          closingDate: event.closingDate,
          baseTicketPrice: event.baseTicketPrice,
          currency: event.currency,
          nextPerformanceDate: upcomingPerformances[0]?.performanceDate,
          availablePerformances: upcomingPerformances.length,
          status: event.status!,
          posterImage: event.posterImage,
        };
      })
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to fetch events: {{err}}', { err: getErrorMessage(error) })});
  }
});

// Public: Get event by ID with theater and performances (with calculated seat counts)
router.get('/:id', async (req, res) => {
  try { 
    const event = await database.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const theater = await database.getTheaterById(event.theaterId);
    const performances = await database.getPerformancesByEventId(event.id);

    // Calculate seat counts for each performance from seats table
    const performancesWithCounts = await Promise.all(
      (performances || []).map(async (performance) => {
        const counts = await database.getSeatCountsByPerformanceId(performance.id!);
        return {
          ...performance,
          availableSeats: counts.available,
          bookedSeats: counts.booked
        };
      })
    );

    res.json({
      ...event,
      theater,
      performances: performancesWithCounts,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to fetch event: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Protected: Create new event (admin only)
router.post('/', requireAuthentication, requireOperator, async (req: Request, res: Response) => {
  try {
    const {
      title, description, genres, durationMinutes, intermissionCount, rating, language,
      director, playwright, producer, choreographer, musicalDirector, theaterId, stageType,
      openingDate, closingDate, baseTicketPrice, currency, specialRequirements, minimumAge,
      typicalStartTime, typicalEndTime, posterImage, trailerUrl, websiteUrl,
      socialMediaLinks, maxCapacity, contentWarnings, cast,
    } = req.body;

    // Check if title is set
    if (title == null) {
      return res.status(400).json({ error: req.t('Title is required') });
    }

    // Check if theater id is set
    if (theaterId == null) {
      return res.status(400).json({ error: req.t('Theater is required') });
    }

    // Check if base ticket price is set
    if (baseTicketPrice == null) {
      return res.status(400).json({ error: req.t('Base ticket price is required') });
    }

    // Check if all foreign keys exist
    const theater = await database.getTheaterById(theaterId);
    if (!theater) {
      return res.status(404).json({ error: req.t('Theater with id {{theaterId}} not found', { theaterId }) });
    }

    const event: Event = {
      id: '',
      title,
      description,
      genres,
      durationMinutes,
      intermissionCount: intermissionCount || 1,
      rating,
      language,
      director,
      playwright,
      producer,
      choreographer,
      musicalDirector,
      theaterId,
      stageType,
      openingDate,
      closingDate,
      isActive: true,
      baseTicketPrice,
      currency: currency || config.app.defaultCurrency,
      isSoldOut: false,
      specialRequirements,
      minimumAge,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: req.userId,
      typicalStartTime,
      typicalEndTime,
      posterImage,
      trailerUrl,
      websiteUrl,
      socialMediaLinks,
      status: 'scheduled',
      canceled: 0,
      cast,
      maxCapacity,
      contentWarnings
    };

    const eventId = await database.createEvent(event);
    res.status(201).json({ id: eventId });
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to create event: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Protected: Update event (admin only)
router.put('/:id', requireAuthentication, requireOperator, async (req, res) => {
  try {
    // Check if title is set and not null
    if (req.body.title !== undefined && (req.body.title === '' || req.body.title === null)) {
      return res.status(400).json({ error: req.t('Title cannot be empty') });
    }

    // Check if theater id is set and not null
    if (req.body.theaterId !== undefined && (req.body.theaterId === '' || req.body.theaterId === null)) {
      return res.status(400).json({ error: req.t('A theater must be selected') });
    }

    const event = await database.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: req.t('Event not found') });
    }
    const response = await database.updateEvent(req.params.id, req.body);
    res.json(response);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update event: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Protected: Delete event (operator only)
router.delete('/:id', requireAuthentication, requireOperator, async (req, res) => {
  try {
    const result = await database.deleteEvent(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

router.get('/:id/guard', requireAuthentication, requireOperator, async (req, res) => {
  try {
    const guard = await database.guardEvent(req.params.id);
    res.json({ safe: guard.safe, blockedBy: guard.bookings });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// ========== PERFORMANCES (nested under events) ==========

// No-store for all performance sub-routes - seat availability and booking
// state change continuously and must never be served from any cache layer.
router.use('/:id/performances/:performanceId', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Get performances for an event
router.get('/:id/performances', async (req, res) => {
  try {
    const performances = await database.getPerformancesByEventId(req.params.id);

    // Calculate seat counts from seats table
    const performancesWithCounts = await Promise.all(
      (performances || []).map(async (performance) => {
        const counts = await database.getSeatCountsByPerformanceId(performance.id!);
        return {
          ...performance,
          availableSeats: counts.available,
          bookedSeats: counts.booked
        };
      })
    );

    //res.json(performances);
    res.json(performancesWithCounts);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to fetch performances: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Get specific performance for an event
router.get('/:eventId/performances/:performanceId', async (req, res) => {
  try {
    const performance = await database.getPerformanceById(req.params.performanceId);
    if (!performance) {
      return res.status(404).json({ error: req.t('Event performance not found') });
    }
    if (performance.eventId !== req.params.eventId) {
      return res.status(400).json({ error: req.t('Performance does not belong to this event') });
    }
    
    // Calculate seat counts
    const counts = await database.getSeatCountsByPerformanceId(performance.id!);
    
    res.json({
      ...performance,
      availableSeats: counts.available,
      bookedSeats: counts.booked
    });
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to fetch performance: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Protected: Create performance for an event (admin only)
router.post('/:eventId/performances', requireAuthentication, requireOperator, async (req: Request, res: Response) => {
  try {
    const { performanceDate, startTime, endTime } = req.body;
    const eventId = req.params.eventId;

    // Check the event exists
    const event = await database.getEventById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: req.t('Event not found') });
    }

    // Get theater
    const theater = await database.getTheaterById(event.theaterId);
    if (!theater) {
      return res.status(404).json({ error: req.t('Theater not found') });
    }

    if (!theater.currentLayoutId) {
      return res.status(400).json({ error: req.t('Theater has no current layout assigned') });
    }

    // Get theater layout
    const layout = await database.getLayoutById(theater.currentLayoutId);
    if (!layout) {
      return res.status(404).json({ error: req.t('Layout not found') });
    }

    // Generate seats from layout
    const layoutJSON = JSON.parse(layout.json);
    const generatedSeats = generateSeats(layoutJSON);
    
    // Create performance (no seat counts stored)
    const performance: EventPerformance = {
      id: '',
      eventId,
      performanceDate,
      startTime,
      endTime,
    };

    const performanceId = await database.createPerformance(performance);

    // Insert seat records for this performance
    await database.bulkCreateSeats(
      performanceId,
      generatedSeats,
    );

    // Get calculated seat counts for this performance
    const counts = await database.getSeatCountsByPerformanceId(performanceId);

    res.status(201).json({ 
      ...performance, 
      id: performanceId,
      availableSeats: counts.available,
      bookedSeats: counts.booked
    });
  } catch (error: unknown) {
    const response: { error: { message: string; details?: unknown } } = {
      error: { message: getErrorMessage(error) }
    };
    if (error && typeof error === 'object' && 'details' in error) {
      response.error.details = (error as { details: unknown }).details;
    }
    res.status(400).json(response);
  }
});

// Protected: Update performance (admin only)
router.put('/:eventId/performances/:performanceId', requireAuthentication, requireOperator, async (req, res) => {
  try {
    const { eventId, performanceId } = req.params;
    const performance = await database.getPerformanceById(performanceId);

    if (!performance) {
      return res.status(404).json({ error: req.t('Performance not found') });
    }
    
    if (performance.eventId !== eventId) {
      return res.status(400).json({ error: req.t('Performance does not belong to this event') });
    }

    // Prevent changes if seats are already booked
    const hasBookings = await database.performanceHasBookings(performanceId);
    if (hasBookings) {
      return res.status(400).json({ 
        error: req.t('Cannot modify performance with existing bookings') 
      });
    }

    await database.updatePerformance(req.params.performanceId, req.body);
    const updatedPerformance = await database.getPerformanceById(performanceId);

    // Get calculated seats counts
    const counts = await database.getSeatCountsByPerformanceId(performanceId);

    res.json({
      ...updatedPerformance,
      availableSeats: counts.available,
      bookedSeats: counts.booked
    });
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update event: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Delete specific performance for an event
router.delete('/:eventId/performances/:performanceId', async (req, res) => {
  try {
    const { eventId, performanceId } = req.params;
    const performance = await database.getPerformanceById(performanceId);

    if (!performance) {
      return res.status(404).json({ error: req.t('Event performance not found') });
    }

    if (performance.eventId !== eventId) {
      return res.status(400).json({ error: req.t('Performance does not belong to this event') });
    }
    
    // Prevent deletion if seats are already booked
    const hasBookings = await database.performanceHasBookings(performanceId);
    if (hasBookings) {
      return res.status(400).json({ 
        error: req.t('Cannot delete performance with existing bookings') 
      });
    }

    // Delete seats first (foreign key constraint)
    await database.deleteSeatsForPerformance(performanceId);
    
    // Delete performance
    await database.deletePerformanceById(performanceId);

    res.json({ message: 'Performance deleted successfully' });
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to delete performance: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// ========== BOOKING (user endpoint) ==========

// Get seats for a performance (for booking UI)
router.get('/:eventId/performances/:performanceId/seats', async (req, res) => {
  try {
    const { performanceId } = req.params;
    
    const performance = await database.getPerformanceById(performanceId);
    if (!performance) {
      return res.status(404).json({ error: req.t('Performance not found') });
    }

    const seats = await database.getSeatsByPerformanceIdGroupedBySection(performanceId);
    
    res.json(seats);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to fetch seats: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Get seats for a specific section
router.get('/:eventId/performances/:performanceId/seats/:sectionName', async (req, res) => {
  try {
    const { performanceId, sectionName } = req.params;
    
    const seats = await database.getSeatsBySection(performanceId, sectionName);
    
    res.json(seats);
  } catch (error: unknown) {
    res.status(500).json({ 
      error: req.t('Failed to fetch seats: {{err}}', { err: getErrorMessage(error) }) 
    });
  }
});

// @deprecated
// Protected: Book seats for a performance
router.post('/:eventId/performances/:performanceId/book_', requireAuthentication, async (req: Request, res: Response) => {
  const setup = getSetup();
  try {
    const { seatIds } = req.body;
    const { eventId, performanceId } = req.params;
    const userId = req.userId;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ error: req.t('Seat IDs required') });
    }

    const user = await database.getUserById(userId!);
    if (!user) {
      return res.status(401).json({ error: req.t('User not found') });
    }

    const performance = await database.getPerformanceById(performanceId);
    if (!performance) {
      return res.status(404).json({ error: req.t('Performance not found') });
    }
    if (performance.eventId !== eventId) {
      return res.status(400).json({ error: req.t('Performance does not belong to this event') });
    }

    const event = await database.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: req.t('Event not found') });
    }
    if (event.status !== 'scheduled' && event.status !== 'in progress') {
      return res.status(400).json({
        error: req.t('Performance is not available for booking ({{status}}', { status: event.status }),
        details: req.t('Performance status is {{status}}', { status: event.status }),
      });
    }

    // Atomic booking transaction
    const booking = await database.bookSeats(performanceId, seatIds, userId!);
    if (!booking.success) {
      return res.status(409).json({
        error: req.t('Some seats are no longer available'),
        unavailableSeats: booking.unavailableSeats,
      });
    }

    if (booking.seats.length === 0) {
      return res.status(400).json({ 
        error: req.t('No seat!'),
      });
    }

    const performanceSeats = await database.getSeatsByPerformanceIdGroupedBySection(performanceId);
    if (!performanceSeats) {
      return res.status(404).json({ error: req.t('Performance seats not found') });
    }

    const theater = await database.getTheaterById(event.theaterId);
    if (!theater) {
      return res.status(404).json({ error: req.t('Theater not found') });
    }

    // Build display-number label map so emails/tickets show correct numbers, skipping 'absent' seats (absent is not anymore used)
    const seatLabelMap = new Map<string, string>();
    if (theater.currentLayoutId) {
      const layoutRecord = await database.getLayoutById(theater.currentLayoutId);
      if (layoutRecord) {
        const layoutJSON = JSON.parse(layoutRecord.json);
        const withDisplay = applyDisplayNumbers(generateSeats(layoutJSON)/*, conditions*/);
        withDisplay.forEach(s => {
          const dn = s.displayNumber ?? s.seatNumber;
          seatLabelMap.set(s.seatId, `${s.sectionName}-${s.rowId}-${dn}`);
        });
      }
    }
    const seatLabel = (seatId: string) => seatLabelMap.get(seatId) ?? seatId;

    const bookingRefs = booking.seats.map(s => s.bookingRef);
    const bookingIsPaid = setup.payments.gateway !== 'free';
    const useQrcode = true; // TODO: setup.ticketing.useQrcode
    let pdfs: Buffer[];
    let showInfo: ShowInfo;

    // Respond immediately
    res.json({
      message: req.t('{{count}} seats booked successfully'),
      bookingRefs,
      bookedSeats: booking.bookedCount,
      unavailableSeats: booking.unavailableSeats,
    });

    // After response is sent, fire-and-forget: PDF generation + email send
    setImmediate(async () => {
      try {
        showInfo = {
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

        //const setup = getSetup();

        const seatsInfo = booking.seats.map(({ seatId, bookingRef }) => {
          const seatInfo = findSeatById(seatId, performanceSeats);
          return {
            bookingRef, // Unique reference per seat
            seatId: seatId,
            seat: seatLabel(seatId), 
            row: seatInfo!.rowId,
            tier: seatInfo!.sectionName,
            gate: '',
            price: event.currency
              ? formatMoney(event.baseTicketPrice, user.language, event.currency)
              : req.t(''),
            holderName: config.app.reservations.ticketing.nominal ? '--' : req.t('The seats are not nominal'),
          };
        });

        // Generate one PDF ticket per seat (in attachedTickets array)
        pdfs = await generateTickets({
          show: showInfo,
          seats: seatsInfo,
          nominal: config.app.reservations.ticketing.nominal,
          bookingIsPaid,
          useQrcode,
          language: req.language,
        });
      } catch (error) {
        console.error('Email send failed:', error);
        await notify(`
          🚨 Booking ticket generation failed for refs: ${bookingRefs.join(', ')}\n\
          Error: ${getErrorMessage(error)}
        `);
        return false; // avoid sending email if ticket generation is failed
      }

      try {
        // Send email to user with attached tickets
        const email = user.email;
        const language = user.language || config.app.defaultLanguage;
        const userName = `${user.firstName} ${user.lastName}`;
        const eventName = showInfo.titleLine1;
        const dateOfPerformance = showInfo.date;
        const timeOfPerformance = showInfo.time;
        const theaterName = showInfo.theater;
        const seatNumbers = booking.seats.map(seat => seatLabel(seat.seatId)).join(', ');
        const totalPaidAmount = event.currency ?
          formatMoney(event.baseTicketPrice, user.language ?? config.app.defaultLanguage, event.currency) :
          ''
          ;
        const contactPhone = showInfo.contactPhone;
        const contactEmail = showInfo.contactEmail;

        const attachedTickets = pdfs.map((buf: Buffer, i: number) => ({
          filename: `ticket-${booking.seats[i].bookingRef}.pdf`, // Unique name per seat
          //contentType: 'application/pdf',
          content: buf,
        }));

        const bookingRefs = booking.seats.map(s => s.bookingRef).join(', ');

        await sendBookingConfirmationEmail(
          email,
          language,
          userName,
          eventName,
          bookingRefs,
          dateOfPerformance,
          timeOfPerformance,
          theaterName,
          seatNumbers,
          totalPaidAmount,
          contactPhone,
          contactEmail,
          //linkToTermsAndConditions,
          bookingIsPaid,
          useQrcode,
          attachedTickets,
        );

        await notify(`
          ✅ Booking completed for refs: ${bookingRefs}
        `);

        return true;
      } catch (error) {
        console.error('Email send failed:', error);
        await notify(`
          🚨 Booking email send failed for refs: ${bookingRefs}: ${getErrorMessage(error)}
        `);
        return false;
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to book seats: {{err}}', {err: getErrorMessage(error)}) });
  }
});

export const findSeatById = (
  seatId: string,
  performanceSeats: PerformanceSeatsResponse
): SeatData | null => {
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
};

export default router;
