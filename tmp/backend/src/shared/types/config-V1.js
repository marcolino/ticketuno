// =======================================
// SHARED STATIC CONFIGURATION – CommonJS
// =======================================

const modes = Object.freeze(['light', 'dark']);
const platforms = Object.freeze(['android', 'ios']);
const themeTypes = Object.freeze(['native', 'custom']);

const sharedConfig = Object.freeze({
  app: {
    codename: "ticketuno",
    name: "TicketUno",
    apiHost: '',
    apiBasePath: '',
    apiVersion: '',
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
  },
  server: {
    delayMilliseconds: 30 * 1000,
  },
});

module.exports = {
  modes,
  platforms,
  themeTypes,
  sharedConfig,
};
