import i18n from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

i18n
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    preload: ['en', 'it', 'fr'],
    ns: ['translation'],
    defaultNS: 'translation',
    returnEmptyString: false,
    returnNull: false,
    backend: {
      loadPath: path.join(__dirname, '..', '..', 'shared', 'locales', '{{lng}}', '{{ns}}.json'),
      addPath: path.join(__dirname, '..', '..', 'shared', 'locales', '{{lng}}', '{{ns}}.missing.json')
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
