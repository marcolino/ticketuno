import { i18next } from './i18n';
import dotenv from 'dotenv';
import path from 'path';

// Load .env (in production the provider will inject secrets in environment)
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '..', '.env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    if ('code' in result.error && result.error.code === 'ENOENT') {
      throw new Error(i18next.t('File not found: the .env file is missing at the specified path'));
    } else {
      throw new Error(i18next.t('An unexpected error occurred: {err}}', {err: result.error.message}));
    }
  } else {
    console.info('Environment variables loaded successfully:', result.parsed);
  }
}

interface Config {
  app: {
    codename: string;
    fullname: string;
    auth: {
      verificationCode: {
        expirationMinutes: number;
      };
      passepartout: string;
    };
  };
  server: {
    delayMilliseconds: number;
  },
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  dbPath: string;
  adminUser: string;
  adminPassword: string;
}

// Define all environment variables in one place
const config = {
  app: {
    codename: "ticketuno" as const,
    fullname: "TicketUno" as const,
    auth: {
      verificationCode: {
        expirationMinutes: 15 as const,
      },
      passwordResetCode: {
        expirationMinutes: 15 as const,
      },
      passepartout: "passaquì,passalà",
      oauth: {
        
      },
    }
  },
  server: {
    delayMilliseconds: 3000 as const,
  },
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001'),
  jwtSecret: process.env.JWT_SECRET || '',
  dbPath: process.env.DB_PATH || '',
  adminUser: process.env.ADMIN_USER || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
};

// Validation for production
if (config.nodeEnv === 'production') {
  if (!config.jwtSecret) {
    throw new Error(i18next.t('JWT_SECRET must be set in production') + '!');
  }
  if (config.jwtSecret.includes('change-this-in-production')) {
    throw new Error(i18next.t('JWT_SECRET must be set securely in production') + '!');
  }
}

export default config;
