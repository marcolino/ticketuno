import { PaletteColor, TypeText, TypeBackground, TypeAction } from '@mui/material/styles';

export interface BasePaletteMode {
  primary: PaletteColor;
  secondary: PaletteColor;
  error: PaletteColor;
  warning: PaletteColor;
  info: PaletteColor;
  success: PaletteColor;
  text: TypeText;
  background: TypeBackground;
  divider: string;
  action: TypeAction;
}

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
  light: {
    lightBlue: string;
    lightGreen: string;
    lightRed: string;
    lightYellow: string;
  };
}

// Create a typed record that maps PaletteMode to palette configurations
export type PaletteMode = 'light' | 'dark';
export type PaletteModeRecord<T> = Record<PaletteMode, T>;
