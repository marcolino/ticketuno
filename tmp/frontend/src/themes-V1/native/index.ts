import type { PaletteMode } from '@mui/material';
import { getPlatform } from '../../utils/platform';
import { getAndroidTheme } from './android';
import { getIOSTheme } from './ios';

export const getNativeTheme = (mode: PaletteMode) => {
  const platform = getPlatform();

  if (platform === 'ios') return getIOSTheme(mode);
  return getAndroidTheme(mode); // android + web fallback
};

