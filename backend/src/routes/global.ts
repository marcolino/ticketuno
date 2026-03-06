import { Router } from 'express';
import pkg from '../../package.json';

const router = Router();

// Public: get backend version
router.get('/version', async (req, res) => {
  res.json({ version: pkg.version });
});

// Public: get health status
router.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
