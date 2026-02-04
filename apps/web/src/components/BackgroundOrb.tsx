// src/components/BackgroundOrb.tsx
'use client';

import React from 'react';

/**
 * Fondo “orb” inspirado en el que pasaste, con respiración suave.
 * No interfiere con el layout: z-index -1 y pointer-events: none.
 */
export default function BackgroundOrb() {
  return (
    <div aria-hidden className="agendo-orb-bg">
      {/* Capas: resplandor + orbe + viñeta. Los divs vacíos se usan de hooks para las animaciones */}
      <div className="orb__glow" />
      <div className="orb__core" />
      <div className="orb__vignette" />
    </div>
  );
}
