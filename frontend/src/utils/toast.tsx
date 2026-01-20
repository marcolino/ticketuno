// frontend/src/utils/toast.tsx - Fixed positioning and stacking
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
      // Limit total toasts in memory
      return newToasts.slice(0, 10);
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

  // Get only the open toasts, limited by MAX_VISIBLE_TOASTS
  const visibleToasts = toasts.filter(t => t.open).slice(0, MAX_VISIBLE_TOASTS);

  return (
    <>
      {children}
      {/* Container for stacked toasts */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse', // Newest at the bottom
        alignItems: 'flex-end',
        gap: '8px',
        pointerEvents: 'none', // Allow clicks to pass through container
      }}>
        {visibleToasts.map((toast, index) => (
          <div
            key={toast.key}
            style={{
              pointerEvents: 'auto', // Re-enable clicks for toasts
              position: 'relative',
              transition: 'all 0.3s ease',
              // Position each toast with margin-top for stacking
              marginTop: index > 0 ? `-${TOAST_SPACING - 60}px` : '0',
              transform: `translateY(-${index * 20}px)`,
              opacity: toast.open ? 1 : 0,
              maxWidth: '500px',
              minWidth: '300px',
            }}
          >
            <Snackbar
              open={toast.open}
              autoHideDuration={toast.duration || 7000}
              onClose={() => handleClose(toast.key)}
              TransitionComponent={SlideTransition}
              TransitionProps={{
                onExited: () => handleExited(toast.key),
              }}
              // Remove anchorOrigin since we're manually positioning
              sx={{
                position: 'relative !important',
                transform: 'none !important',
                left: '0 !important',
                right: '0 !important',
                bottom: '0 !important',
                top: '0 !important',
                minWidth: '100%',
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
                    '& .MuiAlert-action': {
                      paddingLeft: '16px',
                      alignItems: 'center',
                    },
                    // Add background color based on type
                    backgroundColor: (theme) => {
                      switch(toast.type) {
                        case 'success': return theme.palette.success.main;
                        case 'error': return theme.palette.error.main;
                        case 'warning': return theme.palette.warning.main;
                        case 'info': return theme.palette.info.main;
                        default: return theme.palette.info.main;
                      }
                    },
                    color: '#fff',
                  }}
                >
                  {toast.message}
                </Alert>
              </Collapse>
            </Snackbar>
          </div>
        ))}
      </div>
    </>
  );
};

// Keep the eventToast functions exactly the same as before...
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
