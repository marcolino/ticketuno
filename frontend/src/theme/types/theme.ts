// import {
//   PaletteColor,
//   PaletteMode as MuiPaletteMode,
// } from '@mui/material/styles';

// import {
//   PaletteText,
//   PaletteBackground,
//   PaletteAction,
// } from '@mui/material/styles/createPalette';

import type { PaletteColor, Theme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material'; // 'light' | 'dark' | 'system'


/**
 * Base MUI palette (theme.palette.*)
 */
export interface BasePaletteMode {
  primary: PaletteColor;
  secondary: PaletteColor;
  error: PaletteColor;
  warning: PaletteColor;
  info: PaletteColor;
  success: PaletteColor;

  text: Theme['palette']['text'];
  background: Theme['palette']['background'];
  divider: Theme['palette']['divider'];
  action: Theme['palette']['action'];
}
// export interface BasePaletteMode {
//   primary: PaletteColor;
//   secondary: PaletteColor;
//   error: PaletteColor;
//   warning: PaletteColor;
//   info: PaletteColor;
//   success: PaletteColor;

//   text: PaletteText;
//   background: PaletteBackground;
//   divider: string;
//   action: PaletteAction;
// }

/**
 * App-specific semantic palette
 * (theme.palette.custom)
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

//export type PaletteMode = MuiPaletteMode; // 'light' | 'dark'
export type PaletteModeRecord<T> = Record<PaletteMode, T>;