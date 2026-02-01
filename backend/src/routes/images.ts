import express, { Router, Request, Response } from 'express';
import multer, { StorageEngine } from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { ImageMetadata, StoredImage } from '../shared/types/image';
import { database } from '../db/database';
import { getErrorMessage } from '../utils/errorHandler';

const router: Router = express.Router();

// Configure multer for file uploads
const storage: StorageEngine = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/images');
    
    // Ensure directory exists
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      throw new Error(req.t('Failed creating upload directory: {{err}}', { err: getErrorMessage(error) }));
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const imageType = req.body.imageType || 'image';
    cb(null, `${imageType}-${uniqueId}${ext}`);
  }
});

// File filter - only allow images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(req.t('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.')));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit - TODO: to config
  },
  fileFilter: fileFilter
});

/**
 * Get image metadata
 */
router.get("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const image = await database.getImageMetadata(req.params.id);
    res.json(image);
  } catch (error: any) {
    res.status(500).json({ error: req.t('Failed to fetch image metadata: {{err}}', { err: getErrorMessage(error) }) });
  }
});

/**
 * Save image metadata
 */
router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Construct ImageMetadata from request body
    const imageData: ImageMetadata = {
      filename: req.body.filename,
      filepath: req.body.filepath,
      mimetype: req.body.mimetype,
      size: parseInt(req.body.size),
      imageType: req.body.imageType,
    };
    const imageId = await database.saveImageMetadata(imageData);
    res.status(201).json({ id: imageId });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to save image metadata: {{err}}', { err: getErrorMessage(error) }) });
  }
});

/**
 * POST /api/images/upload
 * Upload a new image
 */
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: req.t('No file uploaded') });
    }
    // Save metadata to database
    const imageId = await database.saveImageMetadata({
      filename: req.file.filename,
      filepath: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      imageType: req.body.imageType || 'image',
    });

    // Generate public URL
    const imageUrl = `/api/images/${imageId}`;

    res.status(201).json({
      success: true,
      imageId: imageId,
      imageUrl: imageUrl,
      fileData: {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      }
    });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to upload image: {{err}}', { err: getErrorMessage(error) }) });
  }
});

/**
 * GET /api/images/:imageId
 * Get an image file
 */
router.get('/:imageId', async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    
    // Get image metadata from database
    const image = await database.getImageMetadata(imageId);
    
    if (!image) {
      return res.status(404).json({ error: req.t('Image not found') });
    }

    // Check if file exists
    try {
      await fs.access(image.filepath);
    } catch {
      return res.status(404).json({ error: req.t('Image file not found on disk') });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', image.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Send the file
    res.sendFile(path.resolve(image.filepath));
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to serve image: {{err}}', { err: getErrorMessage(error) }) });
  }
});

/**
 * GET /api/images/:imageId/metadata
 * Get image metadata
 */
router.get('/:imageId/metadata', async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const image = await database.getImageMetadata(imageId);
    
    if (!image) {
      return res.status(404).json({ error: req.t('Image not found') });
    }

    res.json({
      id: imageId,
      filename: image.filename,
      size: image.size,
      mimetype: image.mimetype,
      imageType: image.imageType,
      uploadedAt: image.uploadedAt,
    });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to get image metadata: {{err}}', { err: getErrorMessage(error) }) });
  }
});

/**
 * DELETE /api/images/:imageId
 * Delete an image
 */
router.delete('/:imageId', async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    
    // Delete from database
    await database.deleteImageMetadata(imageId);

    res.json({ success: true, message: req.t('Image deleted successfully') });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to delete image: {{err}}', { err: getErrorMessage(error) }) });
  }
});

export default router;
