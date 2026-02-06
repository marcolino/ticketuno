// themes/native/ios.ts
import { createTheme, Theme } from '@mui/material/styles';

export const getIOSTheme = (mode: 'light' | 'dark'): Theme =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#007AFF' },
      ...(mode === 'light'
        ? {
            background: {
              default: '#F2F2F7',
              paper: '#FFFFFF',
            },
            text: {
              primary: '#000',
              secondary: '#6D6D72',
            },
          }
        : {
            background: {
              default: '#000000',
              paper: '#1C1C1E',
            },
            text: {
              primary: '#FFFFFF',
              secondary: '#98989D',
            },
          }),
    },
    typography: {
      fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
      h1: {
        fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
        fontWeight: 700,
      },
      h2: {
        fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
        fontWeight: 600,
      },
      h3: {
        fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
        fontWeight: 500,
      },
      h4: {
        fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
        fontWeight: 500,
      },
      body1: {
        fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
        fontWeight: 500,
      },
      button: {
        fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
        fontWeight: 500,
      },
    },
    shape: { borderRadius: 12 },
    shadows: ['none', ...Array(24).fill('none')],
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    },
  })
;
