import { Router } from 'express';
import { database } from '../db/database';
import { getErrorMessage } from '../utils/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
//import config from '../config';

const router = Router();

// Public: Send an email (text / html / mjml / mjml template)
router.get('/', async (req, res) => {
  try {
    const setup = await database.loadSetup();
    res.json(setup);
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to load  setup: {{err}}', { err: req.t(getErrorMessage(error)) }) });
  }
  
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const setup = req.body;
    await database.saveSetup(setup);
    res.json({ message: req.t('Setup saved successfully'), setup });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to save general setup: {{err}}', { err: req.t(getErrorMessage(error)) }) });
  }
});

export default router;
