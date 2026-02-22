import sharedConfig from '@/shared/config';
import type { AppConfig } from '@/shared/types/config';

const config: Pick<AppConfig, 'app'> = {
  app: sharedConfig.app,
};

export default config;
