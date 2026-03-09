import { createTheme } from '@mui/material/styles';
import { PaletteModeRecord } from '../types/theme';
import { sharedComponentOverrides } from '../sharedComponentOverrides';

export const androidTheme: PaletteModeRecord<ReturnType<typeof createTheme>> = {
  light: createTheme({
    components: {
      ...sharedComponentOverrides,
      // theme-specific overrides here
    },
    typography: {
      fontFamily: '"Open Sans", system-ui, -apple-system, sans-serif',
    },
    palette: {
      mode: 'light',
      primary: { main: '#6750A4' },
      secondary: { main: '#625B71' },
      background: {
        default: '#FFFBFE',
        paper: '#FFFFFF',
      },
    },
    shape: { borderRadius: 16 },
  }),

  dark: createTheme({
    components: {
      ...sharedComponentOverrides,
      // theme-specific overrides here
    },
    typography: {
      fontFamily: '"Open Sans", system-ui, -apple-system, sans-serif',
    },
    palette: {
      mode: 'dark',
      primary: { main: '#D0BCFF' },
      secondary: { main: '#CCC2DC' },
      background: {
        default: '#1C1B1F',
        paper: '#2B2930',
      },
    },
    shape: { borderRadius: 16 },
  }),
};
