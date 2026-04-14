import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, useMediaQuery } from '@mui/material';
import { native, custom } from '@/theme';
import {
  ThemeType,
  Platform,
  ThemeMode,
  ThemePreference,
  ThemeContextValue,
} from '@/shared/types/theme';
import config from '@/config';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return ctx;
};

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|mac/.test(ua)) return 'ios';
  return 'android';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const platform = detectPlatform();

  /**
   * USER PREFERENCE (light | dark | system)
   */
  const [themePreference, setThemePreference] =
    useState<ThemePreference>(() => {
      const saved = localStorage.getItem('themePreference') as ThemePreference | null;

      if (saved) return saved;

      // first visit → use config default
      return config.app.theme.defaultMode as ThemePreference; // 'system' | 'light' | 'dark'
    });

  useEffect(() => {
    localStorage.setItem('themePreference', themePreference);
  }, [themePreference]);

  /**
   * EFFECTIVE MODE (what MUI actually receives)
   */
  const effectiveMode: ThemeMode =
    themePreference === 'system'
      ? prefersDark
        ? 'dark'
        : 'light'
      : themePreference;

  /**
   * THEME TYPE (native/custom)
   */
  //const themeType: ThemeType = config.app.theme.defaultType as ThemeType;
  const themeType: ThemeType =
  themePreference === 'system' ? 'native' : 'custom';

  const muiTheme = useMemo(() => {
    if (themeType === 'native') {
      return platform === 'ios'
        ? native.iosTheme[effectiveMode]
        : native.androidTheme[effectiveMode];
    }

    return custom.defaultTheme[effectiveMode];
  }, [themeType, platform, effectiveMode]);

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        setThemePreference,
        effectiveMode,
        themeType,
        platform,
      }}
    >
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
