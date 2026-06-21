import { sharedConfig } from '@ticketuno/shared';
import type { SharedConfig } from '@ticketuno/shared';

const config: Pick<SharedConfig, 'app'> = {
  app: sharedConfig.app,
};

export default config;
