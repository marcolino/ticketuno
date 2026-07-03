// Export config (values)
export { sharedConfig, isDev, isProd, isStaging } from './config';

// Export config types
export type { SharedConfig, CurrencyCode } from './config';

// Export general setup types (with export type)
export type {
  GeneralSetupType,
  GeneralSetupSections,
  PaymentGateway,
  StripeConnectSetup,
  DeepPartial,
} from './types/generalSetup';

// Export the default setup value
export { defaultGeneralSetup } from './types/generalSetup';

// Export everything else
export * from './constants';
export * from './utils';
export * from './types';
