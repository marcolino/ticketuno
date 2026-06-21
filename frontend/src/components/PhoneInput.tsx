import React from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import OriginalPhoneInput, {
  PhoneInputProps as OriginalPhoneInputProps,
} from 'react-phone-input-2';
// Make sure to import the CSS once in your app root:
//import 'react-phone-input-2/lib/material.css';
import { sharedConfig as config } from '@ticketuno/shared';

export type PhoneInputProps = OriginalPhoneInputProps & {
  error?: boolean;
  helperText?: string;
  label?: string;
  /** Default country code (e.g., 'us', 'fr', 'it'). Overridden by the original `country` prop if provided. */
  defaultCountry?: string;
  /** Standard MUI sx prop for the root container */
  sx?: React.ComponentProps<typeof Box>['sx'];
  /** Legacy prop, prefer sx instead */
  containerSx?: React.ComponentProps<typeof Box>['sx'];
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
};

const PhoneInput: React.FC<PhoneInputProps> = ({
  error = false,
  helperText,
  label,
  defaultCountry = config.app.defaultCountry,
  sx,
  containerSx,
  onBlur,
  ...restProps
}) => {
  const theme = useTheme();

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const container = event.currentTarget.closest('.react-tel-input');
    if (container?.contains(relatedTarget)) return;
    onBlur?.(event);
  };

  // Determine the country prop: use restProps.country if provided, otherwise fallback to defaultCountry
  const countryProp = restProps.country ?? defaultCountry;

  return (
    <Box
      sx={[
        {
          width: '100%',
          // All the phone input styles...
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
        },
        // Merge sx prop (supports array or object)
        ...(Array.isArray(sx) ? sx : [sx]),
        // Legacy containerSx overrides if needed
        containerSx,
      ]}
    >
      <OriginalPhoneInput
        {...restProps}
        country={countryProp}
        specialLabel={label}
        onBlur={handleBlur}
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

export default PhoneInput;
