import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { database } from './db/database';
import userRoutes from './routes/users';
import theaterRoutes from './routes/theaters';
import showRoutes from './routes/shows';
import config from './config';

if (process.env.NODE_ENV !== 'production') {
  // Load .env from the backend root directory
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} else {
  // Hosting provider automatically injects environment
}

const app = express();

app.use(cors());
app.use(express.json());

const apiPrefix = 'api';
const apiVersion = 'v1';
const prefix = `/${apiPrefix}/${apiVersion}`;

app.use(`${prefix}/users`, userRoutes);
app.use(`${prefix}/theaters`, theaterRoutes);
app.use(`${prefix}/shows`, showRoutes);

app.get(`${prefix}/health`, (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Serve static files from React build (MUST be after API routes)
app.use(express.static(path.join(__dirname, '../public')));

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

database.initialize().then(() => {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
