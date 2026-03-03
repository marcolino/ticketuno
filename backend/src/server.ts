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
//import emailRoutes from './routes/emails';
import setupRoutes from './routes/setup';
import { database } from './db/database'; // import database AFTER config
import config from './config';
import pkg from '../package.json';

const apiPrefix = 'api'; // TODO: to config
const apiVersion = 'v1'; // TODO: to config
const prefix = `/${apiPrefix}/${apiVersion}`;

//console.log("+++ CONFIG:", config);
//console.log("+++ ENV:", process.env);

const app = express();

app.use(cors());
app.use(express.json());

// Initialize i18n middleware
app.use(i18nextMiddleware.handle(i18n));

// Add middleware to add language to response locals - Must be before routes
app.use((req: Request, res: Response, next) => {
  // Make current language available in response locals
  res.locals.language = req.language;
  next();
});

app.get(`${prefix}/health`, (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === '1') {
    if (req.accepts('html')) {
      return res.status(503).sendFile(
        path.join(__dirname, '../public/maintenance.html')
      );
    }
    return res.status(503).json({
      error: 'maintenance mode'
    });
  }
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const delayMs = Number(config.server.delayMilliseconds) || 0;
    if (delayMs) {
      console.log(`Delaying request by ${delayMs}ms...`);
    }
    setTimeout(next, delayMs);
  });
}

app.use(`${prefix}/users`, userRoutes);
app.use(`${prefix}/theaters`, theaterRoutes);
app.use(`${prefix}/layouts`, layoutRoutes);
app.use(`${prefix}/events`, eventRoutes);
app.use(`${prefix}/images`, imageRoutes);
//app.use(`${prefix}/emails`, emailRoutes);
app.use(`${prefix}/setup`, setupRoutes);


// Serve translation files from shared folder (/shared/locales/{lng}/{ns}.json)
const localesDir = path.join(__dirname, '../..', 'shared', 'locales');
app.get(`${prefix}/locales/:lng/:ns.json`, (req: Request, res: Response) => {
  const { lng, ns } = req.params;
  const filePath = path.join(localesDir, lng, `${ns}.json`);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`Translation file not found: ${filePath}`);
      return res.status(404).json({ error: 'Translation file not found' });
    }
    
    // Set proper content-type
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Send the file
    res.sendFile(filePath, (sendErr: Error) => {
      if (sendErr) {
        console.error(`Error sending translation file ${filePath}:`, sendErr);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  });
});

app.get(`${prefix}/global/version`, (req, res) => {
  res.json({ version: pkg.version });
});

// // Example route with translation - TODO: debug only
// app.get(`${prefix}/test`, (req: any, res) => {
//   // Use req.t for translations in request context
//   const message = req.t('hello_world');
//   res.json({ message });
// });

/**
 * Serve static files (MUST be after API routes, order matters)
 */
// Serve public assets
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded images
app.use('/uploads', express.static(config.uploads.path));

// Global error handler
app.use(
  (err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Global error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: req.t('File too large, maximum size is {{limit}}', {limit: config.uploads.sizeLimit.description}) });
    }
    return res.status(400).json({ error: err.message || req.t('Internal server upload error')});
  }

  // res.status(err.status || 500).json({
  //   error: err.message || req.t('Internal server error')
  // });
  if (err instanceof Error) {
    return res.status(500).json({ error: err.message });
  }
    
  res.status(500).json({ error: req.t('Unknown error') });
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


/* Serve static public files (MUST be after API routes, error and 404 handlers, order matters) */
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

database.initialize().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT} in ${process.env.NODE_ENV} mode`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
