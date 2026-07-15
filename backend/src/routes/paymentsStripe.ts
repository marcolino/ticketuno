import express, { Request, Response } from 'express';
import { paymentStripeService } from '../services/paymentStripeService';
import { notify } from '../services/notificationService';
import { requireAuthentication, requireAdmin } from '../middleware/auth';
import { getErrorMessage } from '@ticketuno/shared';
import { loadSetup, readStripeConnect, updateStripeConnect } from '../services/setupService';
import { tenantRegistry } from '../tenancy/tenantRegistry';
import { tenantDbManager } from '../tenancy/tenantDbManager';
import { runWithTenant } from '../tenancy/tenantContext';

const router = express.Router();

// ---------------------------------------------------------------------------
// Organizer Stripe Connect onboarding (admin)
//
// The platform serves ONE organizer per deployment; its connected account lives
// in setup.payments.stripe. The admin creates the account and gets a Stripe
// hosted onboarding link to send to the organizer, who completes KYC. Stripe's
// `account.updated` webhook then flips the stored status to 'active'.
// ---------------------------------------------------------------------------

// Create-or-reuse the organizer account and return a fresh onboarding link.
router.post('/connect/onboard', requireAuthentication, requireAdmin, async (req: Request, res: Response) => {
  // res.setHeader('ngrok-skip-browser-warning', 'true'); // TODO: only while developing...
  try {
    const { organizerEmail, businessName } = req.body as {
      organizerEmail?: string;
      businessName?: string;
    };

    let stripe = readStripeConnect(await loadSetup());

    let accountId = stripe.accountId;
    if (!accountId) {
      if (!organizerEmail || !businessName) {
        return res.status(400).json({ error: req.t('Organizer email and business name are required') });
      }
      accountId = await paymentStripeService.createPlatformConnectedAccount(organizerEmail, businessName);
      stripe = await updateStripeConnect({
        accountId,
        status: 'pending',
        onboardingCompleted: false,
        chargesEnabled: false,
        organizerEmail,
        businessName,
      });
      // NOTE: updateStripeConnect() already calls tenantRegistry.indexStripeAccountId()
      // internally now (see setupService.ts below) — no extra step needed here.
    }

    const onboardingUrl = await paymentStripeService.getOnboardingLink(accountId);
    res.json({ onboardingUrl, stripe });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to start onboarding: {{err}}', { err: req.t(getErrorMessage(error)) }) });
  }
});

// Read the stored organizer connect status (admin).
router.get('/connect/status', requireAuthentication, requireAdmin, async (req: Request, res: Response) => {
  // res.setHeader('ngrok-skip-browser-warning', 'true'); // TODO: only while developing...
  try {
    const stripe = readStripeConnect(await loadSetup());
    res.json(stripe);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to get status: {{err}}', { err: req.t(getErrorMessage(error)) }) });
  }
});

// Re-sync the stored status from Stripe (admin) — handy when webhooks aren't wired (dev).
router.post('/connect/sync', requireAuthentication, requireAdmin, async (req: Request, res: Response) => {
  // res.setHeader('ngrok-skip-browser-warning', 'true'); // TODO: only while developing...
  try {
    const stripe = await paymentStripeService.refreshConnectedAccountStatus();
    if (!stripe) {
      return res.status(400).json({ error: req.t('No Stripe account configured yet') });
    }
    res.json(stripe);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to sync status: {{err}}', { err: req.t(getErrorMessage(error)) }) });
  }
});

// Mint a fresh onboarding link (admin) — Stripe links expire and are single-use.
router.post('/connect/refresh-link', requireAuthentication, requireAdmin, async (req: Request, res: Response) => {
  // res.setHeader('ngrok-skip-browser-warning', 'true'); // TODO: only while developing...
  try {
    const stripe = readStripeConnect(await loadSetup());
    if (!stripe.accountId) {
      return res.status(400).json({ error: req.t('No Stripe account configured yet') });
    }
    const onboardingUrl = await paymentStripeService.getOnboardingLink(stripe.accountId);
    res.json({ onboardingUrl });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to refresh onboarding link: {{err}}', { err: req.t(getErrorMessage(error)) }) });
  }
});

