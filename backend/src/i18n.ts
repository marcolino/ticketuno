import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    preload: ['en', 'it', 'fr'],
    ns: ['translation'],
    defaultNS: 'translation',
    
    backend: {
      loadPath: path.join(__dirname, '../../../shared/locales/{{lng}}/{{ns}}.json'),
      addPath: path.join(__dirname, '../../../shared/locales/{{lng}}/{{ns}}.missing.json')
    },
    
    detection: {
      order: ['header', 'querystring', 'cookie'],
      lookupHeader: 'accept-language',
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      caches: ['cookie']
    },
    
    saveMissing: false, //process.env.NODE_ENV === 'development',
    //saveMissingTo: 'all'
  });

export { i18next, middleware };
