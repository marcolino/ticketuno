import { Router } from 'express';
//import resend from '../services/emailService';
import emailService from '../services/emailService';
//import { /*verifyConsentToken, verifyMarketingUnsubscribeToken*/ } from '../utils/email';
import { getErrorMessage } from '../utils/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
//import config from '../config';

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
    const response = await emailService.send({
      to,
      subject,
      template,
      variables,
      isMarketing,
    });

    res.json({ message: req.t('Email sent successfully with id {{id}}', {id: response.id}) });
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to send email: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// router.post('/verifyMarketingUnsubscribeToken', async (req, res) => {
//   try {
//     const { token } = req.body;

//     // Validation
//     if (!token) {
//       return res.status(400).json({ error: req.t('Token is not set, it is invaid') });
//     }

//     verifyMarketingUnsubscribeToken(token);

//     res.json({ message: req.t('Token is valid') });
//   } catch (error: unknown) {
//     res.status(500).json({ error: getErrorMessage(error) });
//   }
// });

/*
router.post('/verifyConsentToken/:type', async (req, res) => {
  try {
    const { token } = req.body;
    const { type } = req.params;

    // Validation
    if (!token) {
      return res.status(400).json({ error: req.t('Token is not set, it is invaid') });
    }

    verifyConsentToken(token, type);

    res.json({ message: req.t('Token is valid') });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});
*/

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
