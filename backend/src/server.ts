import fs from 'fs';
import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { i18n, middleware as i18nextMiddleware } from './i18n';
import globalRoutes from './routes/global';
import userRoutes from './routes/users';
import guardRoutes from './routes/guards';
import bookingRoutes from './routes/bookings';
import theaterRoutes from './routes/theaters';
import eventRoutes from './routes/events';
import layoutRoutes from './routes/layouts';
import imageRoutes from './routes/images';
import ticketRoutes from './routes/tickets';
import emailRoutes from './routes/emails';
import setupRoutes from './routes/setup';
import configRoutes from './routes/config';
import pushRoutes from './routes/push';
import paymentsStripeRoutes from './routes/paymentsStripe';
import internalRoutes from './routes/internal';
import { tenantRegistry } from './tenancy/tenantRegistry';
import { tenantDbManager } from './tenancy/tenantDbManager';
import { runWithTenant } from './tenancy/tenantContext';
//import { database } from './db/database';
import { loadSetup } from './services/setupService';
import config from './config';

const prefix = `/${config.app.api.prefix}/${config.app.api.version}`;
const rootDir = path.join(__dirname, '../..');
const localesDir = path.join(rootDir, 'packages', 'shared', 'assets', 'locales');
const localesStaticDir = path.join(rootDir, 'packages', 'shared', 'assets', 'locales-static');

const app = express();

app.use(cors());

/**
 * This route (must be registered before the tenant-resolution middleware)
 */
app.post('/internal/tenants/reload', express.json(), async (req, res) => {
  const token = req.headers['x-internal-admin-token'];
  if (!config.internal.adminToken || token !== config.internal.adminToken) {
    return res.status(404).end(); // 404, not 401 — don't reveal the route exists
  }
  try {
    await tenantRegistry.reload();
    res.json({ slugs: tenantRegistry.getAllSlugs() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'reload failed' });
  }
});

/**
 * Tenant resolution (must be registered before DB initialization)
 */
app.use(async (req, res, next) => {
  if (req.path === `${prefix}/paymentsStripe/webhook`) {
    // Resolved inside the webhook handler itself via Stripe account id
    return next();
  }

  const rawHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  const hostname = rawHost.split(':')[0].toLowerCase() + (rawHost.includes(':') && process.env.NODE_ENV === 'development' ? `:${rawHost.split(':')[1]}` : '');

  const slug = tenantRegistry.resolveSlugByDomain(rawHost.toLowerCase()) ?? tenantRegistry.resolveSlugByDomain(hostname);
  if (!slug) {
    return res.status(404).json({ error: 'Unknown tenant domain', domain: rawHost });
  }

  try {
    const db = await tenantDbManager.getTenantDb(slug);
    runWithTenant({ slug, db }, () => next());
  } catch (err) {
    next(err);
  }
});

/**
 * Stripe webhook signature verification needs the raw request body, so the raw
 * parser MUST be registered for this exact path BEFORE express.json() consumes it.
 */
app.use(`${prefix}/paymentsStripe/webhook`, express.raw({ type: 'application/json' }));

app.use(express.json());

// Initialize i18n middleware
app.use(i18nextMiddleware.handle(i18n) as unknown as RequestHandler);

// Add middleware to add language to response locals - Must be before routes
app.use((req: Request, res: Response, next) => {
  // Make current language available in response locals
  res.locals.language = req.language;
  next();
});

// Serve translation files from shared folder (/shared/locales/{lng}/{ns}.json)
app.get(`${prefix}/locales/:lng/:ns.json`, (req: Request, res: Response) => {
  const { lng, ns } = req.params;
  const staticNS = ['terms', 'privacy'];
  const dir = staticNS.includes(ns) ? localesStaticDir : localesDir;
  const filePath = path.join(dir, lng, `${ns}.json`);
  
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

if (process.env.NODE_ENV === 'development') {
  app.use((_req, _res, next) => {
    const delayMs = Number(config.server.delayMilliseconds) || 0;
    if (delayMs) {
      console.log(`Delaying request by ${delayMs}ms...`);
    }
    setTimeout(next, delayMs);
  });
}

// Maintenance mode - MUST be before API 404 handler and before other routes
app.use('/api/*', (_req, res, next) => {
  if (process.env.MAINTENANCE_MODE === '1') {
    return res.status(503).json({ error: 'maintenance mode' });
  }
  next();
});

app.use(`${prefix}/`, globalRoutes);
app.use(`${prefix}/users`, userRoutes);
app.use(`${prefix}/guards`, guardRoutes);
app.use(`${prefix}/bookings`, bookingRoutes);
app.use(`${prefix}/theaters`, theaterRoutes);
app.use(`${prefix}/layouts`, layoutRoutes);
app.use(`${prefix}/events`, eventRoutes);
app.use(`${prefix}/images`, imageRoutes);
app.use(`${prefix}/tickets`, ticketRoutes);
app.use(`${prefix}/emails`, emailRoutes);
app.use(`${prefix}/setup`, setupRoutes);
app.use(`${prefix}/config`, configRoutes);
app.use(`${prefix}/push`, pushRoutes);
app.use(`${prefix}/paymentsStripe`, paymentsStripeRoutes);
app.use(`${prefix}/internal`, internalRoutes);

// Serve uploaded images (per-tenant directory, resolved per request — NOT
// evaluated once at boot like a bare express.static(config.uploads.path) would be).
const uploadsStaticHandlers = new Map<string, RequestHandler>();

app.use('/uploads', (req: Request, res: Response, next) => {
  const dir = config.uploads.path; // tenant-aware getter — correct value for THIS request
  let handler = uploadsStaticHandlers.get(dir);
  if (!handler) {
    handler = express.static(dir);
    uploadsStaticHandlers.set(dir, handler);
  }
  handler(req, res, next);
});
// Serve uploaded images
//app.use('/uploads', express.static(config.uploads.path));

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
if (process.env.NODE_ENV !== 'development') {
  const publicDir = path.join(rootDir, 'public');
  // Cache hashed assets for a long time
  app.use(express.static(publicDir, {
    maxAge: '1y',
    immutable: true,
    index: false
  }));

  // Never cache index.html
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else { // 404 non-API in development mode
  app.get('*', (_req, res) => {
    res.status(404).json({ error: `Use frontend at ${config.host.dev.name}:${config.host.dev.port}` });
  });
}

async function start() {
  await tenantRegistry.load();
  await tenantDbManager.initializeAllTenants(); // runs migrations + seeds admin/operator for every tenant

  // Call loadSetup() once per tenant
  for (const slug of tenantRegistry.getAllSlugs()) {
    await runWithTenant({ slug, db: (await tenantDbManager.getTenantDb(slug)) }, loadSetup);
  }
  app.listen(process.env.PORT ?? config.host.dev.port, () => {
    console.log(`Server running on port ${process.env.PORT ?? config.host.dev.port} in ${process.env.NODE_ENV} mode`);
    if (process.env.MAINTENANCE_MODE === '1') {
      console.log('MAINTENANCE MODE');
    }
  });
}

start().catch(err => {
  console.error('Failed to initialize server:', err);
  process.exit(1);
});

// database.initialize().then(async () => {
//   await loadSetup();
//   app.listen(process.env.PORT ?? config.host.dev.port, () => {
//     console.log(`Server running on port ${process.env.PORT ?? config.host.dev.port} in ${process.env.NODE_ENV} mode`);
//     if (process.env.MAINTENANCE_MODE === '1') {
//       console.log('MAINTENANCE MODE');
//     }
//   });
// }).catch(err => {
//   console.error('Failed to initialize database:', err);
//   process.exit(1);
// });
