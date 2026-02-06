// themes/native/android.ts
import { createTheme, Theme } from '@mui/material/styles';

export const getAndroidTheme = (mode: 'light' | 'dark'): Theme =>
  createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: { main: '#1A73E8' },
            background: {
              default: '#F5F6FA',
              paper: '#FFFFFF',
            },
            text: {
              primary: '#1C1C1E',
              secondary: '#5A5A5F',
            },
          }
        : {
            primary: { main: '#8AB4F8' },
            background: {
              default: '#121318',
              paper: '#1E2026',
            },
            text: {
              primary: '#EAEAF0',
              secondary: '#A1A1AA',
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
    shape: { borderRadius: 20 },
  })
;
