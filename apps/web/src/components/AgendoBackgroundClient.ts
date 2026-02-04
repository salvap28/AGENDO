// apps/web/src/components/AgendoBackgroundClient.ts
'use client';
import dynamic from 'next/dynamic';

// Exportá el componente ya con ssr desactivado
const AgendoBackgroundClient = dynamic(() => import('./AgendoBackground'), {
  ssr: false,
});

export default AgendoBackgroundClient;
