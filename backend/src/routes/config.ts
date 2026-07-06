import { Router, Request, Response } from 'express';
import config from '../config';

const router = Router();

// Public: runtime config derived from environment, never persisted, never editable via API
router.get('/', (req: Request, res: Response) => {
  res.json({
    stripeMode: config.stripe.mode,
  });
});

export default router;
