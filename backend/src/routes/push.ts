import { Router, Request, Response } from 'express';
import { database } from '../db/database';
import { requireAuthentication } from '../middleware/auth';
import { AuthRequest } from '../shared/types/auth';

const router = Router();
  
router.get('/vapid-public-key', (req: Request, res: Response) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(500).json({ error: req.t('VAPID not configured') });
  res.json({ vapidPublicKey: key });
});

router.post('/subscribe', requireAuthentication, async (req: AuthRequest, res: Response) => {
  const { endpoint, keys } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: req.t('Invalid subscription payload') });
  }
  await database.upsertPushSubscription(req.userId!, endpoint, keys.p256dh, keys.auth);
  res.status(201).json({ ok: true });
});

router.delete('/subscribe', requireAuthentication, async (req: Request, res: Response) => {
  const { endpoint } = req.body as { endpoint: string };
  if (!endpoint) return res.status(400).json({ error: req.t('Endpoint required') });
  await database.deletePushSubscription(endpoint);
  res.json({ ok: true });
});

export default router;
