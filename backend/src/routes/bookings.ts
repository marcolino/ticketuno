import express, { Request, Response }  from 'express';
import { database } from '../db/database';
import { requireAuthentication, requireOperator } from '../middleware/auth';
//import { AuthRequest } from '@ticketuno/shared';
import { paymentStripeService } from '../services/paymentStripeService';
//import { createCheckoutSession } from '../services/paymentStripeService';
import { getErrorMessage } from '@ticketuno/shared';
//import { GeneralSetupType } from '@ticketuno/shared';
//import { PaymentGateway } from '@ticketuno/shared/types/generalSetup';
import { getSetup, readStripeConnect } from '../services/setupService';
import { PaymentGateway } from '@ticketuno/shared';
import config from '../config';

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
router.post('/:performanceId/create', requireAuthentication, async (req: Request, res: Response) => {
  const setup = getSetup();
  // TODO: remove payments enabled/disabled boolean, we use gateway free...
  try {
    // TODO: totalPrice was in req.body, but it is not needed,
    //       it is calculated as `event!.baseTicketPrice * seatIds.length`;
    //       here we will add logic for different seats prices, if needed.
    //       So check if frontend calculates totalPrice, and delete it.
    const performanceId = req.params.performanceId;
    const paymentMethod = setup.payments.gateway as PaymentGateway;
    const { seatIds } = req.body; 
    const userId = req.userId!;

    // Validations (event is active, cash is accepted, etc.)
    const performance = await database.getPerformanceById(performanceId);
    const event = await database.getEventById(performance!.eventId);
    
    const totalPrice = event!.baseTicketPrice * seatIds.length;
    
    // Verify event accepts cash if required (TODO: why events should restrict payment medhods?)
    if ((paymentMethod === 'cash') && (!event?.acceptsCash)) {
      return res.status(400).json({ error: req.t('Cash payment not accepted for this event') });
    }

    if (seatIds.length <= 0) {
      return res.status(400).json({ error: req.t('No seats requested!') });
    }

    const bookingResult = await database.bookSeatsWithPaymentMethod(
      performanceId,
      seatIds,
      userId,
      totalPrice,
      paymentMethod,
    );
    if (!bookingResult.success) {
      return res.status(409).json({ 
        error: req.t('Some seats are no longer available'),
        unavailableSeats: bookingResult.unavailableSeats 
      });
    }
    
    const bookingRefs = bookingResult.seats.map(s => s.bookingRef);

    // Payment gateway flow
    if (event!.baseTicketPrice <= 0) {
      return res.json({
        success: true,
        paymentMethod,
        paymentStatus: 'zero_amount_payment',
        bookingRefs,
      });
    }

    const totalAmountCents = Math.round(event!.baseTicketPrice * seatIds.length * 100);

    //const currency = event!.currency;
    switch (paymentMethod) {
      case 'stripe': {
        // CheckoutSession
        try {
          const stripe = readStripeConnect(setup);
          if (!stripe.accountId || stripe.status !== 'active') {
            // Rollback: release seats — payments aren't configured/active yet.
            await database.cancelBookingsByRefs(bookingRefs);
            return res.status(503).json({ error: req.t('Online payments are not available yet') });
          }

          const buyer = await database.getUserById(userId);
           const bookingIds = bookingResult.bookingIds; // Array of IDs

          // Build URLs with placeholders
          const successUrl = `${config.app.baseUrlFrontend}/payments/success?payment=success&session_id={CHECKOUT_SESSION_ID}`;
          const cancelUrl = `${config.app.baseUrlFrontend}/payments/canceled?payment=canceled&session_id={CHECKOUT_SESSION_ID}`;
          
          const checkoutSession = await paymentStripeService.createCheckoutSession(
            bookingIds,
            performanceId,
            seatIds,
            totalAmountCents,
            stripe.accountId,
            buyer?.email ?? '',
            successUrl,
            cancelUrl,
          );
          return res.json({
            paymentMethod: 'stripe',
            paymentStatus: 'pending',
            bookingRefs,
            checkoutUrl: checkoutSession.sessionUrl,
          });
        } catch (stripeError) {
          // Rollback: release seats
          await database.cancelBookingsByRefs(bookingRefs);
          return res.status(502).json({ error: req.t('Stripe checkout error: {{error}}', {error: getErrorMessage(stripeError)}) });
        }
      }
      case 'cash': {
        return res.json({
          success: true,
          paymentMethod,
          paymentStatus: 'deferred',
          bookingRefs,
        });
      }
      case 'free': {
        return res.json({
          success: true,
          paymentMethod,
          paymentStatus: 'not_requested',
          bookingRefs,
        });
      }
    }
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to create booking: {{error}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
