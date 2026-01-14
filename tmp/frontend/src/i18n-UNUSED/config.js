import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

// import enTranslations from './locales/en.json';
// import itTranslations from './locales/it.json';
// import frTranslations from './locales/fr.json';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    // resources: {
    //   en: { translation: enTranslations },
    //   it: { translation: itTranslations },
    //   fr: { translation: frTranslations },
    // },
    lng: 'it', // TODO: set default language from browser
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
  });

export default i18n;
