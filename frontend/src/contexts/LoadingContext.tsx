// src/contexts/LoadingContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { setupLoadingInterceptors } from '@/services/api';

interface LoadingContextType {
  isLoading: boolean;
  eventLoading: () => void;
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
  minLoadingTime?: number; // Minimum time in milliseconds to event spinner
  delayBeforeEvent?: number; // The delay time in milliseconds before to event spinner
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ 
  children, 
  minLoadingTime = 10, // Default 10ms to prevent flicker
  delayBeforeEvent = 200, // Delay before eventing spinner
}) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [forceVisible, setForceVisible] = useState(false);
  const isLoading = loadingCount > 0 || forceVisible;
  
  // Track timers for cleanup
  //const eventTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number| null>(null);
  
  const eventLoading = useCallback(() => {
    // Clear any existing event timeout
    if (eventTimeoutRef.current) {
      clearTimeout(eventTimeoutRef.current);
    }

    // Set timeout to actually event loading after delay
    eventTimeoutRef.current = setTimeout(() => {
      setLoadingCount(prev => prev + 1);
      setForceVisible(false);
      eventTimeoutRef.current = null;
    }, delayBeforeEvent);

    // // Clear any pending hide timeout
    // if (hideTimeoutRef.current) {
    //   clearTimeout(hideTimeoutRef.current);
    //   hideTimeoutRef.current = null;
    // }
    
    // setLoadingCount(prev => prev + 1);
    // setForceVisible(false); // Reset force visible when new loading starts

  }, [delayBeforeEvent]);
  
  const hideLoading = useCallback(() => {
    // Clear any pending event timeout (request finished fast)
    if (eventTimeoutRef.current) {
      clearTimeout(eventTimeoutRef.current);
      eventTimeoutRef.current = null;
      return; // Spinner never eventn, nothing to hide
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
      if (eventTimeoutRef.current) clearTimeout(eventTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Initialize interceptors
  useEffect(() => {
    setupLoadingInterceptors(eventLoading, hideLoading);
    //console.log(`✅ Loading interceptors initialized (minLoadingTime: ${minLoadingTime}ms)`);
    
    // Cleanup on unmount
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [eventLoading, hideLoading, minLoadingTime]);

  return (
    <LoadingContext.Provider value={{ isLoading, eventLoading, hideLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};
