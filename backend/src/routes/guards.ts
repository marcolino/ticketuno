import { Router } from 'express';
import { database } from '../db/database';

const router = Router();

router.get('/performance/:id', async (req, res) => {
  const result = await database.guardPerformance(req.params.id);
  res.json(result);
});

router.get('/event/:id', async (req, res) => {
  const result = await database.guardEvent(req.params.id);
  res.json(result);
});

router.get('/theater/:id', async (req, res) => {
  const result = await database.guardTheater(req.params.id);
  res.json(result);
});

router.get('/layout/:id', async (req, res) => {
  const result = await database.guardLayout(req.params.id);
  res.json(result);
});

export default router;
