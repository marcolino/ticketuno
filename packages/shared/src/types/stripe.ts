import Stripe from 'stripe';

/**
 * Full Stripe webhook event type
 */
type StripeEvent =
  ReturnType<InstanceType<typeof Stripe>['webhooks']['constructEvent']>;

/**
 * Extract payload object from a specific webhook event type
 */
export type EventPayload<T extends StripeEvent['type']> =
  Extract<
    StripeEvent,
    { type: T }
  >['data']['object'];

/**
 * Specific webhook payloads
 */
export type CheckoutSession =
  EventPayload<'checkout.session.completed'>;

export type PaymentIntent =
  EventPayload<'payment_intent.succeeded'>;

export type StripeAccount =
  EventPayload<'account.updated'>;
  