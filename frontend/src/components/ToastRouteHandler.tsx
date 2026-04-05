import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import hotToast from 'react-hot-toast';

const ToastRouteHandler = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);
  const dismissTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear any pending dismiss from previous navigation
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }

    // Delay dismissal to allow the user to see the toast
    dismissTimer.current = setTimeout(() => {
      hotToast.dismiss();
    }, 1500); // 1.5 seconds – adjust as needed

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [location.pathname]);

  return null;
};

export default ToastRouteHandler;