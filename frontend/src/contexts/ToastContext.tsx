import React, { createContext, useContext, ReactNode } from 'react';
import hotToast, { Toaster, ToastOptions } from 'react-hot-toast';
import { Alert, AlertColor, Button, Box } from '@mui/material';

// HTML entity decoder
function decodeHtmlEntities(str: string): string {
  const parser = new DOMParser();
  const decoded = parser.parseFromString(str, 'text/html').documentElement.textContent;
  return decoded || str; // Fallback to original if decoding fails
}

interface ToastContextType {
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  withActions: (
    message: string, 
    actions: Array<{label: string; onClick: () => void}>,
    severity?: AlertColor,
    options?: ToastOptions
  ) => string;
  dismiss: (id?: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

// Reusable Toast Alert component with close button
const ToastAlert = ({ 
  t, 
  message, 
  severity = 'info',
  actions,
  onClose
}: { 
  t: any; 
  message: string; 
  severity?: AlertColor;
  actions?: Array<{label: string; onClick: () => void}>;
  onClose?: () => void;
}) => {
  // Decode HTML entities in the message
  const decodedMessage = decodeHtmlEntities(message);

  return (
    <Alert 
      severity={severity}
      variant="filled"
      onClose={() => {
        hotToast.dismiss(t.id);
        onClose?.();
      }}
      action={
        actions && actions.length > 0 ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 1 }}>
            {actions.map((action, index) => (
              <Button
                key={index}
                size="small"
                color="inherit"
                variant="outlined"
                onClick={() => {
                  action.onClick();
                  hotToast.dismiss(t.id);
                }}
                sx={{
                  fontSize: '12px',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.8)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        ) : undefined
      }
      sx={{
        borderRadius: 2,
        boxShadow: 3,
        width: '350px',
        fontFamily: '"Open Sans", sans-serif',
        fontSize: '16px',
        fontWeight: 500,
        alignItems: 'center',
        // Smooth slide-in animation
        opacity: t.visible ? 1 : 0,
        transform: t.visible ? 'translateX(0)' : 'translateX(100px)',
        transition: 'all 0.3s ease',
      }}
    >
      {decodedMessage}
    </Alert>
  );
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  // Default options for all toasts
  const defaultOptions: ToastOptions = {
    duration: 4000,
    position: 'bottom-right',
  };

  // Helper to event any toast
  const eventToast = (
    message: string, 
    severity: AlertColor = 'info',
    options?: ToastOptions,
    actions?: Array<{label: string; onClick: () => void}>
  ): string => {
    return hotToast.custom(
      (t) => (
        <ToastAlert 
          t={t}
          message={message}
          severity={severity}
          actions={actions}
        />
      ),
      { ...defaultOptions, ...options }
    );
  };

  // Individual toast functions
  const success = (message: string, options?: ToastOptions) => 
    eventToast(message, 'success', options);

  const error = (message: string, options?: ToastOptions) => 
    eventToast(message, 'error', options);

  const warning = (message: string, options?: ToastOptions) => 
    eventToast(message, 'warning', options);

  const info = (message: string, options?: ToastOptions) => 
    eventToast(message, 'info', options);

  // Toast with action buttons
  const withActions = (
    message: string, 
    actions: Array<{label: string; onClick: () => void}>,
    severity: AlertColor = 'info',
    options?: ToastOptions
  ): string => {
    return eventToast(message, severity, { ...options, duration: Infinity }, actions);
  };

  const dismiss = (id?: string) => {
    hotToast.dismiss(id);
  };

  const dismissAll = () => {
    hotToast.dismiss();
  };

  const contextValue: ToastContextType = {
    success,
    error,
    warning,
    info,
    withActions,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toaster Configuration - transparent wrapper */}
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        gutter={12}
        toastOptions={{
          style: {
            background: 'transparent',
            padding: 0,
            boxShadow: 'none',
            margin: 0,
          },
        }}
      />
    </ToastContext.Provider>
  );
};

// Custom hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Direct function exports (can be imported without hook)
const toastSuccess = (message: string, options?: ToastOptions) => {
  return hotToast.custom(
    (t) => (
      <ToastAlert 
        t={t}
        message={message}
        severity="success"
      />
    ),
    { duration: 7000, position: 'bottom-right', ...options }
  );
};

const toastError = (message: string, options?: ToastOptions) => {
  return hotToast.custom(
    (t) => (
      <ToastAlert 
        t={t}
        message={message}
        severity="error"
      />
    ),
    { duration: 7000, position: 'bottom-right', ...options }
  );
};

const toastWarning = (message: string, options?: ToastOptions) => {
  return hotToast.custom(
    (t) => (
      <ToastAlert 
        t={t}
        message={message}
        severity="warning"
      />
    ),
    { duration: 7000, position: 'bottom-right', ...options }
  );
};

const toastInfo = (message: string, options?: ToastOptions) => {
  return hotToast.custom(
    (t) => (
      <ToastAlert 
        t={t}
        message={message}
        severity="info"
      />
    ),
    { duration: 7000, position: 'bottom-right', ...options }
  );
};

const toastWithActions = (
  message: string, 
  actions: Array<{label: string; onClick: () => void}>,
  severity: AlertColor = 'info',
  options?: ToastOptions
) => {
  return hotToast.custom(
    (t) => (
      <ToastAlert 
        t={t}
        message={message}
        severity={severity}
        actions={actions}
      />
    ),
    { duration: Infinity, position: 'bottom-right', ...options }
  );
};

// Convenience object for direct import
export const toast = {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  withActions: toastWithActions,
  dismiss: hotToast.dismiss,
  dismissAll: () => hotToast.dismiss(),
};