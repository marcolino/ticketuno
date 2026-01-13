// src/contexts/LoadingContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { setupLoadingInterceptors } from '../services/api';

interface LoadingContextType {
  isLoading: boolean;
  showLoading: () => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
  minLoadingTime?: number; // Minimum time in milliseconds to show spinner
  delayBeforeShow?: number; // The delay time in milliseconds before to show spinner
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ 
  children, 
  minLoadingTime = 10, // Default 10ms to prevent flicker
  delayBeforeShow = 200, // Delay before showing spinner
}) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [forceVisible, setForceVisible] = useState(false);
  const isLoading = loadingCount > 0 || forceVisible;
  
  // Track timers for cleanup
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const showLoading = useCallback(() => {
    // Clear any existing show timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
    }

    // Set timeout to actually show loading after delay
    showTimeoutRef.current = setTimeout(() => {
      setLoadingCount(prev => prev + 1);
      setForceVisible(false);
      showTimeoutRef.current = null;
    }, delayBeforeShow);

    // // Clear any pending hide timeout
    // if (hideTimeoutRef.current) {
    //   clearTimeout(hideTimeoutRef.current);
    //   hideTimeoutRef.current = null;
    // }
    
    // setLoadingCount(prev => prev + 1);
    // setForceVisible(false); // Reset force visible when new loading starts

  }, [delayBeforeShow]);
  
  const hideLoading = useCallback(() => {
    // Clear any pending show timeout (request finished fast)
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
      return; // Spinner never shown, nothing to hide
    }
    
    // Decrement the counter
    setLoadingCount(prev => {
      const newCount = Math.max(0, prev - 1);
      
      // Handle minimum display time
      if (newCount === 0 && minLoadingTime > 0) {
        setForceVisible(true);
        hideTimeoutRef.current = setTimeout(() => {
          setForceVisible(false);
          hideTimeoutRef.current = null;
        }, minLoadingTime);
      }
      
      return newCount;
    });
  }, [minLoadingTime]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Initialize interceptors
  useEffect(() => {
    setupLoadingInterceptors(showLoading, hideLoading);
    //console.log(`✅ Loading interceptors initialized (minLoadingTime: ${minLoadingTime}ms)`);
    
    // Cleanup on unmount
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [showLoading, hideLoading, minLoadingTime]);

  return (
    <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};
