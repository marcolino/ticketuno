import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../db/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { Show, ShowPerformance, ShowStats } from '../types/show';

const router = express.Router();

// Public: Get all shows with stats
router.get('/', async (req, res) => {
  try {
    const shows = await database.getAllShows();
    const stats: ShowStats[] = await Promise.all(
      shows.map(async (show) => {
        const theater = await database.getTheaterById(show.theaterId);
        const performances = await database.getPerformancesByShowId(show.id);
        
        const upcomingPerformances = performances.filter(p => 
          new Date(p.performanceDate) >= new Date() && p.status === 'scheduled'
        );

        let totalSeats = 0;
        if (theater) {
          theater.sections.forEach(section => {
            section.rows.forEach(row => {
              totalSeats += row.seats;
            });
          });
        }

        return {
          id: show.id,
          title: show.title,
          theaterName: theater?.name || 'Unknown',
          genre: show.genre,
          openingDate: show.openingDate,
          closingDate: show.closingDate,
          baseTicketPrice: show.baseTicketPrice,
          currency: show.currency,
          nextPerformanceDate: upcomingPerformances[0]?.performanceDate,
          availablePerformances: upcomingPerformances.length,
          status: show.status
        };
      })
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shows' });
  }
});

// Public: Get show by ID with theater and performances
router.get('/:id', async (req, res) => {
  try {
    const show = await database.getShowById(req.params.id);
    if (!show) {
      return res.status(404).json({ error: 'Show not found' });
    }

    const theater = await database.getTheaterById(show.theaterId);
    const performances = await database.getPerformancesByShowId(show.id);

    res.json({
      ...show,
      theater,
      performances
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch show' });
  }
});

// Protected: Create new show (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      title, description, genre, durationMinutes, intermissionCount, rating, language,
      director, playwright, producer, choreographer, musicalDirector, theaterId, stageType,
      openingDate, closingDate, baseTicketPrice, currency, specialRequirements, minimumAge,
      typicalStartTime, typicalEndTime, showPosterUrl, trailerUrl, websiteUrl,
      socialMediaLinks, maxCapacity, contentWarnings
    } = req.body;

    if (!title || !theaterId || !baseTicketPrice) {
      return res.status(400).json({ error: 'Title, theater, and base ticket price are required' });
    }

    const theater = await database.getTheaterById(theaterId);
    if (!theater) {
      return res.status(404).json({ error: 'Theater not found' });
    }

    const show: Show = {
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
      showPosterUrl,
      trailerUrl,
      websiteUrl,
      socialMediaLinks,
      status: 'scheduled',
      maxCapacity,
      contentWarnings
    };

    await database.createShow(show);
    res.status(201).json(show);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create show' });
  }
});

// Protected: Update show (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const show = await database.getShowById(req.params.id);
    if (!show) {
      return res.status(404).json({ error: 'Show not found' });
    }

    await database.updateShow(req.params.id, req.body);
    const updatedShow = await database.getShowById(req.params.id);
    res.json(updatedShow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update show' });
  }
});

// Protected: Delete show (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const show = await database.getShowById(req.params.id);
    if (!show) {
      return res.status(404).json({ error: 'Show not found' });
    }

    await database.deleteShow(req.params.id);
    res.json({ message: 'Show deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete show' });
  }
});

// Get performances for a show
router.get('/:id/performances', async (req, res) => {
  try {
    const performances = await database.getPerformancesByShowId(req.params.id);
    res.json(performances);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performances' });
  }
});

// Protected: Create performance (admin only)
router.post('/:id/performances', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { performanceDate, startTime, endTime } = req.body;
    const show = await database.getShowById(req.params.id);

    if (!show) {
      return res.status(404).json({ error: 'Show not found' });
    }

    const theater = await database.getTheaterById(show.theaterId);
    if (!theater) {
      return res.status(404).json({ error: 'Theater not found' });
    }

    // Calculate total seats
    let totalSeats = 0;
    theater.sections.forEach(section => {
      section.rows.forEach(row => {
        totalSeats += row.seats;
      });
    });

    // Initialize seat data from theater
    const seatData = JSON.stringify(theater.sections);

    const performance: ShowPerformance = {
      id: uuidv4(),
      showId: req.params.id,
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
    res.status(500).json({ error: 'Failed to create performance' });
  }
});

// Get specific performance
router.get('/:showId/performances/:performanceId', async (req, res) => {
  try {
    const performance = await database.getPerformanceById(req.params.performanceId);
    if (!performance) {
      return res.status(404).json({ error: 'Show performance not found' });
    }
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

// Protected: Book seats for a performance
router.post('/:showId/performances/:performanceId/book', authenticateToken, async (req, res) => {
  try {
    const { seatIds } = req.body;
    const performance = await database.getPerformanceById(req.params.performanceId);

    if (!performance) {
      return res.status(404).json({ error: 'Show performance not found' });
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

    res.json({ message: 'Seats booked successfully', seatsBooked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to book seats' });
  }
});

export default router;
