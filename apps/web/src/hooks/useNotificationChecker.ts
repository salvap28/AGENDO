import { useEffect, useRef } from 'react';
import api from '@/lib/api';

/**
 * Hook que verifica periódicamente si hay notificaciones pendientes
 * y las envía al usuario
 */
export function useNotificationChecker() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Verificar cada minuto
    const checkInterval = 60 * 1000; // 1 minuto

    const checkNotifications = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('agendo_token') : null;
        if (!token) {
          console.log('[useNotificationChecker] No token found, skipping check');
          return;
        }

        console.log('[useNotificationChecker] Checking for notifications...');
        
        // Llamar al endpoint del backend para verificar y enviar notificaciones
        // Usar la misma configuración de API que el resto de la app
        const response = await api.post('/notifications/check', {});

        console.log('[useNotificationChecker] Response:', response.data);
        
        if (response.data) {
          if (response.data.sent > 0) {
            console.log(`[useNotificationChecker] ✓ ${response.data.sent} notification(s) sent`);
            if (response.data.results && response.data.results.length > 0) {
              console.log('[useNotificationChecker] Results:', response.data.results);
            }
          } else {
            console.log(`[useNotificationChecker] No notifications to send (checked ${response.data.checked} items)`);
            console.log('[useNotificationChecker] This could mean:');
            console.log('  - The notification time hasn\'t arrived yet');
            console.log('  - The notification time has already passed');
            console.log('  - The time difference is outside the ±5 minute window');
            console.log('  - Check server logs for detailed timing information');
          }
        }
      } catch (error: any) {
        console.error('[useNotificationChecker] Error checking notifications:', error);
        if (error?.response) {
          console.error('[useNotificationChecker] Response error:', error.response.status, error.response.data);
        }
      }
    };

    // Ejecutar inmediatamente al montar
    checkNotifications();

    // Configurar intervalo
    intervalRef.current = setInterval(checkNotifications, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

