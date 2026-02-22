import type { AppConfig } from './types/config';

const config: AppConfig = {
  app: {
    codename: 'ticketuno',
    name: 'TicketUno',
    apiHost: '',
    apiBasePath: '',
    apiVersion: '',
    languages: {
      en: { name: 'English', flag: '🇬🇧' },
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
    theme: {
      defaultType: 'native',
      defaultMode: 'system', // system / light / dark
    }
  },
  server: {
    //delayMilliseconds: 3 * 1000,
  },
};

export default config;

// {
//   "app": {
//     "codename": "ticketuno",
//     "name": "TicketUno",
//     "apiHost": "",
//     "apiBasePath": "",
//     "apiVersion": "",
//     "languages": {
//       "en": { "name": "English", "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
//       "it": { "name": "Italiano", "flag": "🇮🇹" },
//       "fr": { "name": "Français", "flag": "🇫🇷" }
//     },
//     "defaultLanguage": "it",
//     "currencies": {
//       "EUR": { "symbol": "€", "name": "Euro" },
//       "USD": { "symbol": "$", "name": "US Dollar" },
//       "GBP": { "symbol": "£", "name": "British Pound" },
//       "JPY": { "symbol": "¥", "name": "Japanese Yen" }
//     },
//     "defaultCurrency": "EUR"
//   },
//   "server": {
//     "delayMilliseconds.DISABLED": 0
//   }
// }
