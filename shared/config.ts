// Define types
export type Platform = ['android', 'ios'];
export type ThemeType = ['native', 'custom'];
export type Mode = ['light', 'dark'];

export const sharedConfig = {
  app: {
    codename: "ticketuno",
    name: "TicketUno",
    apiHost: '', // Set on frontend config only
    apiBasePath: '', // Set on frontend config only
    apiVersion: '', // Set on frontend config only
    languages: {
      en: { name: 'English', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      it: { name: 'Italiano', flag: '🇮🇹' },
      fr: { name: 'Français', flag: '🇫🇷' },
    }, 
    defaultLanguage: 'it',
    currencies: {
      EUR: { symbol: '€', name: 'Euro' },
      USD: { symbol: '$', name: 'US Dollar' },
      GBP: { symbol: '£', name: 'British Pound' },
      JPY: { symbol: '¥', name: 'Japanese Yen' },
    },
    defaultCurrency: 'EUR',
    themeType: 'custom',
  },
  server: {
    delayMilliseconds: 30 * 1000,
  },
} as const;

export type CurrencyCode = keyof typeof sharedConfig.app.currencies;
export type LanguageCode = keyof typeof sharedConfig.app.languages;

export const __test = 123;