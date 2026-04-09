import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
//import { getCurrentLanguage } from './services/api';
import config from '@/config';

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
      loadPath: `/${config.app.api.prefix}/${config.app.api.version}/locales/{{lng}}/{{ns}}.json`,
      //addPath: `/${config.app.api.prefix}/${config.app.api.version}/locales/{{lng}}/{{ns}}.missing.json`, // For missing translation
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


/**
 * Get the most probable country from language code (we let user choose a language, not a country)
 * 
 * @param {*} language 
 * @returns 
 */

const getProbableCountryFromLanguage = (language: string): string => {
  const languageToCountryMap: Record<string, string> = {
    en: "US", // English → United States
    fr: "FR", // French → France
    es: "ES", // Spanish → Spain
    de: "DE", // German → Germany
    zh: "CN", // Chinese → China
    ja: "JP", // Japanese → Japan
    ru: "RU", // Russian → Russia
    hi: "IN", // Hindi → India
    pt: "BR", // Portuguese → Brazil
    ar: "SA", // Arabic → Saudi Arabia
    it: "IT", // Italian → Italy
    ko: "KR", // Korean → South Korea
    nl: "NL", // Dutch → Netherlands
    tr: "TR", // Turkish → Turkey
    sv: "SE", // Swedish → Sweden
    no: "NO", // Norwegian → Norway
    da: "DK", // Danish → Denmark
    fi: "FI", // Finnish → Finland
    el: "GR", // Greek → Greece
    pl: "PL", // Polish → Poland
    cs: "CZ", // Czech → Czech Republic
    hu: "HU", // Hungarian → Hungary
    th: "TH", // Thai → Thailand
    vi: "VN", // Vietnamese → Vietnam
    id: "ID", // Indonesian → Indonesia
    ms: "MY", // Malay → Malaysia
    fa: "IR", // Persian (Farsi) → Iran
    he: "IL", // Hebrew → Israel
    uk: "UA", // Ukrainian → Ukraine
    ro: "RO", // Romanian → Romania
    bg: "BG", // Bulgarian → Bulgaria
    sr: "RS", // Serbian → Serbia
    hr: "HR", // Croatian → Croatia
    sk: "SK", // Slovak → Slovakia
    lt: "LT", // Lithuanian → Lithuania
    lv: "LV", // Latvian → Latvia
    et: "EE", // Estonian → Estonia
    bn: "BD", // Bengali → Bangladesh
    ta: "LK", // Tamil → Sri Lanka
    te: "IN", // Telugu → India
    mr: "IN", // Marathi → India
    ur: "PK", // Urdu → Pakistan
    sw: "KE", // Swahili → Kenya
    am: "ET", // Amharic → Ethiopia
  };
  // Use the app's default language as fallback, mapped to a country
  const fallbackLanguage = config.app.defaultLanguage; // e.g., 'it'
  const fallbackCountry = languageToCountryMap[fallbackLanguage] || config.app.defaultLanguage;

  return languageToCountryMap[language] || fallbackCountry;
};

/**
 * Get the most probable phone prefix from language code (we let user choose a language, not a country)
 * 
 * @param {*} language 
 * @returns 
 */
const getProbablePhonePrefixFromLanguage = (language: string): string => {
  const languageToPhonePrefixMap: Record<string, string> = {
    en: "+1",   // English → United States
    fr: "+33",  // French → France
    es: "+34",  // Spanish → Spain
    de: "+49",  // German → Germany
    zh: "+86",  // Chinese → China
    ja: "+81",  // Japanese → Japan
    ru: "+7",   // Russian → Russia
    hi: "+91",  // Hindi → India
    pt: "+55",  // Portuguese → Brazil
    ar: "+966", // Arabic → Saudi Arabia
    it: "+39",  // Italian → Italy
    ko: "+82",  // Korean → South Korea
    nl: "+31",  // Dutch → Netherlands
    tr: "+90",  // Turkish → Turkey
    sv: "+46",  // Swedish → Sweden
    no: "+47",  // Norwegian → Norway
    da: "+45",  // Danish → Denmark
    fi: "+358", // Finnish → Finland
    el: "+30",  // Greek → Greece
    pl: "+48",  // Polish → Poland
    cs: "+420", // Czech → Czech Republic
    hu: "+36",  // Hungarian → Hungary
    th: "+66",  // Thai → Thailand
    vi: "+84",  // Vietnamese → Vietnam
    id: "+62",  // Indonesian → Indonesia
    ms: "+60",  // Malay → Malaysia
    fa: "+98",  // Persian (Farsi) → Iran
    he: "+972", // Hebrew → Israel
    uk: "+380", // Ukrainian → Ukraine
    ro: "+40",  // Romanian → Romania
    bg: "+359", // Bulgarian → Bulgaria
    sr: "+381", // Serbian → Serbia
    hr: "+385", // Croatian → Croatia
    sk: "+421", // Slovak → Slovakia
    lt: "+370", // Lithuanian → Lithuania
    lv: "+371", // Latvian → Latvia
    et: "+372", // Estonian → Estonia
    bn: "+880", // Bengali → Bangladesh
    ta: "+94",  // Tamil → Sri Lanka
    te: "+91",  // Telugu → India
    mr: "+91",  // Marathi → India
    ur: "+92",  // Urdu → Pakistan
    sw: "+254", // Swahili → Kenya
    am: "+251", // Amharic → Ethiopia
  };

  // Use the app's default language as fallback, mapped to a phone prefix
  const fallbackLanguage = config.app.defaultLanguage; // e.g., 'it'
  const fallbackPhonePrefix = languageToPhonePrefixMap[fallbackLanguage] || config.app.defaultPhonePrefix;

  return languageToPhonePrefixMap[language] || fallbackPhonePrefix;
};

export {
  i18n,
  getProbableCountryFromLanguage,
  getProbablePhonePrefixFromLanguage
};
