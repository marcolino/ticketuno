import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import hotToast from 'react-hot-toast';

/**
 * This component avoids that navigating away from a component when a toast is shown,
 * before the toast is hidden, the toast remains visible forever.
 * Main component react-hot-toast stores toast state outside React in a global module-level store.
 * This means toasts survive component unmounts — and when <Toaster> remounts
 * (e.g. after navigation), it re-renders everything still in that global store.
 */
const ToastRouteHandler = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    hotToast.dismiss(); // Dismiss all toasts on navigation
  }, [location.pathname]);

  return null;
};

export default ToastRouteHandler;
