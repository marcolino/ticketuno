const config = {
  //apiUrl: import.meta.env.VITE_API_URL,
  apiHost: import.meta.env.VITE_API_HOST,
  apiBasePath: import.meta.env.VITE_API_BASE_PATH,
  apiVersion: import.meta.env.VITE_API_VERSION,
  defaultLanguage: 'it',
  currencies: {
    EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
    USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
    JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  },
  defaultCurrencyCode: 'EUR',
};

export default config;
