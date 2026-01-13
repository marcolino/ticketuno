import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider/*, createTheme, Theme*/, Theme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material/index';
import { getTheme } from '../themes/default'; // Import from your theme file

interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as PaletteMode) || 'light'; // TODO: use default from config
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode: string) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Use your custom theme from default.ts
  const theme: Theme = getTheme(mode);

  // const theme: Theme = createTheme({
  //   palette: {
  //     mode,
  //     primary: {
  //       main: '#1976d2',
  //     },
  //     secondary: {
  //       main: '#2fc800ff',
  //     },
  //   },
  //   typography: {
  //     fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
  //     h1: {
  //       fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
  //       fontWeight: 600,
  //     },
  //     h2: {
  //       fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
  //       fontWeight: 600,
  //     },
  //     h3: {
  //       fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
  //       fontWeight: 600,
  //     },
  //     h4: {
  //       fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
  //       fontWeight: 600,
  //     },
  //     body1: {
  //       fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
  //     },
  //     button: {
  //       fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
  //       fontWeight: 600,
  //     },
  //   },
  // });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
