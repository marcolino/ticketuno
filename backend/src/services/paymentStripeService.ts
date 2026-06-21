import Stripe from 'stripe';
import { database } from '../db/database';
import {
  CheckoutSession,
  PaymentIntent,
  StripeAccount,
} from '@ticketuno/shared';
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
    {
      apiVersion: '2026-05-27.dahlia',
    }
  );
  // constructor() {
  //   if (!config.stripe.secretKey) {
  //     throw new Error('STRIPE_SECRET_KEY is not configured');
  //   }
  //   this.stripe = new Stripe(config.stripe.secretKey, {
  //     apiVersion: '2026-05-27.dahlia',
  //   });
  // }

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
      stripeAccountId: account.id,
      stripeAccountStatus: 'pending',
    });

    return account.id;
  }

  async getOnboardingLink(accountId: string): Promise<string> {
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${config.app.baseUrlFrontend}/settings/payments/refresh`,
      return_url: `${config.app.baseUrlFrontend}/settings/payments/success`,
      type: 'account_onboarding',
    });
    return accountLink.url;
  }

  async createCheckoutSession(
    bookingId: string,
    performanceId: string,
    seatIds: string[],
    totalAmount: number,
    organizerStripeAccountId: string,
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
              name: `TicketUno - Booking ${bookingId}`,
              description: `Performance ID: ${performanceId}, Seats: ${seatIds.join(', ')}`,
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
          destination: organizerStripeAccountId,
        },
        metadata: {
          bookingId,
          performanceId,
          seatIds: JSON.stringify(seatIds),
        },
      },
      metadata: {
        bookingId,
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
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return;
    
    console.log(`Checkout completed for booking ${bookingId}`);
    // TODO: Update booking status, confirm seats, etc.
  }

  private async handlePaymentSucceeded(paymentIntent: PaymentIntent): Promise<void> {
    console.log(`Payment succeeded: ${paymentIntent.id}`);
    // TODO: Update payment record
  }

  private async handleAccountUpdated(account: StripeAccount): Promise<void> {
    const tenantId = account.metadata?.tenantId;
    if (tenantId) {
      const status = account.charges_enabled ? 'active' : 'disabled';
      await database.updateUser(tenantId, {
        stripeAccountStatus: status,
        stripeOnboardingCompleted: !!account.details_submitted,
      });
    }
  }
}

export const paymentStripeService = new StripeService();
