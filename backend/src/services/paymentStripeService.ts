import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { database } from '../db/database';
import {
  CheckoutSession,
  PaymentIntent,
  StripeAccount,
  StripeConnectSetup,
  StripeConnectStatus,
} from '@ticketuno/shared';
import { tenantContext } from '../tenancy/tenantContext';
import { notify } from './notificationService';
import { loadSetup, readStripeConnect, updateStripeConnect } from './setupService';
import { bookingConfirmationService } from './bookingConfirmationService';
import { TFunction } from 'i18next';
import config from '../config';

interface CreateCheckoutSessionParams {
  bookingIds: string[];
  performanceId: string;
  seatIds: string[];
  totalAmount: number;
  organizerAccountId: string;
  customerEmail: string;
  eventTitle: string;
  performanceDateTime: string;
  theaterName?: string;
  successUrl: string;
  cancelUrl: string;
  t: TFunction,
}

class StripeService {
  private stripe = new Stripe(
    config.stripe.secretKey,
  );

  getStripe(): Stripe {
    return this.stripe;
  }

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise</*Stripe.*/PaymentIntent> {
    return await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      metadata: params.metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  async createConnectedAccount(organizerId: string, email: string, businessName: string): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: 'IT',
      email: email,
      business_profile: {
        name: businessName,
        url: config.app.baseUrlFrontend,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      metadata: {
        tenantId: organizerId,
      },
    });

    await database.updateUser(organizerId, {
      accountId: account.id,
      stripeAccountStatus: 'pending',
    });

