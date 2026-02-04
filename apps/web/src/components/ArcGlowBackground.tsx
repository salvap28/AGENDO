'use client';

import { useEffect, useState } from 'react';

interface ArcGlowBackgroundProps {
  /**
   * Ruta de la imagen PNG del arco violeta
   * @default '/arc-glow.png'
   */
  imagePath?: string;
  /**
   * Intensidad de la capa CORE (0-1)
   * @default 0.85
   */
  coreIntensity?: number;
  /**
   * Intensidad de la capa BLOOM (0-1)
   * @default 0.6
   */
  bloomIntensity?: number;
  /**
   * Intensidad de la capa SPILL (0-1)
   * @default 0.35
   */
  spillIntensity?: number;
  /**
   * Blur de la capa CORE (px)
   * @default 2
   */
  coreBlur?: number;
  /**
   * Blur de la capa BLOOM (px)
   * @default 40
   */
  bloomBlur?: number;
  /**
   * Blur de la capa SPILL (px)
   * @default 120
   */
  spillBlur?: number;
  /**
   * Escala de la capa SPILL (para bañar el fondo)
   * @default 1.15
   */
  spillScale?: number;
}

export default function ArcGlowBackground({
  imagePath = '/arc-glow.png',
  coreIntensity = 0.85,
  bloomIntensity = 0.6,
  spillIntensity = 0.35,
  coreBlur = 2,
  bloomBlur = 40,
  spillBlur = 120,
  spillScale = 1.15,
}: ArcGlowBackgroundProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Detectar prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Verificar que la imagen se carga
  useEffect(() => {
    const img = new Image();
    img.src = imagePath;
    img.onload = () => {
      setImageLoaded(true);
      console.log('[ArcGlow] Imagen cargada correctamente:', imagePath);
    };
    img.onerror = () => {
      console.error('[ArcGlow] Error cargando imagen:', imagePath);
    };
  }, [imagePath]);

  return (
    <div className="arc-glow-container" aria-hidden="true">
      {/* Capa SPILL - Ambiental grande (aparece último, se va último) */}
      <div
        className="arc-glow-layer arc-glow-spill"
        style={{
          backgroundImage: `url(${imagePath})`,
          filter: `blur(${spillBlur}px)`,
          mixBlendMode: 'normal',
          '--spill-scale': spillScale,
          backgroundColor: 'transparent',
        } as React.CSSProperties}
      />

      {/* Capa BLOOM - Medio (aparece segundo) */}
      <div
        className="arc-glow-layer arc-glow-bloom"
        style={{
          backgroundImage: `url(${imagePath})`,
          filter: `blur(${bloomBlur}px)`,
          mixBlendMode: 'normal',
          backgroundColor: 'transparent',
        }}
      />

      {/* Capa CORE - Más brillante (aparece primero) */}
      <div
        className="arc-glow-layer arc-glow-core"
        style={{
          backgroundImage: `url(${imagePath})`,
          filter: `blur(${coreBlur}px)`,
          mixBlendMode: 'normal',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
}

