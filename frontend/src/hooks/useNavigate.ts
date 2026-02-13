import { useNavigate as useOriginalNavigate, NavigateOptions, To } from 'react-router-dom';
import { useCallback } from 'react';

// Define the return type of our custom hook
export type SafeNavigateFunction = {
  (to: To, options?: NavigateOptions & { fallbackPath?: string }): void;
  (delta: number): void;
  goBack: (fallbackPath?: string) => void;
  goForward: (delta?: number) => void;
  replace: (to: To, options?: Omit<NavigateOptions, 'replace'>) => void;
};

const useNavigate = (): SafeNavigateFunction => {
  const originalNavigate = useOriginalNavigate();

  const safeNavigate = useCallback((
    to: To | number,
    options?: NavigateOptions & { fallbackPath?: string }
  ) => {
    if (typeof to === 'number' && to < 0) {
      const referrer = document.referrer;
      const isInternalReferrer = referrer && referrer.startsWith(window.location.origin);
      
      // Only go back if we're SURE it's internal
      // When in doubt (empty referrer or external), redirect to home
      if (!isInternalReferrer) {
        const fallback = options?.fallbackPath || '/';
        return originalNavigate(fallback, options);
      }
    }
    return originalNavigate(to, options);
  }, [originalNavigate]);

  // Create the callable function with additional methods
  const navigate = safeNavigate as SafeNavigateFunction;
  
  // Add explicit goBack method
  navigate.goBack = useCallback((fallbackPath: string = '/') => {
    safeNavigate(-1, { fallbackPath });
  }, [safeNavigate]);

  // Add goForward method
  navigate.goForward = useCallback((delta: number = 1) => {
    originalNavigate(delta);
  }, [originalNavigate]);

  // Add replace method
  navigate.replace = useCallback((to: To, options?: Omit<NavigateOptions, 'replace'>) => {
    safeNavigate(to, { ...options, replace: true });
  }, [safeNavigate]);

  return navigate;
};

export default useNavigate;
