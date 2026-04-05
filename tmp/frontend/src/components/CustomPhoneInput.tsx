// CustomPhoneInput.tsx
import React from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import PhoneInput, { PhoneInputProps } from 'react-phone-input-2';
// import CSS once in index.tsx
//import 'react-phone-input-2/lib/material.css';

export interface CustomPhoneInputProps {
  /** Phone number value (E.164 format or as returned by the library) */
  value: string;
  /** Called when the phone number changes */
  onChange: (value: string) => void;
  /** Label shown inside the input (maps to specialLabel) */
  label?: string;
  /** Default country code (e.g., 'us', 'fr') */
  defaultCountry?: string;
  /** If true, displays error styling */
  error?: boolean;
  /** Helper text shown below the input */
  helperText?: string;
  /** If true, the input takes full width */
  fullWidth?: boolean;
  /** Additional styles to apply to the container Box */
  containerSx?: React.ComponentProps<typeof Box>['sx'];
  /** Standard onBlur handler (only called when focus leaves the whole widget) */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Props passed directly to react-phone-input-2 */
  phoneInputProps?: Partial<PhoneInputProps>;
}

const CustomPhoneInput: React.FC<CustomPhoneInputProps> = ({
  value,
  onChange,
  label,
  defaultCountry = 'us',
  error = false,
  helperText,
  fullWidth = true,
  containerSx,
  onBlur,
  phoneInputProps,
}) => {
  const theme = useTheme();

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    // If focus moves inside the phone widget (e.g., flag dropdown), skip onBlur
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const container = event.currentTarget.closest('.react-tel-input');
    if (container?.contains(relatedTarget)) return;

    onBlur?.(event);
  };

  return (
    <Box
      sx={{
        width: fullWidth ? '100%' : 'auto',
        // Base styling for the entire widget
        '& .react-tel-input .form-control': {
          width: '100%',
          height: '56px',
          borderRadius: `${theme.shape.borderRadius}px`,
          borderColor: error
            ? theme.palette.error.main
            : theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.23)'
            : 'rgba(0,0,0,0.23)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body1.fontSize,
          color: theme.palette.text.primary,
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: error ? theme.palette.error.main : theme.palette.text.primary,
          },
          '&:focus': {
            borderColor: error ? theme.palette.error.main : theme.palette.primary.main,
            borderWidth: '2px',
            boxShadow: 'none',
          },
        },
        '& .react-tel-input .flag-dropdown': {
          borderRadius: `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
          borderColor: theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.23)'
            : 'rgba(0,0,0,0.23)',
          backgroundColor: 'transparent',
          '&:hover, &.open': {
            backgroundColor: theme.palette.action.hover,
          },
        },
        '& .react-tel-input .selected-flag': {
          borderRadius: `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
          backgroundColor: 'transparent !important',
        },
        '& .react-tel-input .country-list': {
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[8],
          borderRadius: `${theme.shape.borderRadius}px`,
        },
        '& .react-tel-input .country-list .country': {
          display: 'flex !important',
          alignItems: 'center !important',
          paddingTop: '5px !important',
          paddingBottom: '5px !important',
          paddingLeft: '8px !important',
          paddingRight: '8px !important',
          gap: '0 !important',
          '&:hover': {
            backgroundColor: `${theme.palette.action.hover} !important`,
          },
          '&.highlight': {
            backgroundColor: `${theme.palette.action.selected} !important`,
          },
        },
        '& .react-tel-input .country-list .flag': {
          flexShrink: '0 !important',
          marginTop: '0 !important',
          marginRight: '20px !important',
          marginLeft: '0 !important',
          position: 'relative !important',
          top: '0 !important',
        },
        '& .react-tel-input .country-list .country-name': {
          color: `${theme.palette.text.primary} !important`,
          marginRight: '4px !important',
          lineHeight: '1 !important',
        },
        '& .react-tel-input .country-list .dial-code': {
          color: `${theme.palette.text.secondary} !important`,
          lineHeight: '1 !important',
        },
        // Optional helper text styling (you can also use MUI FormHelperText)
        '& + .MuiFormHelperText-root': {
          marginLeft: '14px',
          marginRight: '14px',
          color: error ? theme.palette.error.main : theme.palette.text.secondary,
        },
        ...containerSx,
      }}
    >
      <PhoneInput
        country={defaultCountry}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        specialLabel={label}
        enableSearch
        {...phoneInputProps}
      />
      {helperText && (
        <Box
          component="span"
          sx={{
            display: 'block',
            fontSize: '0.75rem',
            marginLeft: '14px',
            marginRight: '14px',
            marginTop: '4px',
            color: error ? theme.palette.error.main : theme.palette.text.secondary,
          }}
        >
          {helperText}
        </Box>
      )}
    </Box>
  );
};

export default CustomPhoneInput;
