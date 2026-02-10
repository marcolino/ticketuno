import { sharedConfig } from '@/shared/config';
import type { CurrencyCode, ThemeType } from '@/shared/config';

// Create a NEW config object with merged values
export const config = {
  ...sharedConfig,
  app: {
    ...sharedConfig.app,
    // Add environment variables to app
    //apiHost: import.meta.env.VITE_API_HOST,
    apiBasePath: import.meta.env.VITE_API_BASE_PATH,
    apiVersion: import.meta.env.VITE_API_VERSION,
  },
} as const;

// Type for type safety
export type Config = typeof config;

export type { CurrencyCode, ThemeType };

// Frontend config values
export default config;
