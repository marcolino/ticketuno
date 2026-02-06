import express, { Router, Response } from 'express';
import multer, { StorageEngine } from 'multer';
import { i18n } from '../i18n';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getErrorMessage } from '../utils/errorHandler';

const router: Router = express.Router();

const IMAGES_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_IMAGE_TYPES = ['poster', 'website', 'profile', 'banner', 'thumbnail'];

const storage: StorageEngine = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(IMAGES_DIR, { recursive: true });
      cb(null, IMAGES_DIR);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const imageType = req.body.imageType || 'image';
    cb(null, `${imageType}-${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = {
      mime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      typeNames: ['JPEG', 'PNG', 'WEBP', 'GIF'],
    }
    if (allowed.mime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(i18n.t('Invalid file type. Allowed types are: {{typeNames}}', { typeNames: allowed.typeNames })));
    }
  }
});

// POST /api/images/upload — returns the filename to store on the entity
router.post('/upload', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: req.t('No file uploaded') });
    }
    if (!req.body.imageType || !ALLOWED_IMAGE_TYPES.includes(req.body.imageType)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: req.t('Invalid or missing imageType') });
    }
    res.status(201).json({ filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to upload image: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// DELETE /api/images/:filename — clean up file from disk
router.delete('/:filename', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    await fs.unlink(path.join(IMAGES_DIR, filename)).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to delete image: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;