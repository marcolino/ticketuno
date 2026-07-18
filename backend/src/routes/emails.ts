import { Router, Request, Response } from 'express';
import { requireAuthentication, requireOperator } from '../middleware/auth';
import { User } from '@ticketuno/shared';
import emailService from '../services/emailService';
import { getErrorMessage } from '@ticketuno/shared';
import { sendBulkEmail, BulkEmailPayload, BulkEmailRecipient } from '../services/emailBulkService';
import { database } from '../db/database';
import config from '../config';

const router = Router();

// Public: Send an email (text / html / mjml / mjml template)
router.post('/send', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const { to, subject, template, variables, isMarketing } = req.body;

    // Validation
    if (!to || !subject) {
      return res.status(400).json({ error: req.t('Recipient and subject are required to send an email') });
    }

    // Send the email via email service
    await emailService.send({
      to,
      subject,
      template,
      variables,
      isMarketing,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to send email: {{err}}', { err: getErrorMessage(error) }) });
  }
});

//
// Accepts either:
//   (a) an explicit `recipients` array (frontend sends full objects), or
//   (b) a `userIds` array — the backend fetches user data itself.
//
// Body shape:
//   { recipients?: BulkEmailRecipient[], userIds?: string[], subject: string, body: string }
router.post('/bulk', requireAuthentication, requireOperator, async (req: Request, res: Response) => {
  try {
    const { recipients, userIds, subject, body } = req.body as {
      recipients?: BulkEmailRecipient[];
      userIds?: string[];
      subject: string;
      body: string;
    };

    // ── Validation ──────────────────────────────────────────────────────────
    if (!subject?.trim()) {
      return res.status(400).json({ error: req.t('Subject is required') });
    }
    if (!body?.trim()) {
      return res.status(400).json({ error: req.t('Body is required') });
    }

    let resolvedRecipients: BulkEmailRecipient[] = [];

    if (recipients && recipients.length > 0) {
      resolvedRecipients = recipients;
    } else if (userIds && userIds.length > 0) {
      // Fetch users from DB — adjust to your actual database method
      const users = await database.getUsersByIds(userIds);
      resolvedRecipients = users.map((u: User) => ({
        id: u.id,
        name: u.firstName ?? '',
        surname: u.lastName  ?? '',
        email: u.email,
        // extend as needed
      }));
    } else {
      return res.status(400).json({ error: req.t('Provide recipients or userIds') });
    }

    if (resolvedRecipients.length === 0) {
      return res.status(400).json({ error: req.t('No valid recipients found') });
    }

    const payload: BulkEmailPayload = {
      recipients: resolvedRecipients,
      subject,
      body,
    };

    const result = await sendBulkEmail(payload);

    return res.status(200).json({
      message: req.t('Sent {{count}} / {{total}} emails', {count: result.sent, total: result.total }),
      ...result,
    });
  } catch (error) {
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Public, dev only: Preview email template
router.get('/preview/:template', async (req, res) => {
  const template = req.params.template;
  const to = req.body.to ?? 'marcosolari@gmail.com';
  const subject = req.body.subject ?? 'Preview Subject';
  const variables = {
    appName: config.app.name,
    linkToTermsAndConditions: config.email.linkToTermsAndConditions,
  };
  const lang = req.body.lang ?? 'it';
  const text = 'Please view this email in HTML format.';
  const html = '';
  const isMarketing = false;
  const options = {
    to,
    template,
    subject,
    variables,
    lang,
    text,
    html,
    isMarketing,
  };
  const payload = await emailService.prepare(options);

  res.send(payload.html ?? payload.text);
});

router.post('/webhook/resend', async (req, res) => {
  try {
    const event = req.body;

    console.log('Resend webhook event:', event.type);

    switch (event.type) {
      case 'email.delivered':
        console.log('Delivered:', event.data.email_id);
        break;
      case 'email.bounced':
        console.warn('Bounced:', event.data.email_id);
        break;
      default:
        console.warn('Unforeseen event type:', event.type, event.data.email_id);
    }
    
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end();
  }
});

export default router;
