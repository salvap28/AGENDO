"use client";

import React, { useState } from 'react';
import { askNotificationPermission, registerPushSubscription } from '@/lib/notifications';

export default function NotificationsToggle() {
  const [status, setStatus] = useState<string>('idle');

  // Prefer same-origin API for subscription routes so we hit the web app's own /api routes.
  // This component is client-side, so we can use window.location.origin as a default.
  const apiBase = (typeof window !== 'undefined' && window.location.origin) || process.env.NEXT_PUBLIC_API_BASE_URL || '';

  async function enable() {
    setStatus('requesting');
    try {
      console.log('[NotificationsToggle] Requesting permission...');
      const perm = await askNotificationPermission();
      console.log('[NotificationsToggle] Permission:', perm);
      
      if (perm !== 'granted') {
        console.warn('[NotificationsToggle] Permission denied:', perm);
        setStatus('denied');
        return;
      }

      console.log('[NotificationsToggle] Registering push subscription...');
      const sub = await registerPushSubscription(apiBase);
      console.log('[NotificationsToggle] Subscription result:', sub ? 'Success' : 'Failed');
      
      if (sub) {
        setStatus('enabled');
      } else {
        setStatus('failed');
      }
    } catch (err) {
      console.error('[NotificationsToggle] Error:', err);
      setStatus('failed');
    }
  }

  return (
    <div>
      <button onClick={enable} className="btn-cal-primary">Activar notificaciones</button>
      <div style={{ marginTop: 8 }}>
        {status === 'idle' && <small>No activado</small>}
        {status === 'requesting' && <small>Solicitando permiso...</small>}
        {status === 'denied' && <small>No permitido por el usuario</small>}
        {status === 'enabled' && <small>Notificaciones activadas</small>}
        {status === 'failed' && <small>No se pudieron activar las notificaciones</small>}
      </div>
    </div>
  );
}
