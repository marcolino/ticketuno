// context/ToastContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster, ToastOptions } from 'react-hot-toast';
import { Alert, AlertColor, Button, Box } from '@mui/material';

interface ToastContextType {
  showToast: (message: string, severity: AlertColor, options?: ToastOptions) => string;
  showToastWithActions: (
    message: string, 
    actions: Array<{label: string; onClick: () => void}>,
    severity?: AlertColor
  ) => string;
  dismissToast: (id?: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  // Default options for all toasts
  const defaultOptions: ToastOptions = {
    duration: 7000,
    position: 'bottom-right',
  };

  // Core function to show a toast using MUI Alert
  const showToast = (
    message: string, 
    severity: AlertColor = 'info', 
    options?: ToastOptions
  ): string => {
    return toast.custom(
      (t) => (
        <Alert 
          severity={severity}
          variant="filled"
          onClose={() => toast.dismiss(t.id)}
          sx={{
            borderRadius: 2,
            boxShadow: 3,
            width: '350px',
            fontFamily: '"Open Sans", sans-serif',
            fontSize: '16px',
            fontWeight: 500,
            alignItems: 'center',
            // Apply MUI transitions
            opacity: t.visible ? 1 : 0,
            transform: t.visible ? 'translateX(0)' : 'translateX(100px)',
            transition: 'all 0.3s ease',
          }}
          // Additional customization for the Alert component
          action={
            options?.duration === Infinity && (
              <Button 
                size="small" 
                color="inherit" 
                onClick={() => toast.dismiss(t.id)}
              >
                Close
              </Button>
            )
          }
        >
          {message}
        </Alert>
      ),
      { ...defaultOptions, ...options }
    );
  };

  // Function for toasts with custom action buttons
  const showToastWithActions = (
    message: string, 
    actions: Array<{label: string; onClick: () => void}>,
    severity: AlertColor = 'info'
  ): string => {
    return toast.custom(
      (t) => (
        <Alert 
          severity={severity}
          variant="filled"
          sx={{
            borderRadius: 2,
            boxShadow: 3,
            width: '400px',
            fontFamily: '"Open Sans", sans-serif',
            fontSize: '16px',
            fontWeight: 500,
            alignItems: 'center',
            opacity: t.visible ? 1 : 0,
            transform: t.visible ? 'translateX(0)' : 'translateX(100px)',
            transition: 'all 0.3s ease',
          }}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                  }}
                >
                  {action.label}
                </Button>
              ))}
              <Button 
                size="small" 
                color="inherit" 
                onClick={() => toast.dismiss(t.id)}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                ×
              </Button>
            </Box>
          }
        >
          {message}
        </Alert>
      ),
      { duration: Infinity } // Manual close only for action toasts
    );
  };

  const dismissToast = (id?: string) => {
    toast.dismiss(id);
  };

  const dismissAll = () => {
    toast.dismiss();
  };

  const contextValue: ToastContextType = {
    showToast,
    showToastWithActions,
    dismissToast,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toaster Configuration */}
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        gutter={12}
        toastOptions={{
          // Empty styles here since we style via MUI Alert
          style: {
            background: 'transparent',
            padding: 0,
            boxShadow: 'none',
          },
        }}
      />
    </ToastContext.Provider>
  );
};

// Custom hook to use toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Convenience functions for direct usage
export const toastAPI = {
  success: (message: string, options?: ToastOptions) => {
    const id = toast.custom((t) => (
      <Alert 
        severity="success"
        variant="filled"
        onClose={() => toast.dismiss(t.id)}
        sx={{
          borderRadius: 2,
          boxShadow: 3,
          width: '350px',
          fontFamily: '"Open Sans", sans-serif',
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? 'translateX(0)' : 'translateX(100px)',
          transition: 'all 0.3s ease',
        }}
      >
        {message}
      </Alert>
    ), { duration: 7000, ...options });
    return id;
  },
  
  error: (message: string, options?: ToastOptions) => {
    const id = toast.custom((t) => (
      <Alert 
        severity="error"
        variant="filled"
        onClose={() => toast.dismiss(t.id)}
        sx={{
          borderRadius: 2,
          boxShadow: 3,
          width: '350px',
          fontFamily: '"Open Sans", sans-serif',
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? 'translateX(0)' : 'translateX(100px)',
          transition: 'all 0.3s ease',
        }}
      >
        {message}
      </Alert>
    ), { duration: 7000, ...options });
    return id;
  },
  
  info: (message: string, options?: ToastOptions) => {
    const id = toast.custom((t) => (
      <Alert 
        severity="info"
        variant="filled"
        onClose={() => toast.dismiss(t.id)}
        sx={{
          borderRadius: 2,
          boxShadow: 3,
          width: '350px',
          fontFamily: '"Open Sans", sans-serif',
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? 'translateX(0)' : 'translateX(100px)',
          transition: 'all 0.3s ease',
        }}
      >
        {message}
      </Alert>
    ), { duration: 7000, ...options });
    return id;
  },
  
  warning: (message: string, options?: ToastOptions) => {
    const id = toast.custom((t) => (
      <Alert 
        severity="warning"
        variant="filled"
        onClose={() => toast.dismiss(t.id)}
        sx={{
          borderRadius: 2,
          boxShadow: 3,
          width: '350px',
          fontFamily: '"Open Sans", sans-serif',
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? 'translateX(0)' : 'translateX(100px)',
          transition: 'all 0.3s ease',
        }}
      >
        {message}
      </Alert>
    ), { duration: 7000, ...options });
    return id;
  },
};
