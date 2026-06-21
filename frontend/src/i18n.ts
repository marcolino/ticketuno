import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import config from '@/config';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    load: 'languageOnly',

    debug: false,

    ns: ['common', 'terms', 'privacy'],
    defaultNS: 'common',

    returnEmptyString: false,
    returnNull: false,
    returnObjects: true,

    interpolation: {
      escapeValue: false,
    },

    backend: {
      loadPath: `/${config.app.api.prefix}/${config.app.api.version}/locales/{{lng}}/{{ns}}.json`,
      allowMultiLoading: false,
      requestOptions: {
        cache: 'no-cache',
      },
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    saveMissing: false,

    react: {
      useSuspense: false,
    },
  });

// Persist language
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('i18nextLng', lng);
  } catch {
    // ignore SSR / private mode issues
  }
});

/**
 * Get country from language
 */
const getProbableCountryFromLanguage = (language: string): string => {
  const map: Record<string, string> = {
    en: 'US',
    fr: 'FR',
    es: 'ES',
    de: 'DE',
    zh: 'CN',
    ja: 'JP',
    ru: 'RU',
    hi: 'IN',
    pt: 'BR',
    ar: 'SA',
    it: 'IT',
    ko: 'KR',
    nl: 'NL',
    tr: 'TR',
    sv: 'SE',
    no: 'NO',
    da: 'DK',
    fi: 'FI',
    el: 'GR',
    pl: 'PL',
    cs: 'CZ',
    hu: 'HU',
    th: 'TH',
    vi: 'VN',
    id: 'ID',
    ms: 'MY',
    fa: 'IR',
    he: 'IL',
    uk: 'UA',
    ro: 'RO',
    bg: 'BG',
    sr: 'RS',
    hr: 'HR',
    sk: 'SK',
    lt: 'LT',
    lv: 'LV',
    et: 'EE',
    bn: 'BD',
    ta: 'LK',
    te: 'IN',
    mr: 'IN',
    ur: 'PK',
    sw: 'KE',
    am: 'ET',
  };

  const fallbackLanguage = config.app.defaultLanguage;
  return map[language] || map[fallbackLanguage] || 'IT';
};

/**
 * Get phone prefix from language
 */
const getProbablePhonePrefixFromLanguage = (language: string): string => {
  const map: Record<string, string> = {
    en: '+1',
    fr: '+33',
    es: '+34',
    de: '+49',
    zh: '+86',
    ja: '+81',
    ru: '+7',
    hi: '+91',
    pt: '+55',
    ar: '+966',
    it: '+39',
    ko: '+82',
    nl: '+31',
    tr: '+90',
    sv: '+46',
    no: '+47',
    da: '+45',
    fi: '+358',
    el: '+30',
    pl: '+48',
    cs: '+420',
    hu: '+36',
    th: '+66',
    vi: '+84',
    id: '+62',
    ms: '+60',
    fa: '+98',
    he: '+972',
    uk: '+380',
    ro: '+40',
    bg: '+359',
    sr: '+381',
    hr: '+385',
    sk: '+421',
    lt: '+370',
    lv: '+371',
    et: '+372',
    bn: '+880',
    ta: '+94',
    te: '+91',
    mr: '+91',
    ur: '+92',
    sw: '+254',
    am: '+251',
  };

  const fallbackLanguage = config.app.defaultLanguage;
  return map[language] || map[fallbackLanguage] || config.app.defaultPhonePrefix || '+39';
};

export {
  i18n,
  getProbableCountryFromLanguage,
  getProbablePhonePrefixFromLanguage,
};
