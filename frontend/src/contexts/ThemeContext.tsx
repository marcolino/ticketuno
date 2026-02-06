// contexts/ThemeContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline, useMediaQuery } from '@mui/material';

import { native, custom } from '../theme';
import config from '../config';

// TODO: import these types from config
type ThemeType = 'native' | 'custom';
type Platform = 'android' | 'ios';
type Mode = 'light' | 'dark';

interface ThemeContextValue {
  mode: Mode;
  toggleMode: () => void;
  themeType: ThemeType;
  platform: Platform;
}

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

  // ⬇️ MODE is stateful and user-controlled
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem('themeMode') as Mode | null;
    return saved ?? (prefersDark ? 'dark' : 'light');
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleMode = () =>
    setMode((m) => (m === 'light' ? 'dark' : 'light'));

  // themeType can stay config-driven for now
  //const themeType = config.themeType;
  const themeType: ThemeType = config.themeType as ThemeType;
  
  const muiTheme = useMemo(() => {
    if (themeType === 'native') {
      return platform === 'ios'
        ? native.iosTheme[mode]
        : native.androidTheme[mode];
    }

    return custom.defaultTheme[mode];
  }, [themeType, platform, mode]);

  console.log('------------- themeType:', themeType);
  console.log('------------- typeof themeType:', typeof themeType);
  console.log('------------- config.themeType:', config.themeType);
  console.log('------------- typeof config.themeType:', typeof config.themeType);
  
  return (
    <ThemeContext.Provider
      value={{
        mode,
        toggleMode,
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
