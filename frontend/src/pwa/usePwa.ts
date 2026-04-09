import { useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';

/**
 * Registers the Vite PWA service worker and bridges SW lifecycle events
 * to the app's toast notification system.
 *
 * Must be called from a component inside <ToastProvider>.
 * Call once, high in the tree (e.g. App.tsx).
 */
export function usePwa(): void {
  const { withActions, /*success,*/ info } = useToast();
  const initialized = useRef(false);

  useEffect(() => {
    // Strict-mode double-invoke guard + SSR safety
    if (initialized.current || !('serviceWorker' in navigator)) return;
    initialized.current = true;

    let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

    // Dynamic import keeps this out of the initial bundle and away from
    // test/SSR environments where the virtual module doesn't exist.
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        updateSW = registerSW({
          // Don't reload automatically — let the user decide.
          immediate: false,

          // A new SW has installed and is waiting to activate.
          onNeedRefresh() {
            withActions(
              'Nuova versione disponibile.',
              [
                {
                  label: 'Aggiorna ora',
                  onClick: () => {
                    updateSW?.(true); // skipWaiting + reload
                  },
                },
              ],
              'info',
              { duration: Infinity }
            );
          },

          // All assets have been precached; app works fully offline.
          onOfflineReady() {
            info("App pronta per l'uso offline!", { duration: 4000 });
          },

          onRegisteredSW(_swScriptUrl, registration) {
            if (!registration) return;
            // Poll for updates every hour (Fly.io deployments don't push).
            setInterval(() => {
              registration.update().catch(() => {
                // Ignore update-check failures when offline.
              });
            }, 60 * 60 * 1000);
          },

          onRegisterError(error) {
            console.error('[SW] Registration error:', error);
          },
        });
      })
      .catch((err) => {
        // virtual:pwa-register is absent in tests / non-Vite environments.
        console.debug('[PWA] SW registration skipped:', err);
      });
  }, []); // toast functions are stable refs — no dep needed
}
