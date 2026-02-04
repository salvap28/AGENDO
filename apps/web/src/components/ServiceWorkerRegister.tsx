'use client';
import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => {
        if (!registration) {
          navigator.serviceWorker
            .register('/sw.js')
            .then((reg) => {
              console.log('[Agendo] Service worker registered', reg);
              // Import the custom push handler script into the SW
              if (reg.active) {
                reg.active.postMessage({ type: 'IMPORT_CUSTOM' });
              }
            })
            .catch((err) => console.error('[Agendo] SW register error', err));
        } else {
          // SW already registered, inject custom handler if needed
          if (registration.active) {
            registration.active.postMessage({ type: 'IMPORT_CUSTOM' });
          }
        }
      })
      .catch((err) => console.error('[Agendo] SW getRegistration error', err));
  }, []);

  return null;
}
