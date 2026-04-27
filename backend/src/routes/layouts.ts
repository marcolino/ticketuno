import { Router } from 'express';
import { database } from '../db/database';
import { requireAuthentication, requireOperator } from '../middleware/auth';
import { AuthRequest } from '../shared/types/auth';
import { Layout } from '../shared/types/layout';
import { i18n } from '../i18n';
import { getErrorMessage } from '../shared/utils/misc';

const router = Router();

// Protected: create layout (operator only)
router.post('/', requireAuthentication, requireOperator, async (req: AuthRequest, res) => {
  try {
    const layout = req.body;
    const id = await database.createLayout(layout);
    res.json({ id });
  } catch (error: unknown) {
    res.status(500).json({ error: i18n.t('Failed to create layout: {{err}}', { err: getErrorMessage(error) }) });
  }
});


// Public: get all layouts
router.get('/', requireAuthentication, requireOperator, async (req: AuthRequest, res) => {
  try {
    const layouts = await database.getAllLayouts();
    res.json(layouts);
  } catch (error: unknown) {
    res.status(500).json({ error: i18n.t('Failed to get layouts: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Public: get layout by id
router.get('/:id', async (req, res) => {
  try {
    const layout = await database.getLayoutById(req.params.id);
    if (!layout) {
      return res.status(404).json({ error: req.t('Layout not found') });
    }
    res.json(layout);
  } catch (error: unknown) {
    res.status(500).json({ error: i18n.t('Failed to get layout by id: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Public: get layout by theater id
router.get('/:theaterId', async (req, res) => {
  try {
    const layouts = await database.getLayoutByTheaterId(req.params.theaterId);
    if (!layouts) {
      return res.status(404).json({ error: req.t('No layout found for this theater') });
    }
    res.json(layouts);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to get layouts for this theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: update layout by id (operator only)
router.put('/:id', requireAuthentication, requireOperator, async (req: AuthRequest, res) => {
  try {
    const updates: Partial<Layout> = {
      name: req.body.name,
      description: req.body.description,
      json: req.body.json, // Or JSON.stringify(req.body.json) if frontend sends parsed object
    };
    const response = await database.updateLayout(req.params.id, updates);
    res.json(response);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update layout: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: delete layout by id (operator only)
router.delete('/:id', requireAuthentication, requireOperator, async (req: AuthRequest, res) => {
  try {
    res.json(await database.deleteLayout(req.params.id));
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Protected: get layout guard (operator only)
router.get('/:id/guard', requireAuthentication, requireOperator, async (req, res) => {
  try {
    const guard = await database.guardLayout(req.params.id);
    res.json({ safe: guard.safe, blockedBy: guard.bookings });
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

export default router;
