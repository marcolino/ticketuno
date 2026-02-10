import { i18n } from './i18n';
import dotenv from 'dotenv';
import path from 'path';
import { sharedConfig } from './shared/config';

const backendConfig = {
  auth: {
    verificationCode: {
      expirationMinutes: 15 as const,
    },
    resetPasswordCode: {
      expirationMinutes: 15 as const,
    },
    passepartout: "passaquì,passalà" as const,
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


// interface Config {
//   app: {
//     codename: string;
//     fullname: string;
//     auth: {
//       verificationCode: {
//         expirationMinutes: number;
//       };
//       passepartout: string;
//     };
//     defaultCurrency: string;
//   };
//   server: {
//     delayMilliseconds: number;
//   },
//   nodeEnv: string;
//   port: number;
//   jwtSecret: string;
//   dbPath: string;
//   adminUserEmail: string;
//   adminPassword: string;
// }

// // Define all environment variables in one place
// const config = {
//   app: {
//     codename: "ticketuno" as const,
//     fullname: "TicketUno" as const,
//     auth: {
//       verificationCode: {
//         expirationMinutes: 15 as const,
//       },
//       resetPasswordCode: {
//         expirationMinutes: 15 as const,
//       },
//       passepartout: "passaquì,passalà",
//       oauth: {
//       },
//     },
//     defaultCurrency: 'EUR' as const, // TODO: align with same variable on frontend...
//   },
//   server: {
//     delayMilliseconds: 3000 as const,
//   },
//   nodeEnv: process.env.NODE_ENV || 'development',
//   port: parseInt(process.env.PORT || '3001'),
//   jwtSecret: process.env.JWT_SECRET || '',
//   dbPath: process.env.DB_PATH || '',
//   adminUserEmail: process.env.ADMIN_USER_EMAIL || '',
//   adminPassword: process.env.ADMIN_PASSWORD || '',
// };
