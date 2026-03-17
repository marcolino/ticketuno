import config from '../config';

export const formatCurrency = (value: number, locale = config.app.defaultLanguage, currency = config.app.defaultCurrency) => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
};
