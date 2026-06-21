import express, { Router, Request, Response } from 'express';
import multer/*, { StorageEngine }*/ from 'multer';
import { i18n } from '../i18n';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import { requireAuthentication } from '../middleware/auth';
import { getErrorMessage } from '@ticketuno/shared';
import config from '../config';

const router: Router = express.Router();

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(config.uploads.path, { recursive: true });
      cb(null, config.uploads.path);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    // no imageType here, provisionally save without imageType prefix
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.uploads.sizeLimit.value },
  fileFilter: (_req, file, cb) => {
    const allowed = {
      mime: config.uploads.allowedMimeTypes,
      typeNames: config.uploads.allowedMimeNames,
    }
    if (allowed.mime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(i18n.t('Invalid file type. Allowed types are: {{typeNames}}', { typeNames: allowed.typeNames })));
    }
  }
});

// POST /api/images/upload — returns the filename to store on the entity
router.post('/upload', requireAuthentication, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: req.t('No file uploaded') });
    }
    const imageType = req.body.imageType;
    if (!imageType || !config.uploads.allowedTypes.includes(imageType)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: req.t('Invalid or missing imageType') });
    }
    // rename with imageType prefix
    const newFilename = `${imageType}-${req.file.filename}`;
    const newPath = path.join(config.uploads.path, newFilename);
    await fs.rename(req.file.path, newPath);
    res.status(201).json({ filename: newFilename });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to upload image: {{err}}', { err: getErrorMessage(error) }) });
  }
});

// DELETE /api/images/:filename — clean up file from disk
router.delete('/:filename', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    await fs.unlink(path.join(config.uploads.path, filename)).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to delete image: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;