// Protected routes triggered only internally (by GitHub Action, ...)

import { Router, Request, Response } from 'express';
import { runReminderJob } from '../jobs/reminderJob';
import { requireCronAuth } from '../middleware/authCron';

const router = Router();

router.post('/send-reminders', requireCronAuth, async (_req: Request, res: Response) => {

  // Respond immediately Fly.io confirmed alive, job runs async
  // TODO: uncomment below!
  // if (process.env.NODE_ENV === 'production') { // in production runReminderJob coild be sloooow ...
  //   res.json({ ok: true });
  // }

  try {
    const result = await runReminderJob();
    console.log('[internal] Reminder job completed', result);
    res.json({ ok: true, result });
  } catch (err) {
    console.error('[internal] Reminder job failed:', err);
    res.json({ ok: false, err });
  }
});

export default router;
