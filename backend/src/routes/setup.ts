import { Router, Request, Response } from 'express';
import { database } from '../db/database';
import { getErrorMessage } from '@ticketuno/shared';
import { requireAuthentication } from '../middleware/auth';
import { loadSetup, refreshSetup, getSetup } from '../services/setupService';
import { GeneralSetupType, DeepPartial, deepMerge } from '@ticketuno/shared';

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
router.post('/', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const partialUpdate = req.body as DeepPartial<GeneralSetupType>;
    
    // Get current full setup
    const currentSetup = await loadSetup();
    
    // Deep merge the partial update
    const updatedSetup = deepMerge(currentSetup, partialUpdate);
    
    // Save the full merged setup
    await database.saveSetup(updatedSetup);
    
    // Refresh the cache
    await refreshSetup();
    
    res.json({
      message: req.t('Setup saved successfully'),
      setup: getSetup()
    });
  } catch (error) {
    console.error('Error saving setup:', error);
    res.status(500).json({
      error: req.t('Failed to save general setup: {{err}}', {
        err: req.t(getErrorMessage(error))
      })
    });
  }
});

export default router;
