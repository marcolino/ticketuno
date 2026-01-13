import { createTheme, Theme } from '@mui/material/styles';
import { BasePaletteMode, CustomPaletteMode, PaletteMode, PaletteModeRecord } from '../types/theme';

// Declare custom palette types
declare module '@mui/material/styles' {
  interface Palette extends CustomPaletteMode {}
  interface PaletteOptions extends Partial<CustomPaletteMode> {}
}

// Define with proper typing using the PaletteModeRecord type
const muiDefaultPalette: PaletteModeRecord<BasePaletteMode> = {
  light: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#27b039',
      light: '#31df48ff',
      dark: '#009314ff',
      contrastText: '#fff',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
      contrastText: '#fff',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
      contrastText: '#fff',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
      contrastText: '#fff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#fff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    background: {
      default: '#fafafa',
      paper: '#fff',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: 'rgba(0, 0, 0, 0.04)',
      hoverOpacity: 0.04,
      selected: 'rgba(0, 0, 0, 0.08)',
      selectedOpacity: 0.08,
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
      disabledOpacity: 0.38,
      focus: 'rgba(0, 0, 0, 0.12)',
      focusOpacity: 0.12,
      activatedOpacity: 0.12,
    },
  },
  dark: {
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    secondary: {
      main: '#ce93d8',
      light: '#f3e5f5',
      dark: '#ab47bc',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
      contrastText: '#fff',
    },
    warning: {
      main: '#ffa726',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    info: {
      main: '#29b6f6',
      light: '#4fc3f7',
      dark: '#0288d1',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    success: {
      main: '#66bb6a',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    text: {
      primary: '#fff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      active: '#fff',
      hover: 'rgba(255, 255, 255, 0.08)',
      hoverOpacity: 0.08,
      selected: 'rgba(255, 255, 255, 0.16)',
      selectedOpacity: 0.16,
      disabled: 'rgba(255, 255, 255, 0.3)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
      disabledOpacity: 0.38,
      focus: 'rgba(255, 255, 255, 0.12)',
      focusOpacity: 0.12,
      activatedOpacity: 0.24,
    },
  },
};

// Define custom colors with proper typing
const customColors: PaletteModeRecord<CustomPaletteMode> = {
  light: {
    seat: {
      available: '#4caf50',
      selected: '#2196f3',
      booked: '#f44336',
      unavailable: '#9e9e9e',
    },
    performance: {
      active: '#4caf50',
      canceled: '#f44336',
      upcoming: '#2196f3',
      completed: '#9e9e9e',
    },
    status: {
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
    },
    custom: {
      lightBlue: '#e3f2fd',
      lightGreen: '#e8f5e9',
      lightRed: '#ffebee',
      lightYellow: '#fffde7',
    },
  },
  dark: {
    seat: {
      available: '#388e3c',
      selected: '#1976d2',
      booked: '#d32f2f',
      unavailable: '#616161',
    },
    performance: {
      active: '#388e3c',
      canceled: '#d32f2f',
      upcoming: '#1976d2',
      completed: '#616161',
    },
    status: {
      success: '#66bb6a',
      warning: '#ffa726',
      error: '#f44336',
      info: '#29b6f6',
    },
    custom: {
      lightBlue: '#0d47a1',
      lightGreen: '#1b5e20',
      lightRed: '#b71c1c',
      lightYellow: '#f57f17',
    },
  },
};

export const getTheme = (mode: PaletteMode): Theme => {
  // Now TypeScript knows these are properly indexed by PaletteMode
  const basePalette = muiDefaultPalette[mode];
  const custom = customColors[mode];
  
  return createTheme({
    palette: {
      mode,
      /*
      // Override specific colors while keeping defaults
      primary: {
        main: mode === 'light' ? '#1976d2' : '#90caf9',
        light: basePalette.primary.light,
        dark: basePalette.primary.dark,
        contrastText: basePalette.primary.contrastText,
      },
      secondary: {
        main: '#2fc800ff', // Your custom green
        light: basePalette.secondary.light,
        dark: basePalette.secondary.dark,
        contrastText: basePalette.secondary.contrastText,
      },
      */
      primary: basePalette.primary,
      secondary: basePalette.secondary,

      // Spread the rest of the base palette
      error: basePalette.error,
      warning: basePalette.warning,
      info: basePalette.info,
      success: basePalette.success,
      text: basePalette.text,
      background: basePalette.background,
      divider: basePalette.divider,
      action: basePalette.action,
      
      // Add custom colors (TypeScript now recognizes these)
      seat: custom.seat,
      performance: custom.performance,
      status: custom.status,
      custom: custom.custom,
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
  });
};

// Helper function with proper typing
export const getPaletteColor = (
  mode: PaletteMode, 
  colorPath: keyof CustomPaletteMode | string
): string => {
  const theme = getTheme(mode);
  const path = colorPath.split('.');
  let value: any = theme.palette;
  
  for (const key of path) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key as keyof typeof value];
    } else {
      console.warn(`Color path "${colorPath}" not found in palette`);
      return '#000';
    }
  }
  
  return typeof value === 'string' ? value : '#000';
};

// Type-safe helper to get specific color groups
export const getSeatColors = (mode: PaletteMode) => customColors[mode].seat;
export const getPerformanceColors = (mode: PaletteMode) => customColors[mode].performance;
export const getStatusColors = (mode: PaletteMode) => customColors[mode].status;
export const getCustomColors = (mode: PaletteMode) => customColors[mode].custom;
