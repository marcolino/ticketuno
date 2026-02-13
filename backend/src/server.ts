import fs from 'fs';
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import { i18n, middleware as i18nextMiddleware } from './i18n';
import { database } from './db/database';
import userRoutes from './routes/users';
import theaterRoutes from './routes/theaters';
import eventRoutes from './routes/events';
import layoutRoutes from './routes/layouts';
import imageRoutes from './routes/images';
import config from '../config';

if (process.env.NODE_ENV !== 'production') {
  // Load .env from the backend root directory
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} else {
  // Hosting provider automatically injects environment
}

const app = express();

app.use(cors());
app.use(express.json());

// Initialize i18n middleware
app.use(i18nextMiddleware.handle(i18n));

// Add middleware to add language to response locals - Must be before routes
app.use((req: any, res: any, next) => {
  // Make current language available in response locals
  res.locals.language = req.language;
  next();
});

const apiPrefix = 'api'; // TODO: to config
const apiVersion = 'v1'; // TODO: to config
const prefix = `/${apiPrefix}/${apiVersion}`;

app.use(`${prefix}/users`, userRoutes);
app.use(`${prefix}/theaters`, theaterRoutes);
app.use(`${prefix}/layouts`, layoutRoutes);
app.use(`${prefix}/events`, eventRoutes);
app.use(`${prefix}/images`, imageRoutes);

// Serve translation files from shared folder (/shared/locales/{lng}/{ns}.json)
const localesDir = path.join(__dirname, '../..', 'shared', 'locales');
// console.log('Current dir:', __dirname); // TODO: debug logging, REMOVEME
// console.log('Locales dir:', localesDir); // TODO: debug logging, REMOVEME
app.get(`${prefix}/locales/:lng/:ns.json`, (req: any, res: any) => {
  const { lng, ns } = req.params;
  const filePath = path.join(localesDir, lng, `${ns}.json`);
  
  //console.log(`Serving locale file: ${lng}/${ns}.json`);
  //console.log(`File path: ${filePath}`);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`Translation file not found: ${filePath}`);
      return res.status(404).json({ error: 'Translation file not found' });
    }
    
    // Set proper content-type
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Send the file
    res.sendFile(filePath, (sendErr: any) => {
      if (sendErr) {
        console.error(`Error sending translation file ${filePath}:`, sendErr);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });
});

// app.use(`${prefix}/locales`, express.static(
//   path.join(__dirname, '../../shared//locales')
// ));

// // Make i18n available in all routes
// declare global {
//   namespace Express {
//     interface Request {
//       t: any;
//       language: string;
//     }
//   }
// }

// // Add middleware to add language to response locals
// app.use((req: any, res: any, next) => {
//   // Make current language available in response locals
//   console.log('*************************************');
//   res.locals.language = req.language;
//   next();
// });

app.get(`${prefix}/health`, (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Example route with translation - TODO: debug only
app.get(`${prefix}/test`, (req: any, res) => {
  // Use req.t for translations in request context
  const message = req.t('hello_world');
  res.json({ message });
});

/**
 * Serve static files (MUST be after API routes)
 */
// Serve public assets
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded images
app.use('/uploads', express.static(config.uploads.path));

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message || 'Internal server upload error'});
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// API 404 handler - MUST be before catch-all
app.use('/api/*', (req, res) => {
  const paramsReal = {...req.params} as { [key: string]: string };
  delete paramsReal[0];
  res.status(404).json({
    error: 'API route not found',
    details: {
      originalUrl: req.originalUrl, // Full URL with query string
      path: req.path, // Path without query string
      url: req.url, // Path with query string
      method: req.method, // GET, POST, etc.
      params: paramsReal, // Route parameters (empty for wildcard)
      query: req.query, // Query parameters
      timestamp: new Date().toISOString(),
    }
  });
});

// Catch-all handler: send React app for any non-API route (MUST be the last)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../public/index.html'));
// });
//
// // AFTER all API routes, add:
if (process.env.NODE_ENV === 'production') { // in production mode
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
} else { // 404 non-API in development mode
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'Use frontend at localhost:3000' }); // TODO: use config
  });
}

// Add artificial delay for all routes (in development only)
if (config.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (config.server.delayMilliseconds) {
      setTimeout(next, config.server.delayMilliseconds);
    }
  });
}

database.initialize().then(() => {
  app.listen(config.env.PORT, () => {
    console.log(`Server running on port ${config.env.PORT} in ${config.env.NODE_ENV} mode`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
