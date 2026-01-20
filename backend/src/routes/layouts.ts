import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { database } from "../db/database";
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { i18n } from '../i18n';

const router = Router();

// Protected: create layout (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  const id = uuidv4();
  const layout = req.body;
  await database.createLayout(layout);
  res.json({ id });
});


// Public: get all layouts
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const layouts = await database.getAllLayouts();
    res.json(layouts);
  } catch (error: any) {
    res.status(500).json({ error: i18n.t('Failed to fetch layouts: {{err}}', { err: (error as any).message }) });
  }
});

// Public: get layout by id
router.get("/:id", async (req, res) => {
  const layout = await database.getLayoutById(req.params.id);
  if (!layout) return res.sendStatus(404);
  res.json(layout);
});

// Protected: update layout by id (admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  await database.updateLayout(req.params.id, req.body.name, req.body.description, req.body.json/*JSON.stringify(req.body)*/); // TODO: and name and des ?
  res.sendStatus(204);
});

// Protected: delete layout by id (admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  await database.deleteLayout(req.params.id);
  res.json({ message: 'Layout deleted successfully' });
});

export default router;
