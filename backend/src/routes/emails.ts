import { Router } from 'express';
import emailService from '../services/emailService';
import { getErrorMessage } from '../shared/utils/misc';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../shared/types/auth';
import config from '../config';

const router = Router();

// Public: Send an email (text / html / mjml / mjml template)
router.post('/send', authenticateToken, async (req: AuthRequest, res) => {
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

// Public, dev only: Preview email template
router.get('/preview/:template', async (req, res) => {
  const template = req.params.template;
  const to = req.body.to ?? 'marcosolari@gmail.com';
  const subject = req.body.subject ?? 'Preview Subject';
  const variables = {
    appName: config.app.name,
    userName: 'Marco',
    bookingReferenceNumber: 'kjgf345lknf3r934',
    showName: 'La Bisbetica Domata',
    dateOfPerformance: '01/04/2026',
    timeOfPerformance: '20:30',
    theaterName: 'Il Teatro Regio di Torino',
    seatNumber: 'Platea-12-C',
    totalPaidAmount: '50€',
    theaterPhone: '+39 333 6480983',
    linkToTermsAndConditions: 'https://ticketuno.fly.dev/terms-and-conditions', // TODO...

  }; // TODO: these variables depend on template...
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
      default: // TODO: handle all cases ...
        console.warn('Unforeseen event type:', event.type, event.data.email_id);
    }
    
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end();
  }
});

export default router;
