import { useNavigate as useOriginalNavigate, NavigateOptions, To } from 'react-router-dom';
import { useCallback } from 'react';

// Calcolata una volta sola all'importazione del modulo
const initialHistoryLength = window.history.length;

type SafeNavigateFunction = {
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
    if (typeof to === 'number') {
      if (to < 0) {
        // Calcola quanti step interni ci sono nello stack dall'avvio
        const internalSteps = window.history.length - initialHistoryLength;
        if (internalSteps > 0) {
          // C'è una pagina precedente interna → back normale
          return originalNavigate(to);
        } else {
          // Nessuna pagina interna precedente → fallback
          const fallback = options?.fallbackPath || '/';
          const { fallbackPath, ...restOptions } = options || {};
          return originalNavigate(fallback, restOptions);
        }
      }
      return originalNavigate(to);
    } else {
      const { fallbackPath, ...restOptions } = options || {};
      return originalNavigate(to, restOptions);
    }
  }, [originalNavigate]);

  const navigate = safeNavigate as SafeNavigateFunction;

  navigate.goBack = useCallback((fallbackPath: string = '/') => {
    safeNavigate(-1, { fallbackPath });
  }, [safeNavigate]);

  navigate.goForward = useCallback((delta: number = 1) => {
    originalNavigate(delta);
  }, [originalNavigate]);

  navigate.replace = useCallback((to: To, options?: Omit<NavigateOptions, 'replace'>) => {
    safeNavigate(to, { ...options, replace: true });
  }, [safeNavigate]);

  return navigate;
};

export default useNavigate;
