import { Router } from "express";
import { v4 as uuidv4 } from 'uuid';
import { database } from '../db/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { Event, EventPerformance, EventStats } from '../shared/types/event';
import { getErrorMessage } from '../utils/errorHandler';

const router = Router();

// Public: Get all events with stats
router.get('/', async (req, res) => {
  try {
    const events = await database.getAllEvents();
    if (!events) {
      return res.json([]);
    }
    const stats: EventStats[] = await Promise.all(
      events.map(async (event) => {
        const theater = await database.getTheaterById(event.theaterId);
        const performances = await database.getPerformancesByEventId(event.id);
        const upcomingPerformances = performances ? performances.filter(p =>
          new Date(p.performanceDate) >= new Date() && p.status === 'scheduled'
        ) : [];

        // let totalSeats = 0;
        // if (theater) {
        //   theater.sections.forEach(section => {
        //     section.rows.forEach(row => {
        //       totalSeats += row.seats;
        //     });
        //   });
        // }

        return {
          id: event.id,
          title: event.title,
          theaterName: theater?.name || 'Unknown',
          genre: event.genre,
          openingDate: event.openingDate,
          closingDate: event.closingDate,
          baseTicketPrice: event.baseTicketPrice,
          currency: event.currency,
          nextPerformanceDate: upcomingPerformances[0]?.performanceDate,
          availablePerformances: upcomingPerformances.length,
          status: event.status
        };
      })
    );

    res.json(stats);
  } catch (error:any) { // TODO: error: req.t(...) everywhere...
    res.status(500).json({ error: req.t('Failed to fetch events: {{err}}', { err: getErrorMessage(error) })});
  }
});

// Public: Get event by ID with theater and performances
router.get('/:id', async (req, res) => {
  try {
    const event = await database.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const theater = await database.getTheaterById(event.theaterId);
    const performances = await database.getPerformancesByEventId(event.id);

    res.json({
      ...event,
      theater,
      performances
    });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to fetch event: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Protected: Create new event (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      title, description, genre, durationMinutes, intermissionCount, rating, language,
      director, playwright, producer, choreographer, musicalDirector, theaterId, stageType,
      openingDate, closingDate, baseTicketPrice, currency, specialRequirements, minimumAge,
      typicalStartTime, typicalEndTime, eventPosterUrl, trailerUrl, websiteUrl,
      socialMediaLinks, maxCapacity, contentWarnings
    } = req.body;

    if (!title || !theaterId || !baseTicketPrice) {
      return res.status(400).json({ error: req.t('Title, theater, and base ticket price are required') });
    }

    // Debug: Check if all foreign keys exist
    const theater = await database.getTheaterById(theaterId);
    if (!theater) {
      return res.status(404).json({ error: req.t('Theater with id {{theaterId}} not found', { theaterId }) });
    }

    const event: Event = {
      id: uuidv4(),
      title,
      description,
      genre,
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
      currency: currency || 'USD',
      isSoldOut: false,
      specialRequirements,
      minimumAge,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: req.userId,
      typicalStartTime,
      typicalEndTime,
      eventPosterUrl,
      trailerUrl,
      websiteUrl,
      socialMediaLinks,
      status: 'scheduled',
      maxCapacity,
      contentWarnings
    };

    await database.createEvent(event);
    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ error: req.t('Failed to create event: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Protected: Update event (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const event = await database.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: req.t('Event not found') });
    }

    await database.updateEvent(req.params.id, req.body);
    const updatedEvent = await database.getEventById(req.params.id);
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to update event: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Protected: Delete event (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const event = await database.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: req.t('Event not found') });
    }

    await database.deleteEvent(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: req.t('Failed to delete event: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Get performances for a event
router.get('/:id/performances', async (req, res) => {
  try {
    const performances = await database.getPerformancesByEventId(req.params.id);
    res.json(performances);
  } catch (error: any) {
    res.status(500).json({ error: req.t('Failed to fetch performances: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: Create performance (admin only)
router.post('/:id/performances', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { performanceDate, startTime, endTime } = req.body;
    const event = await database.getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: req.t('Event not found') });
    }

    const theater = await database.getTheaterById(event.theaterId);
    if (!theater) {
      return res.status(404).json({ error: req.t('Theater not found') });
    }

    // TODO: ...
    // Calculate total seats
    // let totalSeats = 0;
    // theater.sections.forEach(section => {
    //   section.rows.forEach(row => {
    //     totalSeats += row.seats;
    //   });
    // });

    // // Initialize seat data from theater
    // const seatData = JSON.stringify(theater.sections);
    let totalSeats = 0;
    const seatData = JSON.stringify([]);
    
    const performance: EventPerformance = {
      id: uuidv4(),
      eventId: req.params.id,
      performanceDate,
      startTime,
      endTime,
      availableSeats: totalSeats,
      bookedSeats: 0,
      seatData,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await database.createPerformance(performance);
    res.status(201).json(performance);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to create performance: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Get specific performance
router.get('/:eventId/performances/:performanceId', async (req, res) => {
  try {
    const performance = await database.getPerformanceById(req.params.performanceId);
    if (!performance) {
      return res.status(404).json({ error: req.t('Event performance not found') });
    }
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to fetch performance: {{err}}', {err: getErrorMessage(error)}) });
  }
});

// Protected: Book seats for a performance
router.post('/:eventId/performances/:performanceId/book', authenticateToken, async (req, res) => {
  try {
    const { seatIds } = req.body;
    const performance = await database.getPerformanceById(req.params.performanceId);

    if (!performance) {
      return res.status(404).json({ error: req.t('Event performance not found') });
    }

    const sections = JSON.parse(performance.seatData);
    let seatsBooked = 0;

    // Update seat statuses
    const updatedSections = sections.map((section: any) => ({
      ...section,
      rows: section.rows.map((row: any) => ({
        ...row,
        seatStatuses: row.seatStatuses?.map((seat: any) => {
          if (seatIds.includes(seat.id) && seat.status === 'available') {
            seatsBooked++;
            return { ...seat, status: 'booked' };
          }
          return seat;
        })
      }))
    }));

    await database.updatePerformance(req.params.performanceId, {
      seatData: JSON.stringify(updatedSections),
      bookedSeats: performance.bookedSeats + seatsBooked,
      availableSeats: performance.availableSeats - seatsBooked
    });

    res.json({ message: req.t('{{count}} seats booked successfully', { count: seatsBooked }) });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to book seats: {{err}}', {err: getErrorMessage(error)}) });
  }
});

export default router;
