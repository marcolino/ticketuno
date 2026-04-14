import { Router, Response } from 'express';
import { requireAuthentication, requireOperator } from '../middleware/auth';
import { AuthRequest } from '../shared/types/auth';
import { User } from '../shared/types/user';
import { sendBulkEmail, BulkEmailPayload, BulkEmailRecipient } from '../services/emailServiceBulk';
import { getErrorMessage } from '../shared/utils/misc';
import { i18n } from '../i18n';
import { database } from '../db/database';

const router = Router();

//
// Accepts either:
//   (a) an explicit `recipients` array (frontend sends full objects), or
//   (b) a `userIds` array — the backend fetches user data itself.
//
// Body shape:
//   { recipients?: BulkEmailRecipient[], userIds?: string[], subject: string, body: string }

router.post('/bulk', requireAuthentication, requireOperator, async (req: AuthRequest, res: Response) => {
  try {
    const { recipients, userIds, subject, body } = req.body as {
      recipients?: BulkEmailRecipient[];
      userIds?: string[];
      subject: string;
      body: string;
    };

    // ── Validation ──────────────────────────────────────────────────────────
    if (!subject?.trim()) {
      return res.status(400).json({ error: i18n.t('Subject is required') });
    }
    if (!body?.trim()) {
      return res.status(400).json({ error: i18n.t('Body is required') });
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
      return res.status(400).json({ error: i18n.t('Provide recipients or userIds') });
    }

    if (resolvedRecipients.length === 0) {
      return res.status(400).json({ error: i18n.t('No valid recipients found') });
    }

    const payload: BulkEmailPayload = {
      recipients: resolvedRecipients,
      subject,
      body,
    };

    const result = await sendBulkEmail(payload);

    return res.status(200).json({
      message: i18n.t('Sent {{count}} / {{total}} emails', {count: result.sent, total: result.total }),
      ...result,
    });
  } catch (error) {
    return res.status(500).json({ error: getErrorMessage(error) });
  }
});

export default router;
