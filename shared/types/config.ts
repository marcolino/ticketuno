export interface AppLanguage {
  name: string;
  flag: string;
}

export interface Currency {
  symbol: string;
  name: string;
}

// TODO: put in some types file, export there and import here...
// type ThemeType = 'native' | 'custom';
// //type Platform = 'android' | 'ios';
// type ThemeMode = 'light' | 'dark';
// type ThemePreference = ThemeMode | 'system';

import { ThemeType, ThemePreference } from './theme';

export interface AppConfig {
  app: {
    codename: string;
    name: string;
    apiHost: string;
    apiBasePath: string;
    apiVersion: string;
    languages: Record<string, AppLanguage>;
    defaultLanguage: string;
    currencies: Record<string, Currency>;
    defaultCurrency: string;
    theme: {
      defaultType: ThemeType;
      defaultMode: ThemePreference;
    };
  };
  server: {
    [key: string]: number;
  };
}
