import { 
  useNavigate as useOriginalNavigate, 
  NavigateOptions, 
  To,
  NavigateFunction 
} from 'react-router-dom';
import { useCallback } from 'react';

interface SafeNavigateOptions extends NavigateOptions {
  fallbackPath?: string;
}

interface SafeNavigateFunction extends NavigateFunction {
  (to: To | number, options?: SafeNavigateOptions): void;
  goBack: (fallbackPath?: string) => void;
  safe: (to: To, options?: SafeNavigateOptions) => void;
  replace: (to: To, options?: Omit<SafeNavigateOptions, 'replace'>) => void;
}

const useNavigate = (): SafeNavigateFunction => {
  const originalNavigate = useOriginalNavigate();

  const handleBackNavigation = useCallback((
    delta: number,
    fallbackPath?: string
  ) => {
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;
    const cameFromExternal = referrer && !referrer.startsWith(currentOrigin);
    const hasHistory = window.history.length > 1;

    // If we can't determine or have no history, use fallback
    if (cameFromExternal || !hasHistory) {
      return originalNavigate(fallbackPath || '/');
    }

    // Otherwise go back the requested number of steps
    return originalNavigate(delta);
  }, [originalNavigate]);

  const navigate = useCallback((
    to: To | number,
    options?: SafeNavigateOptions
  ) => {
    // Handle back navigation (negative numbers)
    if (typeof to === 'number' && to < 0) {
      return handleBackNavigation(to, options?.fallbackPath);
    }

    // Forward navigation or string paths
    return originalNavigate(to as To, options);
  }, [originalNavigate, handleBackNavigation]) as SafeNavigateFunction;

  // Add helper methods
  navigate.goBack = useCallback((fallbackPath: string = '/') => {
    handleBackNavigation(-1, fallbackPath);
  }, [handleBackNavigation]);

  navigate.safe = useCallback((to: To, options?: SafeNavigateOptions) => {
    // For forward navigation that might want safety checks in future
    return originalNavigate(to, options);
  }, [originalNavigate]);

  navigate.replace = useCallback((to: To, options?: Omit<SafeNavigateOptions, 'replace'>) => {
    return originalNavigate(to, { ...options, replace: true });
  }, [originalNavigate]);

  return navigate;
};

//export default useNavigate;