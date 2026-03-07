import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
//import { getCurrentLanguage } from './services/api';

console.log("LANGUAGE 1:", navigator.language);


i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    //lng: localStorage.getItem('i18nextLng') || 'en',
    load: 'languageOnly', // 'it-IT' becomes 'it'
    debug: import.meta.env.MODE === 'development',

    // Behavior for empty/missing:
    returnEmptyString: false, // '' → use key as fallback
    returnNull: false, // null → use key as fallback
    returnObjects: true, // Handle nested objects
  
    // Load from shared folder via API
    backend: {
      loadPath: '/api/v1/locales/{{lng}}/{{ns}}.json', // TODO: /api/v1 ???
      //addPath: '/api/v1/locales/{{lng}}/{{ns}}.missing.json', // For missing translation
      allowMultiLoading: false,
      requestOptions: {
        cache: 'no-cache'
      },
    },

    // Disable missing translation feature
    saveMissing: false,
    
    ns: ['translation'],
    defaultNS: 'translation',
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Sync language with backend
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
  // Optionally send language change to backend
});

export { i18n };
