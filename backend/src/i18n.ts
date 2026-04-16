import i18n from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

i18n
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    preload: ['en', 'it', 'fr', 'zh'],
    load: 'languageOnly', // 'it-IT' becomes 'it'
    ns: ['common', 'terms', 'privacy'],
    defaultNS: 'common',
    returnEmptyString: false,
    returnNull: false,
    backend: {
      loadPath: (lng: string, ns: string) => {
        const staticNs = ['terms', 'privacy'];
        const base = staticNs.includes(ns) ? 'locales-static' : 'locales';
        return path.join(__dirname, '..', '..', 'shared', base, lng, ns, '.json');
      },
      retries: 0, // Stop retrying on failure
    },
    detection: {
      order: ['header', 'querystring', 'cookie'],
      lookupHeader: 'accept-language',
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      caches: ['cookie']
    },
    saveMissing: false,
  });

export { i18n, middleware };
