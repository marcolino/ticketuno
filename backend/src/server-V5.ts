import fs from 'fs';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { i18n, middleware as i18nextMiddleware } from './i18n';
import userRoutes from './routes/users';
import theaterRoutes from './routes/theaters';
import eventRoutes from './routes/events';
import layoutRoutes from './routes/layouts';
import imageRoutes from './routes/images';
import setupRoutes from './routes/setup';
import { database } from './db/database';
import config from './config';
import pkg from '../package.json';

const apiPrefix = 'api';
const apiVersion = 'v1';
const prefix = `/${apiPrefix}/${apiVersion}`;

const frontendPublicDir = path.join(__dirname, '../../frontend/public');
const frontendDistDir = path.join(__dirname, '../../frontend/dist');

const getMaintenanceFilePath = () => {
  if (process.env.NODE_ENV === 'production') {
    return path.join(frontendDistDir, 'maintenance.html');
  }
  return path.join(frontendPublicDir, 'maintenance.html');
};

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// i18n
app.use(i18nextMiddleware.handle(i18n));
app.use((req: Request, res: Response, next) => {
  res.locals.language = req.language;
  next();
});

// Dev artificial delay
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const delayMs = Number(config.server.delayMilliseconds) || 0;
    if (delayMs) console.log(`Delaying request by ${delayMs}ms...`);
    setTimeout(next, delayMs);
  });
}

// --- Maintenance Middleware ---
app.use((req, res, next) => {
  const maintenanceMode = process.env.MAINTENANCE_MODE === '1';
  const isApi = req.originalUrl.startsWith(`/${apiPrefix}/`);

  if (maintenanceMode) {
    if (isApi) {
      return res.status(503).json({ error: 'Maintenance mode' });
    }

    const maintenanceFile = getMaintenanceFilePath();
    if (fs.existsSync(maintenanceFile)) {
      return res.status(503).sendFile(maintenanceFile);
    }
    return res.status(503).send('<h1>Maintenance Mode</h1><p>Please try again later.</p>');
  }

  next();
});

// --- API Routes ---
app.use(`${prefix}/users`, userRoutes);
app.use(`${prefix}/theaters`, theaterRoutes);
app.use(`${prefix}/layouts`, layoutRoutes);
app.use(`${prefix}/events`, eventRoutes);
app.use(`${prefix}/images`, imageRoutes);
app.use(`${prefix}/setup`, setupRoutes);

// --- Translation files ---
const localesDir = path.join(__dirname, '../..', 'shared', 'locales');
app.get(`${prefix}/locales/:lng/:ns.json`, (req: Request, res: Response) => {
  const { lng, ns } = req.params;
  const filePath = path.join(localesDir, lng, `${ns}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Translation file not found' });
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.sendFile(filePath);
});

// --- Version endpoint ---
app.get(`${prefix}/global/version`, (req, res) => res.json({ version: pkg.version }));

// --- Uploaded images ---
app.use('/uploads', express.static(config.uploads.path));

// --- Global error handler ---
app.use((err: unknown, req: Request, res: Response) => {
  console.error('Global error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: req.t('File too large, maximum size is {{limit}}', { limit: config.uploads.sizeLimit.description }) });
    }
    return res.status(400).json({ error: err.message || req.t('Internal server upload error') });
  }
  if (err instanceof Error) return res.status(500).json({ error: err.message });
  res.status(500).json({ error: req.t('Unknown error') });
});

// --- API 404 ---
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.path, timestamp: new Date().toISOString() });
});

// --- Frontend / SPA / Maintenance ---
if (process.env.NODE_ENV === 'production') {
  // Serve static assets
  app.use(express.static(frontendDistDir, { maxAge: '1y', immutable: true, index: false }));

  // SPA fallback
  app.get('*', (req, res) => {
    const isApi = req.originalUrl.startsWith(`/${apiPrefix}/`);
    if (isApi) return res.status(404).json({ error: 'API route not found' });

    if (process.env.MAINTENANCE_MODE === '1') {
      const maintenanceFile = getMaintenanceFilePath();
      if (fs.existsSync(maintenanceFile)) return res.status(503).sendFile(maintenanceFile);
      return res.status(503).send('<h1>Maintenance Mode</h1><p>Please try again later.</p>');
    }

    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(frontendDistDir, 'index.html'));
  });
} else {
  // Dev: serve maintenance.html for non-API if MAINTENANCE_MODE
  app.get('*', (req, res) => {
    const isApi = req.originalUrl.startsWith(`/${apiPrefix}/`);

    if (process.env.MAINTENANCE_MODE === '1' && !isApi) {
      const maintenanceFile = getMaintenanceFilePath();
      if (fs.existsSync(maintenanceFile)) return res.status(503).sendFile(maintenanceFile);
      return res.status(503).send('<h1>Maintenance Mode</h1><p>Please try again later.</p>');
    }

    if (!isApi) {
      // Redirect non-API dev requests to Vite
      return res.redirect('http://localhost:3000' + req.originalUrl);
    }

    res.status(404).json({ error: 'API route not found' });
  });
}

// --- Start server ---
database.initialize().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT} in ${process.env.NODE_ENV} mode`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
