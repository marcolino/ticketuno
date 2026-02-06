// contexts/ThemeContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

import { getTheme as getCustomTheme } from '../themes/default';
import { getNativeTheme } from '../themes/native';
import { getSystemPaletteMode } from '../utils/colorScheme';
import config from '../config';

interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext);
  //if (!ctx) throw new Error('useThemeMode must be used within ThemeProvider');
  if (!ctx) {
    if (import.meta.env.MODE !== 'production') {
      console.warn(
        'useThemeMode called outside ThemeProvider (likely during Fast Refresh while developing)'
      );
    }

    // Fallback to avoid crash
    return {
      mode: 'light' as PaletteMode,
      toggleTheme: () => {},
    };
  }
  return ctx;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('themeMode') as PaletteMode | null;
    return saved ?? getSystemPaletteMode();
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () =>
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));

  const theme: Theme =
    config.themeType === 'native'
      ? getNativeTheme(mode)
      : getCustomTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
