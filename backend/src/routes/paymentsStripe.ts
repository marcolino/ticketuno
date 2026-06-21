import express, { Request, Response } from 'express';
import { paymentStripeService } from '../services/paymentStripeService';
import { database } from '../db/database';
import { requireAuthentication, requireOperator } from '../middleware/auth';
import { getErrorMessage } from '@ticketuno/shared';
import config from '../config';

const router = express.Router();

// Create Connect account for an organizer (operator/admin)
router.post('/connect/onboard/:organizerId', requireAuthentication, requireOperator, async (req: Request, res: Response) => {
  try {
    const { organizerId } = req.params;
    const organizer = await database.getUserById(organizerId);
    
    if (!organizer) {
      return res.status(404).json({ error: req.t('Organizer not found') });
    }

    let accountId = organizer.stripeAccountId;
    
    if (!accountId) {
      accountId = await paymentStripeService.createConnectedAccount(
        organizerId,
        organizer.email,
        `${organizer.firstName} ${organizer.lastName} Events`
      );
    }

    const onboardingLink = await paymentStripeService.getOnboardingLink(accountId);
    
    res.json({ onboardingUrl: onboardingLink });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to create onboarding: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Webhook endpoint (public)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let sig = req.headers['stripe-signature']; // TODO: use const, not let ...
  if (!sig) sig = ''; if (Array.isArray(sig)) sig = sig[0]; // TODO: handle case of array, or undefined...

  try {
    await paymentStripeService.handleWebhook(req.body, sig);
    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${getErrorMessage(error)}`);
  }
});

// Create session checkout for a booking
router.post('/create-checkout', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const { bookingId, performanceId, seatIds, totalAmount, organizerStripeAccountId } = req.body;
    
    // Verify booking is owned by user
    const booking = await database.getBookingById(bookingId);
    if (!booking || booking.userId !== req.userId) {
      return res.status(403).json({ error: req.t('Unauthorized') });
    }

    const user = await database.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: req.t('User not found') });
    }

    const session = await paymentStripeService.createCheckoutSession(
      bookingId,
      performanceId,
      seatIds,
      totalAmount,
      organizerStripeAccountId,
      user.email,
      `${config.app.baseUrlFrontend}/payment/success`,
      `${config.app.baseUrlFrontend}/payment/cancel`
    );

    res.json({ sessionId: session.sessionId, sessionUrl: session.sessionUrl });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to create checkout: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Verify Stripe account status for an organizer
router.get('/connect/status/:organizerId', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const { organizerId } = req.params;
    const organizer = await database.getUserById(organizerId);
    
    res.json({
      hasStripeAccount: !!organizer?.stripeAccountId,
      onboardingCompleted: organizer?.stripeOnboardingCompleted,
      status: organizer?.stripeAccountStatus,
    });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to get status: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
