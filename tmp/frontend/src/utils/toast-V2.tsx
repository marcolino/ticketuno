// frontend/src/utils/toast.tsx - Simplified version
import toast, { Toaster as HotToaster } from 'react-hot-toast';
import { Alert, Button, Box } from '@mui/material';
import type { ToastOptions } from 'react-hot-toast';

// Simple wrapper that uses toast.success/error/etc directly
export const eventToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: 7 * 1000,
      style: {
        background: '#ccc',
        padding: 4,
        boxShadow: 'none',
        maxWidth: '500px',
      },
      ...options,
    });
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: 7 * 1000,
      style: {
        background: 'transparent',
        padding: 0,
        boxShadow: 'none',
        maxWidth: '500px',
      },
      ...options,
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: 7 * 1000,
      icon: '⚠️',
      style: {
        background: 'transparent',
        padding: 0,
        boxShadow: 'none',
        maxWidth: '500px',
      },
      ...options,
    });
  },

  info: (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: 7 * 1000,
      icon: 'ℹ️',
      style: {
        background: 'transparent',
        padding: 0,
        boxShadow: 'none',
        maxWidth: '500px',
      },
      ...options,
    });
  },
};

// Custom Toaster that renders MUI Alerts
export const Toaster = () => (
  <HotToaster
    position="bottom-right"
    reverseOrder={false}
    gutter={8}
    containerStyle={{
      zIndex: 9999,
    }}
    toastOptions={{
      duration: 7 * 1000,
      style: {
        background: '#444',
        padding: 0,
        boxShadow: 'none',
        maxWidth: '500px',
        fontSize: '1.1rem',
        fontFamily: '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: 500,
      },
    }}
  />
);
