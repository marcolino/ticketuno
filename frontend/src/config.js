// import { sharedConfig } from '../../shared/config.js';

// // Only the app settings
// export const config = {
//   app: sharedConfig.app,
// };

// export default config;

// // frontend/src/config.js – works with CommonJS shared config
// import shared from '../../shared/config.js';

// const { sharedConfig } = shared;

// export const config = {
//   app: sharedConfig.app,
// };

// export default config;

// // frontend/src/config.js – bulletproof CommonJS import
// import * as shared from '../../shared/config.js';

// const { sharedConfig } = shared;

// export const config = {
//   app: sharedConfig.app,
// };

// export default config;

import sharedConfig from '../../shared/config.json'; // Vite imports JSON natively

export const config = {
  app: sharedConfig.app,
};

export default config;
