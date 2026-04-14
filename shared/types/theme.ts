export type ThemeType = 'native' | 'custom';

export type Platform = 'android' | 'ios';

export type ThemeMode = 'light' | 'dark';

export type ThemePreference = ThemeMode | 'system';

export interface ThemeContextValue {
  themePreference: ThemePreference;
  setThemePreference: (mode: ThemePreference) => void;
  effectiveMode: ThemeMode;
  themeType: ThemeType;
  platform: Platform;
}