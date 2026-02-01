import i18n/*ext*/ from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

i18n/*ext*/
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    preload: ['en', 'it', 'fr'],
    ns: ['translation'],
    defaultNS: 'translation',
    
    // Critical for key fallback:
    returnEmptyString: false,
    returnNull: false,
  
    // backend: {
    //   loadPath: path.join(__dirname, '../shared//locales/{{lng}}/{{ns}}.json'),
    //   addPath: path.join(__dirname, '../shared//locales/{{lng}}/{{ns}}.missing.json')
    // },
    backend: {
      // The __dirname in backend/src/i18n.ts is backend/src
      // So we need to go up one level, then to shared/locales
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
    
    saveMissing: false, //process.env.NODE_ENV === 'development',
    //saveMissingTo: 'all'
  });

export { i18n/*ext*/, middleware };
