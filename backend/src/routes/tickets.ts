import express from 'express';
import { database } from '../db/database';
import { authenticateToken } from '../middleware/auth';
import { getErrorMessage } from '../utils/errorHandler';

const router = express.Router();

// Public: Book seats
router.post('/bookSeats', authenticateToken, async (req, res) => {
  try {
    const [performanceId, seatIds, userId, totalPrice] = req.body;
    const booking = await database.bookSeats(performanceId, seatIds, userId, totalPrice);
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to book seats: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