router.post('/connect/debug-link', requireAuthentication, requireAdmin, async (req, res) => {
  // res.setHeader('ngrok-skip-browser-warning', 'true'); // TODO: only while developing...
  try {
    const stripe = readStripeConnect(await loadSetup());
    if (!stripe.accountId) {
      return res.status(400).json({ error: 'No account configured' });
    }
    
    // Generate a brand new link
    const onboardingUrl = await paymentStripeService.getOnboardingLink(stripe.accountId);
    
    // Also check the account status directly from Stripe
    const account = await paymentStripeService.getStripe().accounts.retrieve(stripe.accountId);
    
    res.json({
      accountId: stripe.accountId,
      accountStatus: {
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements,
      },
      onboardingUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Stripe Connect callback routes (these match the URLs in getOnboardingLink)

/**
 * GET /connect/refresh
 * Stripe redirects here if onboarding needs refreshing or fails
 */
router.get('/connect/refresh', async (req: Request, res: Response) => {
  // res.setHeader('ngrok-skip-browser-warning', 'true'); // TODO: only while developing...
  console.log('🔄 Stripe Connect refresh callback received:', {
    query: req.query,
    state: req.query.state,
  });
  
  try {
    await paymentStripeService.refreshConnectedAccountStatus();
    console.log('Redirecting to /admin/settings/payments'); // TODO ...
    res.redirect('/admin/settings/payments');
  } catch (error) {
    console.error('❌ Error refreshing Stripe status:', error);
    res.redirect(`/admin/settings/payments?error=${encodeURIComponent(getErrorMessage(error))}`); // TODO ...
  }
});

/**
 * GET /connect/success
 * Stripe redirects here after successful onboarding
 */
router.get('/connect/success', async (req: Request, res: Response) => {
  // res.setHeader('ngrok-skip-browser-warning', 'true'); // TODO: only while developing...
  console.log('✅ Stripe Connect success callback received:', {
    query: req.query,
    state: req.query.state,
  });
  
  try {
    const updated = await paymentStripeService.refreshConnectedAccountStatus();
    
    if (updated?.chargesEnabled && updated?.onboardingCompleted) {
      console.log('🎉 Stripe Connect onboarding completed successfully!');
    } else {
      console.log('⚠️ Onboarding callback received but account is not fully active yet');
    }
    
    console.log('Redirecting to /admin/settings/payments?onboarding=success'); // TODO ...
    res.redirect('/admin/settings/payments?onboarding=success');
  } catch (error) {
    console.error('❌ Error handling Stripe success callback:', error);
    res.redirect(`/admin/settings/payments?error=${encodeURIComponent(getErrorMessage(error))}`); // TODO...
  }
});

// ---------------------------------------------------------------------------
// Stripe webhook (public, cross-tenant entry point).
//
// This route cannot rely on the host-based tenant-resolution
// middleware in server.ts, because Stripe always calls back our platform
// domain (e.g. ticketuno.fly.dev/api/v1/paymentsStripe/webhook), never to a
// tenant's own domain. So server.ts's middleware must special-case this exact
// path and let it through untouched; tenant resolution happens here, using
// the connected-account id on the event.
// 
// The raw body parser is registered in server.ts for this exactpath BEFORE
// express.json(), so req.body is the raw Buffer Stripe's signature
// verification requires.
//
// NOTE: to trigger a webhook from CLI:
//  - stripe trigger account.updated
//  - stripe trigger checkout.session.completed
//  - stripe trigger payment_intent.succeeded
// ---------------------------------------------------------------------------
router.post('/webhook', async (req: Request, res: Response) => {
  let sig = req.headers['stripe-signature'];
  if (!sig) sig = '';
  if (Array.isArray(sig)) sig = sig[0];

  let event;
  try {
    // console.log('config.stripe.mode:', config.stripe.mode);
    // console.log('config.stripe.stripe.secretKey:', config.stripe.secretKey);
    // console.log('config.stripe.stripe.webhookSecret:', config.stripe.webhookSecret);
    event = paymentStripeService.verifyWebhookEvent(req.body as Buffer, sig);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${getErrorMessage(error)}`);
  }

  // Connect events carry the connected account id at the top level.
  const accountId = (event as { account?: string }).account; // this will be undefined for every checkout.session.completed and payment_intent.succeeded
  let slug: string | null = null;
  if (accountId) {
    // account.updated / account.external_account.updated — genuine Connect events
    slug = tenantRegistry.resolveSlugByStripeAccountId(accountId);
  } else {
    // checkout.session.completed / payment_intent.succeeded — platform events,
    // resolve tenant from metadata stamped at session-creation time.
    const obj = (event.data.object as { metadata?: { tenantSlug?: string } });
    slug = obj.metadata?.tenantSlug ?? null;
  }
  if (!slug) {
    console.error(`Stripe webhook: could not resolve tenant (event ${event.type}, account "${accountId}") — ignoring.`);
    await notify(`⚠️ Stripe webhook ignored — no tenant resolved\nEvent: ${event.type} (${event.id}), Account: ${accountId}`);
    return res.json({ received: true, ignored: true });
  }

  try {
    const db = await tenantDbManager.getTenantDb(slug);
    await runWithTenant({ slug, db }, async () => {
      await paymentStripeService.processWebhookEvent(event);
    });
    res.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook for tenant "${slug}":`, error);
    res.status(500).send(`Webhook processing error: ${getErrorMessage(error)}`);
  }
});

export default router;
