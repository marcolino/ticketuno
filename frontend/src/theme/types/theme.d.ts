//import { ComponentsProps, ComponentsOverrides, ComponentsVariants } from '@mui/material/styles';
import '@mui/material/styles';

declare module '@mui/material/styles' {

  interface Components {
    SelectWithAdd?: {
      minWidth?: number;
      keyChip?: {
        height?: number;
        fontSize?: string;
        fontWeight?: number;
        bgAlpha?: string;
        borderAlpha?: string;
      };
      keyChipMuted?: {
        height?: number;
        fontSize?: string;
        fontWeight?: number;
      };
      addSection?: {
        labelFontSize?: string;
        labelFontWeight?: number;
        labelLetterSpacing?: string;
        inputFontSize?: string;
        inputBorderRadius?: number;
        addButtonFontSize?: string;
        addButtonFontWeight?: number;
        addButtonLetterSpacing?: string;
        addButtonPaddingX?: string;
        addButtonPaddingY?: string;
        addButtonBorderRadius?: string;
      };
    };
  }

  interface Theme {
    customShadows?: {
      selectMenu?: string;
    };
  }
  interface ThemeOptions {
    customShadows?: {
      selectMenu?: string;
    };
  }
}

export {};