    return account.id;
  }

  /**
   * Creates the platform organizer's Express connected account. Unlike
   * `createConnectedAccount` (per-user), this is the single account stored in
   * `setup.payments.stripe` for this deployment. The caller persists the id.
   */
  async createPlatformConnectedAccount(email: string, businessName: string): Promise<string> {
    console.log('config.app.baseUrlFrontend:', config.app.baseUrlFrontend,);
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: 'IT',
      email,
      business_profile: {
        name: businessName,
        url: config.app.baseUrlFrontend,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      metadata: { scope: 'platform-organizer' },
    });
    return account.id;
  }

  /**
   * Maps a Stripe account's flags to our stored connect status.
   */
  private mapAccountStatus(
    account: {
      charges_enabled?: boolean | null;
      details_submitted?: boolean | null;
      payouts_enabled?: boolean | null;
    }
  ): {
    status: StripeConnectStatus;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
    onboardingCompleted: boolean;
  } {
    const chargesEnabled = !!account.charges_enabled;
    const detailsSubmitted = !!account.details_submitted;
    const payoutsEnabled = !!account.payouts_enabled;
    const onboardingCompleted = detailsSubmitted; // onboardingCompleted is an alias of detailsSubmitted
    const status: StripeConnectStatus =
      chargesEnabled ? 'active' : detailsSubmitted ? 'disabled' : 'pending'
    ;
    return { status, chargesEnabled, detailsSubmitted, payoutsEnabled, onboardingCompleted };
  }

  /**
   * Pulls the current state of the configured organizer account from Stripe and
   * writes it into setup. Useful when the `account.updated` webhook isn't wired
   * (e.g. local dev). Returns null if no account is configured.
   */
  async refreshConnectedAccountStatus(): Promise<StripeConnectSetup | null> {
    const stripe = readStripeConnect(await loadSetup());
    if (!stripe.accountId) return null;
    const account = await this.stripe.accounts.retrieve(stripe.accountId);
    const mapped = this.mapAccountStatus(account);
    return await updateStripeConnect(mapped);
  }

  async getOnboardingLink(accountId: string): Promise<string> {
    const baseUrl = config.app.baseUrlFrontend;

    console.log('📡 Creating onboarding link with base URL:', baseUrl);

    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/stripe/connect/refresh`,
      return_url: `${baseUrl}/stripe/connect/success`,
      type: 'account_onboarding',
    });
    console.log('✅ Onboarding link created:', accountLink.url);
    return accountLink.url;
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ sessionId: string; sessionUrl: string }> {
    const {
      bookingIds, performanceId, seatIds, totalAmount, organizerAccountId,
      eventTitle, performanceDateTime, theaterName, customerEmail, successUrl, cancelUrl, t
    } = params;

    const platformFee = this.calculatePlatformFee(totalAmount);

    /**
     * We have to add tenant slug to metadata since Stripe only populates
     * event.account when an event is generated within a connected account's
     * own context — destination-charge events generated on the platform
     * never carry it, regardless of where the money ultimately routes.
     */
    const tenantSlug = tenantContext.getStore()?.slug;
    if (!tenantSlug) {
      await notify(`⚠️ createCheckoutSession called outside of tenant context`);
      throw new Error('createCheckoutSession called outside of tenant context');
    }

    /**
     * Stripe metadata values are capped at 500 chars. bookingIds serialised
     * as JSON blows past that well before 40 seats (one booking row per
     * seat in our schema). Instead we stamp a single short group ref on all
     * the pending booking rows and only pass that ref through Stripe
     * metadata. Both webhook handlers (checkout.session.completed /
     * payment_intent.succeeded) resolve the full set of bookings from the
     * DB via this ref instead of parsing them out of metadata.
     */
    const bookingGroupRef = randomUUID();
    await database.setBookingGroupRef(bookingIds, bookingGroupRef);
    
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: config.stripe.currency,
            product_data: {
              name: `\
${config.app.name} - \
${t('theater')}: ${theaterName}, \
${t('event')}: ${eventTitle}, \
${t('on date')}: ${performanceDateTime} \
`,
              description: `${t('Seats')}: ${seatIds.join(', ')}`,
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: organizerAccountId,
        },
        metadata: { // Payment intent metadata
          bookingGroupRef,
          performanceId,
          tenantSlug,
        },
      },
      metadata: { // Session metadata
        bookingGroupRef,
        performanceId,
        tenantSlug,
      },
    });

    return {
      sessionId: session.id,
      sessionUrl: session.url!,
    };
  }

  private calculatePlatformFee(amountInCents: number): number {
    const percentFee = Math.floor(amountInCents * (config.stripe.platformFeePercent / 100));
    const fixedFee = config.stripe.platformFeeFixed;
    return percentFee + fixedFee;
  }

  /**
   * Verifies the Stripe signature only — no DB access, so it's safe to call
   * BEFORE tenant context is known (that's the whole point: the route reads
   * event.account from the verified event to resolve the tenant).
   */
  verifyWebhookEvent(body: Buffer, signature: string): Stripe.Event {
    return this.constructEventWithFallback(body, signature);
  }

  /**
   * Everything that used to run inside handleWebhook() after verification.
   * Must be called from within runWithTenant() — it calls database.* and
   * loadSetup()/updateStripeConnect(), which both resolve via tenant context.
   */
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    console.info(`⚫ Stripe webhook received for event type ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'account.updated':
        await this.handleAccountUpdated(event.data.object);
        break;
      case 'account.external_account.updated':
        // no action needed, Stripe handles payout routing independently
        console.log('ℹ️ External account updated for connected account');
        break;
    }
  }

  /**
   * The two Event Destinations on Stripe (platform vs. connected accounts)
   * are signed with different secrets but point to the same /webhook URL.
   * We try the platform secret first; if verification fails due to an invalid
   * signature, we retry the Connect secret before giving up.
   */
  private constructEventWithFallback(body: Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        body,
        signature,
        config.stripe.webhookSecret
      );
    } catch (platformError) {
      try {
        return this.stripe.webhooks.constructEvent(
          body,
          signature,
          config.stripe.webhookSecretConnect
        );
      } catch (connectError) {
        // No one of the two secrets verifies the signature:
        // fake event or badly set secret. We rethrow original error.
        console.error(connectError);
        throw platformError;
      }
    }
  }

  private async handleCheckoutCompleted(session: CheckoutSession): Promise<void> {
    console.log(`📨 Checkout completed: ${session.id}`);

    try {
      // 1. Resolve the booking group from session metadata
      const bookingGroupRef = session.metadata?.bookingGroupRef;
      if (!bookingGroupRef) {
        console.warn(`⚠️ No bookingGroupRef in checkout session: ${session.id}`);
        return;
      }

      const groupBookings = await database.getBookingsByGroupRef(bookingGroupRef);
      if (groupBookings.length === 0) {
        console.warn(`⚠️ No bookings found for group ref: ${bookingGroupRef}`);
        return;
      }

      console.log(`📦 Processing ${groupBookings.length} booking(s) for group ${bookingGroupRef}`);

      // 2. Update all bookings
      const bookings = [];
      for (const booking of groupBookings) {
        const bookingId = booking.id;

        // Skip if f status is already confirmed
        if (booking.status !== 'confirmed') {
          const updated = await database.updateBookingStatus(bookingId, 'confirmed', 'paid');
          if (updated) {
            console.log(`✅ Booking ${bookingId} (${booking.bookingRef}) confirmed via checkout`);
          }
        } else {
          console.log(`ℹ️  Booking ${bookingId} already confirmed`);
        }

        await database.updateBookingCheckoutSession(bookingId, session.id);
        bookings.push(booking);
      }

      if (bookings.length > 0 && !bookings[0].confirmationEmailSentAt) {
        const claimed = await database.claimConfirmationEmailSend(bookings.map(b => b.id));
        if (claimed) {
          try {
            await bookingConfirmationService.sendBookingConfirmationForGroup(bookings, session.id);
            //await database.markConfirmationEmailSent(bookings.map(b => b.id));
          } catch (emailError) {
            // Non-fatal: booking status is already correct; don't fail the
            // whole webhook (and thus retry it forever) over an email issue.
            console.warn(`❌ Confirmation email failed for checkout ${session.id}:`, emailError);
          }
        } else {
          console.log(`ℹ️  Confirmation email already sent for checkout ${session.id}`);
        }
      }

    } catch (error) {
      console.error('❌ Error handling checkout completed:', error);
      throw error;
    }
  }
  
  private async handlePaymentSucceeded(paymentIntent: PaymentIntent): Promise<void> {
    console.log(`📨 Payment succeeded: ${paymentIntent.id}`);

    try {
      const bookingGroupRef = paymentIntent.metadata?.bookingGroupRef;
      if (!bookingGroupRef) {
        console.warn(`⚠️ No bookingGroupRef in payment intent metadata`);
        return;
      }

      const groupBookings = await database.getBookingsByGroupRef(bookingGroupRef);
      console.log(`📦 Bookings for group ${bookingGroupRef}: ${groupBookings.map(b => b.id).join(', ')}`);

      for (const booking of groupBookings) {
        const success = await database.confirmBookingWithPayment(booking.id, paymentIntent.id);
        if (success) {
          console.log(`✅ Booking ${booking.id} confirmed with payment ${paymentIntent.id}`);
        } else {
          throw new Error(`⚠️ Failed to confirm booking ${booking.id}`);
        }
      }

    } catch (error) {
      console.error('❌ Error handling payment succeeded:', error);
      throw error;
    }
  }

  private async handleAccountUpdated(account: StripeAccount): Promise<void> {
    // Only react to the platform organizer account recorded in setup.
    const stripe = readStripeConnect(await loadSetup());
    if (!stripe.accountId || account.id !== stripe.accountId) return;
    await updateStripeConnect(this.mapAccountStatus(account));
  }
}

export const paymentStripeService = new StripeService();
