import {
  PaletteColor,
  PaletteMode as MuiPaletteMode,
} from '@mui/material/styles';

import {
  PaletteText,
  PaletteBackground,
  PaletteAction,
} from '@mui/material/styles/createPalette';

/**
 * Base MUI-compatible palette
 * (this mirrors theme.palette.*)
 */
export interface BasePaletteMode {
  primary: PaletteColor;
  secondary: PaletteColor;
  error: PaletteColor;
  warning: PaletteColor;
  info: PaletteColor;
  success: PaletteColor;

  text: PaletteText;
  background: PaletteBackground;
  divider: string;
  action: PaletteAction;
}

/**
 * App-specific semantic colors
 * (this goes under theme.palette.custom)
 */
export interface CustomPaletteMode {
  seat: {
    available: string;
    selected: string;
    booked: string;
    unavailable: string;
  };

  performance: {
    active: string;
    canceled: string;
    upcoming: string;
    completed: string;
  };

  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  custom: {
    lightBlue: string;
    lightGreen: string;
    lightRed: string;
    lightYellow: string;
  };
}

/**
 * Light / Dark contract
 * (kept explicit to avoid accidental widening)
 */
export type PaletteMode = MuiPaletteMode; // 'light' | 'dark'

/**
 * Helper type for strongly-typed light/dark maps
 */
export type PaletteModeRecord<T> = Record<PaletteMode, T>;
