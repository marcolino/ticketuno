// frontend/src/utils/toast.tsx - Simplified MUI solution
import { Snackbar, Alert, Slide, SlideProps, Button, Box } from '@mui/material';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  message: string;
  type: ToastType;
  duration?: number;
  action?: ReactNode;
  key: string;
}

interface ToastContextType {
  eventToast: (config: Omit<ToastConfig, 'key'> & { key?: string }) => void;
}

// Slide transition for toasts
function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

// Create a global ref to store the toast function
let toastRef: React.RefObject<ToastContextType> = { current: null };

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  const [open, setOpen] = useState(false);
  
  // Store the toast function in a ref so we can access it globally
  const eventToast = (config: Omit<ToastConfig, 'key'> & { key?: string }) => {
    const toastWithKey: ToastConfig = {
      ...config,
      key: config.key || Date.now().toString(),
    };
    
    setToasts(prev => [toastWithKey, ...prev.slice(0, 2)]); // Keep max 3 toasts
    setOpen(true);
  };

  // Store the function in the ref when component mounts
  React.useEffect(() => {
    (toastRef as any).current = { eventToast };
  }, []);

  const handleClose = (key?: string) => {
    if (key) {
      setToasts(prev => prev.filter(t => t.key !== key));
    } else {
      setOpen(false);
    }
  };

  const currentToast = toasts[0];

  return (
    <>
      {children}
      {currentToast && (
        <Snackbar
          key={currentToast.key}
          open={open}
          autoHideDuration={currentToast.duration || 7000}
          onClose={() => handleClose()}
          TransitionComponent={SlideTransition}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ 
            '& .MuiSnackbar-root': { 
              position: 'relative',
              marginBottom: '20px',
            }
          }}
        >
          <Alert
            severity={currentToast.type}
            onClose={() => handleClose(currentToast.key)}
            action={currentToast.action}
            sx={{
              fontFamily: '"Open Sans", sans-serif',
              fontSize: '16px',
              fontWeight: 500,
              borderRadius: '8px',
              boxShadow: 3,
              padding: '16px',
              minWidth: '300px',
              maxWidth: '500px',
              alignItems: 'center',
              '& .MuiAlert-action': {
                paddingLeft: '16px',
                alignItems: 'center',
              }
            }}
          >
            {currentToast.message}
          </Alert>
        </Snackbar>
      )}
    </>
  );
};

// Direct function export (no hook usage)
export const eventToast = {
  success: (message: string, options?: { duration?: number; action?: ReactNode }) => {
    if (toastRef.current) {
      toastRef.current.eventToast({ message, type: 'success', ...options });
    } else {
      console.warn('ToastProvider not mounted yet');
    }
  },
  
  error: (message: string, options?: { duration?: number; action?: ReactNode }) => {
    if (toastRef.current) {
      toastRef.current.eventToast({ message, type: 'error', ...options });
    } else {
      console.warn('ToastProvider not mounted yet');
    }
  },
  
  warning: (message: string, options?: { duration?: number; action?: ReactNode }) => {
    if (toastRef.current) {
      toastRef.current.eventToast({ message, type: 'warning', ...options });
    } else {
      console.warn('ToastProvider not mounted yet');
    }
  },
  
  info: (message: string, options?: { duration?: number; action?: ReactNode }) => {
    if (toastRef.current) {
      toastRef.current.eventToast({ message, type: 'info', ...options });
    } else {
      console.warn('ToastProvider not mounted yet');
    }
  },
  
  withActions: (message: string, actions: Array<{label: string; onClick: () => void}>) => {
    const actionButtons = (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {actions.map((action, i) => (
          <Button
            key={i}
            variant="outlined"
            size="small"
            onClick={() => {
              action.onClick();
            }}
            sx={{
              fontSize: '12px',
              padding: '2px 8px',
              minWidth: '60px',
              borderColor: 'rgba(255, 255, 255, 0.7)',
              color: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            {action.label}
          </Button>
        ))}
      </Box>
    );
    
    if (toastRef.current) {
      toastRef.current.eventToast({ 
        message, 
        type: 'info', 
        duration: undefined, // Manual close only
        action: actionButtons 
      });
    } else {
      console.warn('ToastProvider not mounted yet');
    }
  },
};

// Optional: Hook for components that want direct access
export const useToast = () => {
  const context = useContext(createContext<ToastContextType | null>(null));
  return context;
};
