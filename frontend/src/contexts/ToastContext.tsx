import React, { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster, ToastOptions } from 'react-hot-toast';
import { Alert, AlertColor, Button, Box } from '@mui/material';

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
  return (
    <Alert 
      severity={severity}
      variant="filled"
      onClose={() => {
        toast.dismiss(t.id);
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
                  toast.dismiss(t.id);
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
      {message}
    </Alert>
  );
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  // Default options for all toasts
  const defaultOptions: ToastOptions = {
    duration: 7000,
    position: 'bottom-right',
  };

  // Helper to show any toast
  const showToast = (
    message: string, 
    severity: AlertColor = 'info',
    options?: ToastOptions,
    actions?: Array<{label: string; onClick: () => void}>
  ): string => {
    return toast.custom(
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
    showToast(message, 'success', options);

  const error = (message: string, options?: ToastOptions) => 
    showToast(message, 'error', options);

  const warning = (message: string, options?: ToastOptions) => 
    showToast(message, 'warning', options);

  const info = (message: string, options?: ToastOptions) => 
    showToast(message, 'info', options);

  // Toast with action buttons
  const withActions = (
    message: string, 
    actions: Array<{label: string; onClick: () => void}>,
    severity: AlertColor = 'info',
    options?: ToastOptions
  ): string => {
    return showToast(message, severity, { ...options, duration: Infinity }, actions);
  };

  const dismiss = (id?: string) => {
    toast.dismiss(id);
  };

  const dismissAll = () => {
    toast.dismiss();
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
// These are perfect for your request: toastSuccess(), toastError(), etc.
export const toastSuccess = (message: string, options?: ToastOptions) => {
  return toast.custom(
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

export const toastError = (message: string, options?: ToastOptions) => {
  return toast.custom(
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

export const toastWarning = (message: string, options?: ToastOptions) => {
  return toast.custom(
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

export const toastInfo = (message: string, options?: ToastOptions) => {
  return toast.custom(
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

export const toastWithActions = (
  message: string, 
  actions: Array<{label: string; onClick: () => void}>,
  severity: AlertColor = 'info',
  options?: ToastOptions
) => {
  return toast.custom(
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
export const toastAPI = {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  withActions: toastWithActions,
  dismiss: toast.dismiss,
  dismissAll: () => toast.dismiss(),
};
