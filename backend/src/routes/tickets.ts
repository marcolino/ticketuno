import express, { /*Request,*/ Response } from 'express'; // TODO: import Request, Response from express in all routes
//import { database } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { TicketValidationResult, TicketValidationStatus } from '../shared/types/ticket';
import { getErrorMessage } from '../utils/errorHandler';

const router = express.Router();

// // Public: Book seats
// router.post('/bookSeats', authenticateToken, async (req: Request, res: Response) => {
//   try {
//     const [performanceId, seatIds, userId, totalPrice] = req.body;
//     const booking = await database.bookSeats(performanceId, seatIds, userId, totalPrice);
//     res.json(booking);
//   } catch (error) {
//     res.status(500).json({ error: req.t('Failed to book seats: {{err}}', { err: getErrorMessage(error) }) });
//   }
// });

// Protected: Validate a ticket (from QrCode)
router.post('/:code/validate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    //const { seatIds } = req.body;
    const { code } = req.params;
    //const userId = req.userId;

    // TODO ...
    const status: TicketValidationStatus = 'valid'; // 'valid' | 'invalid' | 'already_used' | 'error';
    const result: TicketValidationResult = {
      code,
      status,
      label: 'Ticket is valid',
    }
    res.json(result);
    //res.json(status);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to validate ticket: {{err}}', {err: getErrorMessage(error)}) });
  }
});

export default router;
