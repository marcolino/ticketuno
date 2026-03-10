import { Router } from 'express';
import { database } from '../db/database';
import { authenticateToken, requireOperator, AuthRequest } from '../middleware/auth';
import { Layout } from '../shared/types/layout';
import { i18n } from '../i18n';
import { getErrorMessage } from '../utils/errorHandler';

const router = Router();

// Protected: create layout (operator only)
router.post('/', authenticateToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const layout = req.body;
    const id = await database.createLayout(layout);
    res.json({ id });
  } catch (error: unknown) {
    res.status(500).json({ error: i18n.t('Failed to create layout: {{err}}', { err: getErrorMessage(error) }) });
  }
});


// Public: get all layouts
router.get('/', authenticateToken, requireOperator, async (req: AuthRequest, res) => {
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
    const layouts = await database.getLayoutsByTheaterId(req.params.theaterId);
    if (!layouts) {
      return res.status(404).json({ error: req.t('No layout found for this theater') });
    }
    res.json(layouts);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to get layouts for this theater: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: update layout by id (operator only)
router.put('/:id', authenticateToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const updates: Partial<Layout> = {
      name: req.body.name,
      description: req.body.description,
      json: req.body.json, // Or JSON.stringify(req.body.json) if frontend sends parsed object
    };
    await database.updateLayout(req.params.id, updates);
    res.sendStatus(204);
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to update layout: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// Protected: delete layout by id (operator only)
router.delete('/:id', authenticateToken, requireOperator, async (req: AuthRequest, res) => {
  try {
    const softDeleted = await database.deleteLayoutSoft(req.params.id);
    if (!softDeleted) {
      res.status(400).json({ message: req.t('Layout could not be deleted') });
    } else {
      res.json({ message: req.t('Layout deleted successfully') });
    }
  } catch (error: unknown) {
    res.status(500).json({ error: req.t('Failed to delete layout: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
