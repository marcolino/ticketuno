import { createTheme } from '@mui/material/styles';
import { PaletteModeRecord } from '../types/theme';
import { sharedComponentOverrides } from '../sharedComponentOverrides';

export const defaultTheme: PaletteModeRecord<ReturnType<typeof createTheme>> = {
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
      primary: { main: '#1976d2' },
      secondary: { main: '#9c27b0' },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      custom: {
        seat: {
          available: '#4caf50',
          selected: '#2196f3',
          booked: '#f44336',
          unavailable: '#9e9e9e',
        },
        performance: {
          active: '#4caf50',
          canceled: '#f44336',
          upcoming: '#ff9800',
          completed: '#607d8b',
        },
        status: {
          success: '#4caf50',
          warning: '#ff9800',
          error: '#f44336',
          info: '#2196f3',
        },
        light: {
          lightBlue: '#e3f2fd',
          lightGreen: '#e8f5e9',
          lightRed: '#ffebee',
          lightYellow: '#fffde7',
        },
      },
    },
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
      primary: { main: '#90caf9' },
      secondary: { main: '#ce93d8' },
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
      custom: {
        seat: {
          available: '#66bb6a',
          selected: '#42a5f5',
          booked: '#ef5350',
          unavailable: '#bdbdbd',
        },
        performance: {
          active: '#66bb6a',
          canceled: '#ef5350',
          upcoming: '#ffa726',
          completed: '#90a4ae',
        },
        status: {
          success: '#66bb6a',
          warning: '#ffa726',
          error: '#ef5350',
          info: '#42a5f5',
        },
        light: {
          lightBlue: '#0d47a1',
          lightGreen: '#1b5e20',
          lightRed: '#b71c1c',
          lightYellow: '#f57f17',
        },
      },
    },
  }),
};
