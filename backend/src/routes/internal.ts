// Protected routes triggered only internally (by internal dasboard, or GitHub Action, or ...)

import { Router, Request, Response } from 'express';
import { runReminderJob } from '../jobs/reminderJob';
import { requireCronAuth } from '../middleware/authCron';
import { getErrorMessage } from '@ticketuno/shared';
import { runReleaseExpiredBookingsJob } from '../jobs/releaseExpiredBookingsJob';
// import { requireAuthentication, requireAdmin } from '../middleware/auth';
// import { tenantRegistry } from '../tenancy/tenantRegistry';

const router = Router();

// router.post('/tenants/reload', requireAuthentication, requireAdmin, async (req: Request, res: Response) => {
//   await tenantRegistry.reload();
//   res.json({ slugs: tenantRegistry.getAllSlugs() });
// });

router.post('/send-booking-reminders', requireCronAuth, async (req: Request, res: Response) => {

  // Respond immediately Fly.io confirmed alive, job runs async
  if (process.env.NODE_ENV === 'production') { // in production runReminderJob could be sloooow ...
    res.json({ ok: true });
  }

  try {
    const result = await runReminderJob();
    console.log('[internal] Reminder job completed:', result);
    if (process.env.NODE_ENV !== 'production') {
      res.json({ ok: true, result });
    }
  } catch (error) {
    console.log('[internal] Reminder job not completed:', getErrorMessage(error));
    if (process.env.NODE_ENV !== 'production') {
      res.json({ ok: false, err: error });
    }
  }
});

router.post('/release-expired-bookings', requireCronAuth, async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.json({ ok: true, message: 'Job skipped in production' });
    return;
  }
  try {
    const result = await runReleaseExpiredBookingsJob();
    console.log('[internal] Release expired bookings job completed:', result);
    if (process.env.NODE_ENV !== 'production') {
      res.json({ ok: true, result });
    }
  } catch (error) {
    console.log('[internal] Release expired bookings job not completed:', getErrorMessage(error));
    if (process.env.NODE_ENV !== 'production') {
      res.json({ ok: false, err: error });
    }
  }
});

export default router;
