import Stripe from 'stripe';
import { database } from '../db/database';
import {
  CheckoutSession,
  PaymentIntent,
  StripeAccount,
  StripeConnectSetup,
  StripeConnectStatus,
} from '@ticketuno/shared';
import { loadSetup, readStripeConnect, updateStripeConnect } from './setupService';
import { i18n } from '../i18n';
import config from '../config';

// type StripeEvent =
//   ReturnType<InstanceType<typeof Stripe>['webhooks']['constructEvent']>;

// type CheckoutCompletedEvent =
//   Extract<StripeEvent, {
//     type: 'checkout.session.completed';
//   }>;

// type CheckoutSession =
//   CheckoutCompletedEvent['data']['object'];

// type PaymentSucceededEvent =
//   Extract<
//     StripeEvent,
//     { type: 'payment_intent.succeeded' }
//   >;

// type PaymentIntent =
//   PaymentSucceededEvent['data']['object'];

// type AccountUpdatedEvent =
//   Extract<
//     StripeEvent,
//     { type: 'account.updated' }
//   >;

// type StripeAccount =
//   AccountUpdatedEvent['data']['object'];

// type EventPayload<T extends StripeEvent['type']> =
//   Extract<StripeEvent, { type: T }>['data']['object'];

class StripeService {
  //private stripe: InstanceType<typeof Stripe>;
  //private stripe: Stripe;
  //private stripe: ReturnType<typeof createStripe>;
  private stripe = new Stripe(
    config.stripe.secretKey,
    // {
    //   apiVersion: '2026-05-27.dahlia',
    // }
  );
  // constructor() {
  //   if (!config.stripe.secretKey) {
  //     throw new Error('STRIPE_SECRET_KEY is not configured');
  //   }
  //   this.stripe = new Stripe(config.stripe.secretKey, {
  //     apiVersion: '2026-05-27.dahlia',
  //   });
  // }

  /**
   * Get the Stripe instance (useful for direct API calls)
   */
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

  /** Maps a Stripe account's flags to our stored connect status. */
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
    const onboardingCompleted = detailsSubmitted; // alias, in caso qualcos'altro lo legga ancora
    const status: StripeConnectStatus =
      chargesEnabled ? 'active' : detailsSubmitted ? 'disabled' : 'pending';
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
      // refresh_url: `${config.app.baseUrlFrontend}/settings/payments/refresh`,
      // return_url: `${config.app.baseUrlFrontend}/settings/payments/success`,
      refresh_url: `${baseUrl}/stripe/connect/refresh`, // TODO ...
      return_url: `${baseUrl}/stripe/connect/success`, // TODO ...
      type: 'account_onboarding',
    });
    console.log('✅ Onboarding link created:', accountLink.url);
    return accountLink.url;
  }

  async createCheckoutSession(
    bookingIds: string[],
    performanceId: string,
    seatIds: string[],
    totalAmount: number,
    organizeraccountId: string,
    customerEmail: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    
    const platformFee = this.calculatePlatformFee(totalAmount);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: config.stripe.currency,
            product_data: {
              // TODO: check if translation works with i18n.t ...
              name: `TicketUno - ${i18n.t('Seats')}: ${seatIds.join(', ')}`,
              description: `${i18n.t('Performance ID')}: ${performanceId}, ${i18n.t('Bookings')}: ${bookingIds.join(', ')}`,
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
          destination: organizeraccountId,
        },
        metadata: { // Payment intent metadata
          bookingIds: JSON.stringify(bookingIds), // Store all IDs as JSON
          performanceId,
          seatIds: JSON.stringify(seatIds),
        },
      },
      metadata: { // Session metadata
        bookingIds: JSON.stringify(bookingIds),
        performanceId,
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

  async handleWebhook(body: Buffer, signature: string): Promise<void> {
    // console.log('config.stripe:', config.stripe);
    // console.log('config.stripe.webhookSecret:', config.stripe.webhookSecret);
    const event = this.stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret
    );

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
    }
  }

  private async handleCheckoutCompleted(session: CheckoutSession): Promise<void> {
    console.log(`📨 Checkout completed: ${session.id}`);
    
    try {
      // 1. Get booking ID(s) from session metadata
      const bookingIdsJson = session.metadata?.bookingIds;
      if (!bookingIdsJson) {
        console.warn(`⚠️ No bookingIds in checkout session: ${session.id}`);
        return;
      }

      let bookingIds: string[];
      try {
        bookingIds = JSON.parse(bookingIdsJson);
      } catch (parseError) {
        // Fallback: single booking ID (backward compatibility)
        const singleId = session.metadata?.bookingId;
        if (singleId) {
          bookingIds = [singleId];
        } else {
          throw parseError;
        }
      }

      console.log(`📦 Processing ${bookingIds.length} booking(s): ${bookingIds.join(', ')}`);

      // 2. Update all bookings
      for (const bookingId of bookingIds) {
        const booking = await database.getBookingById(bookingId);
        if (!booking) {
          console.warn(`⚠️ Booking not found: ${bookingId}`);
          return;
        }

        // Skip if f status is already confirmed
        if (booking.status === 'confirmed') {
          console.log(`ℹ️ Booking ${bookingId} already confirmed`);
          return;
        }

        // Update booking status to confirmed
        const updated = await database.updateBookingStatus(bookingId, 'confirmed');
        if (updated) {
          console.log(`✅ Booking ${bookingId} (${booking.bookingRef}) confirmed via checkout`);
        }

        await database.updateBookingCheckoutSession(bookingId, session.id);

      }

      // Send confirmation email (optional)
      //await this.sendBookingConfirmationEmail(booking);

    } catch (error) {
      console.error('❌ Error handling checkout completed:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: PaymentIntent): Promise<void> {
    console.log(`📨 Payment succeeded: ${paymentIntent.id}`);
    
    try {
      // Parse the booking IDs from metadata
      const bookingIdsJson = paymentIntent.metadata?.bookingIds;
      if (!bookingIdsJson) {
        console.warn(`⚠️ No bookingIds in payment intent metadata`);
        return;
      }

      const bookingIds: string[] = JSON.parse(bookingIdsJson);
      console.log(`📦 Booking IDs: ${bookingIds.join(', ')}`);

      // Update all bookings
      for (const bookingId of bookingIds) {
        const booking = await database.getBookingById(bookingId);
        if (!booking) {
          console.warn(`⚠️ Booking not found: ${bookingId}`);
          continue;
        }

        // One call - status + payment intent
        const success = await database.confirmBookingWithPayment(bookingId, paymentIntent.id);
        if (success) {
          console.log(`✅ Booking ${bookingId} confirmed with payment ${paymentIntent.id}`);
        } else {
          throw new Error(`⚠️ Failed to confirm booking ${bookingId}`);
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
