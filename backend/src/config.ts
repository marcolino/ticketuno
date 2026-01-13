import dotenv from 'dotenv';
import path from 'path';

// Load .env
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '..', '.env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    if ('code' in result.error && result.error.code === 'ENOENT') {
      throw new Error('File not found: the .env file is missing at the specified path.');
    } else {
      throw new Error(`An unexpected error occurred: ${result.error.message}`);
    }
  } else {
    console.info('Environment variables loaded successfully:', result.parsed);
  }
}

interface Config {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  dbPath: string;
  adminUser: string;
  adminPassword: string;
}

// Define all environment variables in one place
const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001'),
  jwtSecret: process.env.JWT_SECRET || '',
  dbPath: process.env.DB_PATH || '',
  adminUser: process.env.ADMIN_USER || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
};

// Validation for production
if (config.nodeEnv === 'production') {
  if (config.jwtSecret.includes('change-this-in-production')) {
    throw new Error('JWT_SECRET must be set securely in production');
  }
}

export default config;
