import i18n from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

// hide Locize custom messages
const originalConsoleInfo = console.info;

console.info = function (...args) {
  if (args.join(' ').includes('Locize')) return;
  originalConsoleInfo.apply(console, args);
};

// project root: ticketuno/
const ROOT = path.resolve(__dirname, '../..');

i18n
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    preload: ['en', 'it', 'fr', 'zh'],
    load: 'languageOnly',

    ns: ['common', 'terms', 'privacy'],
    defaultNS: 'common',

    returnEmptyString: false,
    returnNull: false,

    backend: {
      loadPath: (lng: string, ns: string) => {
        const localesFolder =
          ['terms', 'privacy'].includes(ns)
            ? 'locales-static'
            : 'locales';
        const file = path.join(
          ROOT,
          'packages',
          'shared',
          'assets',
          localesFolder,
          lng,
          `${ns}.json`
        );
        return file;
      },

      retries: 0,
    },

    detection: {
      order: ['header', 'querystring', 'cookie'],
      lookupHeader: 'accept-language',
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      caches: ['cookie'],
    },

    saveMissing: false,
  });

console.info = originalConsoleInfo;

export { i18n, middleware };
