import type { PaletteMode } from '@mui/material';

export const getSystemPaletteMode = (): PaletteMode =>
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
  ;
