import express from 'express';
import { database } from '../db/database';
import { requireAuthentication, requireOperator } from '../middleware/auth';
import { AuthRequest } from '../shared/types/auth';
import { getErrorMessage } from '../shared/utils/misc';

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /bookings
// Operator-only: list all bookings, enriched with user / event / performance /
// theater data. Supports optional query-string filters:
//   ?status=confirmed|canceled|refunded|all   (default: all)
//   ?performanceDate=YYYY-MM-DD
//   ?eventId=…
// ---------------------------------------------------------------------------
router.get('/', requireAuthentication, requireOperator, async (req: AuthRequest, res) => {
  try {
    const { status, performanceDate, eventId } = req.query as Record<string, string>;
    const bookings = await database.getAllBookingsEnriched({ status, performanceDate, eventId });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to fetch bookings: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// ---------------------------------------------------------------------------
// GET /bookings/my
// Authenticated: return the current user's own bookings (enriched).
// Placed before /:id so Express doesn't treat "my" as an id.
// ---------------------------------------------------------------------------
router.get('/my', requireAuthentication, async (req: AuthRequest, res) => {
  try {
    const bookings = await database.getBookingsByUserIdEnriched(req.userId!);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to fetch bookings: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// ---------------------------------------------------------------------------
// GET /bookings/:id
// Authenticated: return a single enriched booking.
// A regular user may only fetch their own booking; operators may fetch any.
// ---------------------------------------------------------------------------
router.get('/:id', requireAuthentication, async (req: AuthRequest, res) => {
  try {
    const booking = await database.getBookingDetailById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: req.t('Booking not found') });
    }

    const isOwner    = booking.userId === req.userId;
    const isOperator = req.userRole === 'operator' || req.userRole === 'admin';

    if (!isOwner && !isOperator) {
      return res.status(403).json({ error: req.t('Insufficient permissions') });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to fetch booking: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// ---------------------------------------------------------------------------
// PATCH /bookings/:id/cancel
// Authenticated: cancel a booking (release seat).
// A regular user may only cancel their own confirmed booking;
// operators may cancel any confirmed booking.
// ---------------------------------------------------------------------------
router.patch('/:id/cancel', requireAuthentication, async (req: AuthRequest, res) => {
  try {
    const booking = await database.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: req.t('Booking not found') });
    }

    const isOwner    = booking.userId === req.userId;
    const isOperator = req.userRole === 'operator' || req.userRole === 'admin';

    if (!isOwner && !isOperator) {
      return res.status(403).json({ error: req.t('Insufficient permissions') });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: req.t('Only confirmed bookings can be canceled') });
    }

    const result = await database.cancelBooking(req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: req.t(result.reason ?? 'Failed to cancel booking') });
    }

    res.json({ message: req.t('Booking canceled successfully') });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to cancel booking: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// ---------------------------------------------------------------------------
// PATCH /bookings/:id/scan
// Operator-only: manually mark a booking as scanned.
// Use when the QR scanner cannot be used (damaged ticket, device failure).
// ---------------------------------------------------------------------------
router.patch('/:id/scan', requireAuthentication, requireOperator, async (req: AuthRequest, res) => {
  try {
    const booking = await database.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: req.t('Booking not found') });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: req.t('Only confirmed bookings can be scanned') });
    }

    if (booking.scannedAt) {
      return res.status(400).json({ error: req.t('Booking already scanned') });
    }

    const marked = await database.markBookingUsed(booking.bookingRef, req.userId);
    if (!marked) {
      // Race condition: someone else scanned between our check and the update
      return res.status(409).json({ error: req.t('Booking was already scanned') });
    }

    res.json({ message: req.t('Booking marked as scanned') });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to scan booking: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
