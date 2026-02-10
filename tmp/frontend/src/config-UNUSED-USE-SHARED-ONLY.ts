// // Define types
// export type ThemeType = 'native' | 'custom';
// export type Platform = 'android' | 'ios';
// export type Mode = 'light' | 'dark';

// // Create the config first, then infer types from it
// const config = {
//   apiHost: import.meta.env.VITE_API_HOST,
//   apiBasePath: import.meta.env.VITE_API_BASE_PATH,
//   apiVersion: import.meta.env.VITE_API_VERSION,
//   languages: {
//     en: { name: 'English', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
//     it: { name: 'Italiano', flag: '🇮🇹' },
//     fr: { name: 'Farançais', flag: '🇫🇷' },
//   } as Record<string, { name: string; flag: string }>, 
//   defaultLanguage: 'it',
//   currencies: {
//     EUR: { symbol: '€', name: 'Euro' },
//     USD: { symbol: '$', name: 'US Dollar' },
//     GBP: { symbol: '£', name: 'British Pound' },
//     JPY: { symbol: '¥', name: 'Japanese Yen' },
//   } as Record<string, { symbol: string; name: string }>, 
//   defaultCurrency: 'EUR' as const,
//   themeType: 'custom',
// };

// // Export types based on the config
// export type Config = typeof config;
// export type LanguageCode = keyof typeof config.languages;
// export type CurrencyCode = keyof typeof config.currencies;

// export default config;