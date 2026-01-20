// frontend/src/utils/toast.tsx
import toast, { Toaster as HotToaster } from 'react-hot-toast';
import { Alert, Button, Box } from '@mui/material';
import type { ToastOptions } from 'react-hot-toast';

// Base toast function with MUI Alert styling
const eventBaseToast = (
  message: string, 
  severity: 'success' | 'error' | 'warning' | 'info',
  options?: ToastOptions
) => {
  console.log('XXX Creating toast with options:', { message, options });
  return toast.custom(
    (t) => {
      console.log('Toast instance ID:', t.id);
      return (<Alert
        severity={severity}
        onClose={() => toast.dismiss(t.id)}
        sx={{
          boxShadow: 3,
          borderRadius: '8px',
          padding: '16px',
          fontFamily: '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: 500,
          fontSize: '1.1rem',
          minWidth: '300px',
          maxWidth: '500px',
          // Ensure Alert inherits container styles
          '& .MuiAlert-message': {
            width: '100%',
            fontSize: 'inherit',
            fontFamily: 'inherit',
          }
        }}
      >
        {message}
      </Alert>);
    },
    {
      duration: 7 * 1000,
      ...options,
    }
  );
};

export const eventToast = {
  success: (message: string, options?: ToastOptions) => 
    eventBaseToast(message, 'success', options),

  error: (message: string, options?: ToastOptions) => 
    eventBaseToast(message, 'error', options),

  warning: (message: string, options?: ToastOptions) => 
    eventBaseToast(message, 'warning', options),

  info: (message: string, options?: ToastOptions) => 
    eventBaseToast(message, 'info', options),

  withActions: (
    message: string, 
    actions: Array<{label: string; onClick: () => void}>,
    options?: ToastOptions
  ) => {
    return toast.custom(
      (t) => (
        <Alert 
          severity="info"
          sx={{ 
            boxShadow: 3,
            borderRadius: '8px',
            padding: '16px',
            fontFamily: '"Open Sans", sans-serif',
            fontWeight: 500,
            fontSize: '16px',
            minWidth: '300px',
            '& .MuiAlert-message': {
              width: '100%',
            }
          }}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {actions.map((action, i) => (
                <Button 
                  key={i}
                  size="small" 
                  variant="outlined"
                  onClick={() => {
                    action.onClick();
                    toast.dismiss(t.id);
                  }}
                  sx={{ 
                    fontSize: '14px',
                    fontFamily: 'inherit',
                  }}
                >
                  {action.label}
                </Button>
              ))}
              {/* Add a close button for consistency */}
              <Button 
                size="small"
                onClick={() => toast.dismiss(t.id)}
                sx={{ 
                  minWidth: 'auto',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              >
                ×
              </Button>
            </Box>
          }
        >
          {message}
        </Alert>
      ),
      { 
        duration: Infinity, // Manual close only
        ...options 
      }
    );
  },
};

// Toaster component with proper styling inheritance
export const Toaster = () => (
  <HotToaster
    position="bottom-right"
    reverseOrder={false}
    gutter={8}
    containerStyle={{
      // Container styles that will apply to all toasts
      zIndex: 9999,
    }}
    toastOptions={{
      duration: 7 * 1000,
      // These styles apply to the toast wrapper, not the Alert
      style: {
        background: 'transparent', // Make wrapper transparent
        padding: 0,
        boxShadow: 'none',
        maxWidth: '500px',
        // Font settings that MUI Alert can inherit
        fontSize: '1.1rem', // Base font size
        fontFamily: '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: 500,
      },
    }}
  />
);
