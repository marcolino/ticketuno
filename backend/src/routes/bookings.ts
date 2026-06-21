import express, { Request, Response }  from 'express';
import { database } from '../db/database';
import { requireAuthentication, requireOperator } from '../middleware/auth';
//import { AuthRequest } from '@ticketuno/shared';
import { getErrorMessage } from '@ticketuno/shared';

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /bookings
// Operator-only: list all bookings, enriched with user / event / performance /
// theater data. Supports optional query-string filters:
//   ?status=confirmed|canceled|refunded|all   (default: all)
//   ?performanceDate=YYYY-MM-DD
//   ?eventId=…
// ---------------------------------------------------------------------------
router.get('/', requireAuthentication, requireOperator, async (req: Request, res: Response) => {
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
router.get('/my', requireAuthentication, async (req: Request, res: Response) => {
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
router.get('/:id', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const booking = await database.getBookingDetailById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: req.t('Booking not found') });
    }

    const isOwner = booking.userId === req.userId;
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
router.patch('/:id/cancel', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const booking = await database.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: req.t('Booking not found') });
    }

    const isOwner = booking.userId === req.userId;
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
router.patch('/:id/scan', requireAuthentication, requireOperator, async (req: Request, res: Response) => {
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

// POST /bookings/create - create a booking with a payment method
router.post('/create', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const { performanceId, seatIds, totalPrice, paymentMethod = 'stripe' } = req.body;
    
    // Verifica che l'evento accetti cash se richiesto
    if (paymentMethod === 'cash') {
      const performance = await database.getPerformanceById(performanceId);
      const event = await database.getEventById(performance!.eventId);
      if (!event?.acceptsCash) {
        return res.status(400).json({ error: req.t('Cash payment not accepted for this event') });
      }
    }
    
    // const result = await database.bookSeats(
    //   performanceId,
    //   seatIds,
    //   req.userId!,
    //   totalPrice
    // );
    const result = await database.bookSeatsWithPaymentMethod(
      performanceId,
      seatIds,
      req.userId!,
      totalPrice,
      paymentMethod,
    );
    
    if (!result.success) {
      return res.status(409).json({ 
        error: req.t('Some seats are no longer available'),
        unavailableSeats: result.unavailableSeats 
      });
    }
    
    // Per cash, il booking è già confirmed
    // Per stripe, il booking è in stato 'pending_payment'
    const paymentStatus = paymentMethod === 'cash' ? 'paid' : 'pending';
    
    res.json({
      success: true,
      bookingRefs: result.seats.map(s => s.bookingRef),
      paymentMethod,
      paymentStatus,
    });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to create booking: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
