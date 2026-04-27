import { Router } from 'express';
import { database } from '../db/database';
import { getErrorMessage } from '../shared/utils/misc';
import { requireAuthentication } from '../middleware/auth';
import { AuthRequest } from '../shared/types/auth';
import { loadSetup, refreshSetup, getSetup } from '../services/setupService';

const router = Router();

// Public: Get setup
router.get('/', async (req, res) => {
  try {
    const setup = await loadSetup(); // Use service
    res.json(setup);
  } catch (error) {
    res.status(500).json({
      error: req.t('Failed to load setup: {{err}}', { err: req.t(getErrorMessage(error)) })
    });
  }
});

// Private: Update setup
router.post('/', requireAuthentication, async (req: AuthRequest, res) => {
  try {
    const setup = req.body;
    await database.saveSetup(setup);
    await refreshSetup(); // Keep backend in sync
    res.json({ message: req.t('Setup saved successfully'), setup: getSetup() });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to save general setup: {{err}}', { err: req.t(getErrorMessage(error)) }) });
  }
});

export default router;
