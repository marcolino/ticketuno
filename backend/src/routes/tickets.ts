import express, { /*Request,*/ Response } from 'express'; // TODO: import Request, Response from express in all routes
import { database } from '../db/database';
import { /*authenticateToken, */requireOperator, AuthRequest } from '../middleware/auth';
import { verify } from '../services/hmacService';
import { TicketValidationResult } from '../shared/types/ticket';
//import { getErrorMessage } from '../utils/errorHandler';

const router = express.Router();

// Protected: Validate a ticket (from QrCode)
router.post('/validate', requireOperator, async (req: AuthRequest, res: Response) => {
  const { payload } = req.body as { payload?: string };
  const { by } = req.body as { by?: string };

  // Basic guard
  if (!payload || typeof payload !== 'string') {
    return res.status(400).json({
      status: 'error',
      label: req.t('Missing payload'),
    } satisfies TicketValidationResult);
  }

  // Parse the query-string the ticket was signed with
  let fields: Record<string, string>;
  try {
    fields = Object.fromEntries(new URLSearchParams(payload));
  } catch {
    return res.json({
      status: 'invalid',
      label: req.t('Malformed QR data'),
    } satisfies TicketValidationResult);
  }

  // Destructure fields  
  const { ref, title, seat, row, sig } = fields;
  if (!ref) {
    return res.json({
      status: 'invalid',
      label: req.t('Missing reference QR field'),
    } satisfies TicketValidationResult);
  }
  if (!sig) {
    return res.json({
      status: 'invalid',
      label: req.t('Missing signature QR field')
    } satisfies TicketValidationResult);
  }

  // Verify HMAC signature
  if (!verify(fields)) {
    return res.json({
      status: 'invalid',
      label: req.t('Signature mismatch, ticket may be forged'),
    } satisfies TicketValidationResult);
  }

  // Look up booking in the database
  const booking = await database.getBookingByRef(ref);
  if (!booking) {
    return res.json({
      status: 'invalid',
      label: req.t('Booking reference {{ref}} not found', { ref }),
    } satisfies TicketValidationResult);
  }

  // Check if ticket was already used...
  if (booking.usedAt) {
    return res.json({
      status: 'already_used',
      label: req.t('Already scanned at {{when}}', { when: booking.usedAt.toLocaleTimeString() }),
    } satisfies TicketValidationResult);
  }

  // Mark as used (atomic update guards against race conditions) ────────

  const updated = await database.markBookingUsed(ref, by);
  if (!updated) {
    // Another validator just beat us to it (race condition)
    return res.json({
      status: 'already_used',
      label: req.t('Just scanned by another device'),
    } satisfies TicketValidationResult);
  }
  
  // All good, ticket is valid
  return res.json({
    status: 'valid',
    label: req.t('Admission granted'),
    detail: {
      holderName: booking.holderName,
      seat,
      row,
      show: title,
    },
  } satisfies TicketValidationResult);
});

export default router;
