import { i18n } from './i18n';
import dotenv from 'dotenv';
import path from 'path';
import { sharedConfig } from './shared/config';

const backendConfig = {
  db: {
    database: 'sqlite',
    path: '../data/ticketuno.db', // DB_PATH=../data/ticketuno.db
  },
  images: {
    path: '../data/images',
    allowedTypes: ['poster', 'website', 'profile', 'banner', 'thumbnail'],
  },
  auth: {
    verificationCode: {
      expirationMinutes: 15 as const,
    },
    resetPasswordCode: {
      expirationMinutes: 15 as const,
    },
    passepartout: 'passaquì,passalà' as const,
    oauth: {
    },
  },
};

// Load .env (in production the provider will inject secrets in environment)
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '..', '.env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    if ('code' in result.error && result.error.code === 'ENOENT') {
      throw new Error(i18n.t('File not found: the .env file is missing at the specified path'));
    } else {
      throw new Error(i18n.t('An unexpected error occurred: {err}}', {err: result.error.message}));
    }
  } else {
    //console.info('Environment variables loaded successfully:', result.parsed);
  }
}

// Load ALL environment variables
const configEnv = Object.keys(process.env).reduce((acc, key) => {
  acc[key] = process.env[key];
  return acc;
}, {} as Record<string, string | undefined>);

// Backend config object
export const config = {
  ...sharedConfig, // Shared values under 'app' key
  ...backendConfig, // Backend values
  env: configEnv as NodeJS.ProcessEnv, // All environment variables
} as const;

// Validation for production
if (config.env.NODE_ENV === 'production') {
  if (!config.env.JWT_SECRET) {
    throw new Error(i18n.t('JWT_SECRET must be set in production') + '!');
  }
  if (config.env.JWT_SECRET.includes('change-this-in-production')) {
    throw new Error(i18n.t('JWT_SECRET must be set to a secure value in production') + '!');
  }
}

// Type for full config
export type Config = typeof config;

// Full config
export default config;
