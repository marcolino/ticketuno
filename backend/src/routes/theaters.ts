import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../db/database';
import { requireAuthentication, requireOperator } from '../middleware/auth';
import { Theater, TheaterStats/*, Section*/ } from '@ticketuno/shared';
import { getErrorMessage } from '@ticketuno/shared';

const router = express.Router();

// Public: Get all theaters with stats
router.get('/', requireAuthentication, requireOperator, async (req, res) => {
  try {
    const theaters = await database.getAllTheaters();
    if (!theaters) {
      res.json([]);
    } else {
      const stats: TheaterStats[] = theaters.map(theater => {
        return {
          id: theater.id,
          name: theater.name,
          description: theater.description,
          stageType: theater.stageType,
          address: theater.address,
          websiteUrl: theater.websiteUrl,
          status: theater.status,
          currentLayoutId: theater.currentLayoutId,
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
router.post('/', requireAuthentication, requireOperator, async (req, res) => {
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
    };

    const id = await database.createTheater(theater);
    res.status(201).json(id);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to create theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: update theater by id (operator only)
router.put('/:id', requireAuthentication, requireOperator, async (req: Request, res: Response) => {
  try {

    // Check if title is set and not null
    if (req.body.name !== undefined && (req.body.name === '' || req.body.name === null)) {
      return res.status(400).json({ error: req.t('Name cannot be empty') });
    }

    // Check if theater id is set and not null
    if (req.body.layoutId !== undefined && (req.body.layoutId === '' || req.body.layoutId === null)) {
      return res.status(400).json({ error: req.t('A layout must be selected') });
    }

    const theater = await database.getTheaterById(req.params.id);
    if (!theater) {
      return res.status(404).json({ error: req.t('Theater not found') });
    }
    const response = await database.updateTheater(req.params.id, req.body);
    res.json(response);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: delete theater by id (operator only)
router.delete('/:id', requireAuthentication, requireOperator, async (req: Request, res) => {
  try {
    res.json(await database.deleteTheater(req.params.id));
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Protected, Operator: Update theater
router.put('/:id', requireAuthentication, requireOperator, async (req, res) => {
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
      updatedAt: new Date().toISOString()
    };

    // Save back to database - we need a new method
    await database.updateTheater(theaterId, updatedTheater);
    res.json(updatedTheater);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
