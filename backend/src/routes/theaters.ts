import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../db/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { Theater, TheaterStats, Section } from '../types/theater';

const router = express.Router();

// Public: Get all theaters with stats
router.get('/', async (req, res) => {
  try {
    const theaters = await database.getAllTheaters();
    const stats: TheaterStats[] = theaters.map(theater => {
      let totalSeats = 0;
      let freeSeats = 0;

      theater.sections.forEach(section => {
        section.rows.forEach(row => {
          totalSeats += row.seats;
          if (row.seatStatuses) {
            freeSeats += row.seatStatuses.filter(s => s.status === 'available').length;
          } else {
            freeSeats += row.seats;
          }
        });
      });

      return {
        id: theater.id,
        name: theater.name,
        totalSeats,
        freeSeats
      };
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch theaters' });
  }
});

// Public: Get theater by ID
router.get('/:id', async (req, res) => {
  try {
    const theaterId = req.params.id;
    const theater = await database.getTheaterById(theaterId);
    if (!theater) {
      return res.status(404).json({ error: 'Theater not found' });
    }
    res.json(theater);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch theater' });
  }
});

// Protected, Admin: Create new theater
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, sections } = req.body;

    if (!name || !sections) {
      return res.status(400).json({ error: 'Name and sections are required' });
    }

    const theater: Theater = {
      id: uuidv4(),
      name,
      description,
      sections: sections.map((section: Section) => ({
        ...section,
        rows: section.rows.map(row => ({
          ...row,
          seatStatuses: Array.from({ length: row.seats }, (_, i) => ({
            id: `${row.id}-${row.startNumber + i}`,
            number: row.startNumber + i,
            status: 'available' as const
          }))
        }))
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await database.createTheater(theater);
    res.status(201).json(theater);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create theater' });
  }
});

// // Protected: Update theater reservations
// router.put('/:id/reservations', authenticateToken, async (req, res) => {
//   try {
//     const theaterId = req.params.id;
//     const { sections } = req.body;
//     const theater = await database.getTheaterById(theaterId);

//     if (!theater) {
//       return res.status(404).json({ error: 'Theater not found' });
//     }

//     await database.updateTheater(req.params.id, sections);
//     res.json({ message: 'Reservations updated successfully' });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update reservations' });
//   }
// });

// Protected: Book seats
router.post('/:id/book', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const theaterId = req.params.id;
    const { seatIds } = req.body;
    const theater = await database.getTheaterById(theaterId);

    if (!theater) {
      return res.status(404).json({ error: 'Theater not found' });
    }

    // // Update seat statuses
    // const updatedSections = theater.sections.map(section => ({
    //   ...section,
    //   rows: section.rows.map(row => ({
    //     ...row,
    //     seatStatuses: row.seatStatuses?.map(seat => ({
    //       ...seat,
    //       status: seatIds.includes(seat.id) ? 'booked' as const : seat.status
    //     }))
    //   }))
    // }));

    let canBookAll = true;
    const failedSeats: string[] = [];

    // Create updated sections while checking
    const updatedSections = theater.sections.map(section => ({
      ...section,
      rows: section.rows.map(row => ({
        ...row,
        seatStatuses: row.seatStatuses?.map(seat => {
          if (seatIds.includes(seat.id)) {
            // Check before deciding new status
            if (seat.status === 'booked') {
              canBookAll = false;
              failedSeats.push(seat.id);
              return seat; // Return unchanged seat
            }
            return { ...seat, status: 'booked' as const };
          }
          return seat;
        })
      }))
    }));

    if (!canBookAll) {
      return res.status(409).json({ 
        error: 'Some seats already booked', 
        seats: failedSeats 
      });
    }

    await database.updateTheater(theaterId, updatedSections);
    res.json({ message: 'Seats booked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to book seats' });
  }
});

// Protected, Admin: Update theater
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const theaterId = req.params.id;
    const { name, description, sections } = req.body;
    const theater = await database.getTheaterById(theaterId);

    if (!theater) {
      return res.status(404).json({ error: 'Theater not found' });
    }

    // Update theater details
    const updatedTheater = {
      ...theater,
      name: name || theater.name,
      description: description !== undefined ? description : theater.description,
      sections: sections || theater.sections,
      updatedAt: new Date().toISOString()
    };

    // Save back to database - we need a new method
    await database.updateTheaterFull(theaterId, updatedTheater);
    res.json(updatedTheater);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update theater' });
  }
});

// // Auth endpoint for admin
// router.post('/auth/login', (req, res) => {
//   const { password } = req.body;
//   const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

//   if (password === adminPassword) {
//     const token = generateToken('admin', 'admin');
//     res.json({ token });
//   } else {
//     res.status(401).json({ error: 'Invalid password' });
//   }
// });

export default router;
