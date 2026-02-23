//import { PaletteMode } from '@mui/material';
import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    custom: {
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
    };
  }

  interface PaletteOptions {
    custom?: {
      seat?: {
        available?: string;
        selected?: string;
        booked?: string;
        unavailable?: string;
      };
      performance?: {
        active?: string;
        canceled?: string;
        upcoming?: string;
        completed?: string;
      };
      status?: {
        success?: string;
        warning?: string;
        error?: string;
        info?: string;
      };
      custom?: {
        lightBlue?: string;
        lightGreen?: string;
        lightRed?: string;
        lightYellow?: string;
      };
    };
  }
}

export {};
