const sharedConfig = require('../shared/config.json');
const dotenv = require('dotenv');
const path = require('path');

// Load .env in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

const backendDefaults = {
  db: { database: 'sqlite', path: '../data/ticketuno.db' },
  uploads: { path: '../data/uploads', allowedTypes: ['poster', 'website', 'profile', 'banner', 'thumbnail'] },
  auth: {
    verificationCode: { expirationMinutes: 15 },
    resetPasswordCode: { expirationMinutes: 15 },
    passepartout: 'passaquì,passalà',
    oauth: {},
  },
};

const config = {
  ...sharedConfig,
  ...backendDefaults,
  env: process.env,
};

if (config.env.NODE_ENV === 'production') {
  if (!config.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production!');
  if (config.env.JWT_SECRET.includes('change-this-in-production')) {
    throw new Error('JWT_SECRET must be a secure value in production!');
  }
}

module.exports = config;

// const { sharedConfig } = require('../shared/config.js');
// const dotenv = require('dotenv');
// const path = require('path');

// // Load .env in development
// if (process.env.NODE_ENV !== 'production') {
//   // __dirname is available in CommonJS
//   dotenv.config({ path: path.join(__dirname, '.env') });
// }

// const backendDefaults = {
//   db: {
//     database: 'sqlite',
//     path: '../data/ticketuno.db',
//   },
//   images: {
//     path: '../data/images',
//     allowedTypes: ['poster', 'website', 'profile', 'banner', 'thumbnail'],
//   },
//   auth: {
//     verificationCode: { expirationMinutes: 15 },
//     resetPasswordCode: { expirationMinutes: 15 },
//     passepartout: 'passaquì,passalà',
//     oauth: {},
//   },
// };

// const config = {
//   ...sharedConfig,
//   ...backendDefaults,
//   env: process.env,
// };

// // Production checks
// if (config.env.NODE_ENV === 'production') {
//   if (!config.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production!');
//   if (config.env.JWT_SECRET.includes('change-this-in-production')) {
//     throw new Error('JWT_SECRET must be a secure value in production!');
//   }
// }

// module.exports = config;
