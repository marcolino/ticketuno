import { createTheme } from '@mui/material/styles';
import { PaletteModeRecord } from '../types/theme';
import { sharedComponentOverrides } from '../sharedComponentOverrides';

export const iosTheme: PaletteModeRecord<ReturnType<typeof createTheme>> = {
  light: createTheme({
    components: {
      ...sharedComponentOverrides,
      // theme-specific overrides here
    },
    palette: {
      mode: 'light',
      primary: { main: '#035284' },
      secondary: { main: '#34C759' },
      background: {
        default: '#F2F2F7',
        paper: '#FFFFFF',
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "San Francisco", system-ui',
    },
  }),

  dark: createTheme({
    components: {
      ...sharedComponentOverrides,
      // theme-specific overrides here
    },
    palette: {
      mode: 'dark',
      primary: { main: '#0A84FF' },
      secondary: { main: '#30D158' },
      background: {
        default: '#000000',
        paper: '#1C1C1E',
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "San Francisco", system-ui',
    },
  }),
};
