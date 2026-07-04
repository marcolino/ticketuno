import '@mui/material/styles';
import type { CustomPaletteMode } from './types/theme';

declare module '@mui/material/styles' {
  interface Palette {
    custom: CustomPaletteMode;
  }

  interface PaletteOptions {
    custom?: CustomPaletteMode;
  }
}
