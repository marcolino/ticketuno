import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../db/database';
import { authenticateToken, requireOperator, AuthRequest } from '../middleware/auth';
import { Theater, TheaterStats/*, Section*/ } from '../shared/types/theater';
import { getErrorMessage } from '../utils/errorHandler';

const router = express.Router();

// Public: Get all theaters with stats
router.get('/', authenticateToken, requireOperator, async (req, res) => {
  try {
    const theaters = await database.getAllTheaters();
    if (!theaters) {
      res.json([]);
    } else {
      const stats: TheaterStats[] = theaters.map(theater => {
        // let totalSeats = 0;
        // let freeSeats = 0;

        // theater.sections.forEach(section => {
        //   section.rows.forEach(row => {
        //     totalSeats += row.seats;
        //     if (row.seatStatuses) {
        //       freeSeats += row.seatStatuses.filter(s => s.status === 'available').length;
        //     } else {
        //       freeSeats += row.seats;
        //     }
        //   });
        // });

        return {
          id: theater.id,
          name: theater.name,
          description: theater.description,
          stageType: theater.stageType,
          address: theater.address,
          websiteUrl: theater.websiteUrl,
          status: theater.status,
          currentLayoutId: theater.currentLayoutId,
          // totalSeats,
          // freeSeats
        };
      });
      res.json(stats);
    }
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to get theaters: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Public: Get theater by id
router.get('/:id', async (req, res) => {
  try {
    const theaterId = req.params.id;
    const theater = await database.getTheaterById(theaterId);
    if (!theater) {
      return res.status(404).json({ error: req.t('Theater not found') });
    }
    res.json(theater);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to get theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected, Operator: Create new theater
router.post('/', authenticateToken, requireOperator, async (req, res) => {
  try {
    const { name, description, stageType, address, websiteUrl, status, currentLayoutId } = req.body;
    if (!name) {
      return res.status(400).json({ error: req.t('Name is required') });
    }

    const theater: Theater = {
      id: uuidv4(),
      name,
      description,
      stageType,
      address,
      websiteUrl,
      status,
      currentLayoutId,
      // createdAt: new Date().toISOString(),
      // updatedAt: new Date().toISOString()
    };

    const id = await database.createTheater(theater);
    res.status(201).json(id);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to create theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: update theater by id (operator only)
router.put('/:id', authenticateToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    await database.updateTheaterFull(req.params.id, req.body/*JSON.stringify(req.body)*/); // TODO: and name and des ?
    res.sendStatus(204);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: delete theater by id (operator only)
router.delete('/:id', authenticateToken, requireOperator, async (req: Request, res) => {
  try {
    await database.deleteTheater(req.params.id);
    res.json({ message: 'Theater deleted successfully' });
    /*
    const response = await database.deleteTheater(req.params.id);
    let reason;
    switch (response.reason) {
      case 'THEATER_HAS_LINKED_EVENTS':
        reason = req.t('theater has linked events');
        break;
      case 'THEATER_NOT_FOUND':
        reason = req.t('theater was not found');
        break;
      default:
        reason = req.t('unspecified reason');
        break;
    }
    if (response.deleted) {
      res.json({ message: req.t('Theater deleted successfully') });
    } else {
      res.status(400).json({ error: req.t('Theater could not be deleted: {{reason}}', getErrorMessage() { reason }) });
    }
    */
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to delete theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected, Operator: Update theater
router.put('/:id', authenticateToken, requireOperator, async (req, res) => {
  try {
    const theaterId = req.params.id;
    const { name, description, /*sections*/ stageType, address, websiteUrl, status} = req.body;
    const theater = await database.getTheaterById(theaterId);

    if (!theater) {
      return res.status(404).json({ error: req.t('Theater not found') });
    }

    // Update theater details
    const updatedTheater = {
      ...theater,
      name: name || theater.name,
      description: description !== undefined ? description : theater.description,
      stageType: stageType !== undefined ? stageType : theater.stageType,
      address: address !== undefined ? address : theater.address,
      websiteUrl: websiteUrl !== undefined ? websiteUrl : theater.websiteUrl,
      status: status !== undefined ? status : theater.status,
      // sections: sections || theater.sections,
      updatedAt: new Date().toISOString()
    };

    // Save back to database - we need a new method
    await database.updateTheaterFull(theaterId, updatedTheater);
    res.json(updatedTheater);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
