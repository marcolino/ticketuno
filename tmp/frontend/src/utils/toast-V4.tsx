// frontend/src/utils/toast.tsx - With toast stacking
import { Snackbar, Alert, Slide, SlideProps, Button, Box, Collapse } from '@mui/material';
import React, { useState, ReactNode, useEffect, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  message: string;
  type: ToastType;
  duration?: number;
  action?: ReactNode;
  key: string;
  open: boolean;
}

interface ToastContextType {
  eventToast: (config: Omit<ToastConfig, 'key' | 'open'> & { key?: string }) => void;
}

// Slide transition for toasts
function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

// Create a global ref to store the toast function
let toastRef: React.RefObject<ToastContextType> = { current: null };

// Maximum number of toasts to event at once
const MAX_VISIBLE_TOASTS = 4;
// Vertical spacing between stacked toasts
const TOAST_SPACING = 84; // pixels

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  
  // Store the toast function in a ref so we can access it globally
  const eventToast = useCallback((config: Omit<ToastConfig, 'key' | 'open'> & { key?: string }) => {
    const toastWithKey: ToastConfig = {
      ...config,
      key: config.key || Date.now().toString(),
      open: true,
    };
    
    setToasts(prev => {
      // Add new toast to the beginning of the array (newest first)
      const newToasts = [toastWithKey, ...prev];
      // Limit total toasts in memory (optional cleanup of old toasts)
      return newToasts.slice(0, 8);
    });
  }, []);

  // Store the function in the ref when component mounts
  useEffect(() => {
    (toastRef as any).current = { eventToast };
  }, [eventToast]);

  const handleClose = (key: string) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.key === key ? { ...toast, open: false } : toast
      )
    );
    
    // Remove toast from state after collapse animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.key !== key));
    }, 300);
  };

  const handleExited = (key: string) => {
    setToasts(prev => prev.filter(t => t.key !== key));
  };

  // Calculate bottom position for each toast based on its index
  const getToastStyle = (index: number) => {
    const baseBottom = 20; // Base offset from bottom
    const bottom = baseBottom + (index * TOAST_SPACING);
    
    return {
      position: 'fixed' as const,
      bottom: `${bottom}px`,
      right: '20px',
      zIndex: 9999 - index, // Newer toasts have higher z-index
      width: 'auto',
      maxWidth: '500px',
      minWidth: '300px',
    };
  };

  // Get only the open toasts, limited by MAX_VISIBLE_TOASTS
  const visibleToasts = toasts.filter(t => t.open).slice(0, MAX_VISIBLE_TOASTS);

  return (
    <>
      {children}
      {visibleToasts.map((toast, index) => (
        <Snackbar
          key={toast.key}
          open={toast.open}
          autoHideDuration={toast.duration || 7000}
          onClose={() => handleClose(toast.key)}
          TransitionComponent={SlideTransition}
          TransitionProps={{
            onExited: () => handleExited(toast.key),
          }}
          style={getToastStyle(index)}
          sx={{
            '& .MuiSnackbar-root': {
              position: 'fixed',
            }
          }}
        >
          <Collapse in={toast.open}>
            <Alert
              severity={toast.type}
              onClose={() => handleClose(toast.key)}
              action={toast.action}
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
                mb: 1, // Margin between stacked toasts
                '& .MuiAlert-action': {
                  paddingLeft: '16px',
                  alignItems: 'center',
                }
              }}
            >
              {toast.message}
            </Alert>
          </Collapse>
        </Snackbar>
      ))}
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
  
  // New method to close all toasts
  closeAll: () => {
    // This would require exposing a closeAll method in the context
    // For now, we'll implement it differently if needed
    console.warn('closeAll not implemented in this version');
  },
};
