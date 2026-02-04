'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlanStore } from '@/stores/planStore';
import { getFocuses, type Focus } from '@/lib/api/focuses';
import clsx from 'clsx';

export default function StepFoco() {
  const { foco, setFoco } = usePlanStore();
  const [focuses, setFocuses] = useState<Focus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFocuses() {
      try {
        const data = await getFocuses();
        setFocuses(data);
      } catch (error) {
        console.error('Error cargando focos:', error);
      } finally {
        setLoading(false);
      }
    }
    loadFocuses();
  }, []);

  const getRgbaFromHex = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  if (loading) {
    return (
      <div className="plan-step">
        <h2 className="plan-step-title">Cargando focos...</h2>
      </div>
    );
  }

  return (
    <div className="plan-step">
      <h2 className="plan-step-title">¿Cuál es tu foco del día?</h2>
      <p className="plan-step-subtitle">Elegí el foco principal para hoy</p>

      <div className="plan-focus-grid">
        {focuses.map((focus) => {
          const isActive = foco === focus.name;
          const isSystem = focus.isSystem;
          const customColor = focus.color && !isSystem ? focus.color : undefined;

          const activeStyle: React.CSSProperties = isActive && customColor ? {
            borderColor: getRgbaFromHex(customColor, 0.7),
            background: getRgbaFromHex(customColor, 0.2),
            boxShadow: `0 20px 50px ${getRgbaFromHex(customColor, 0.35)}`,
          } : isActive && isSystem ? {
            borderColor: 'rgba(255, 255, 255, 0.7)',
            background: 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 50px rgba(255, 255, 255, 0.35)',
          } : {};

          return (
            <motion.button
              key={focus.id}
              type="button"
              className={clsx('plan-focus-option', isActive && 'is-active', isSystem && 'is-system')}
              onClick={() => setFoco(focus.name)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={activeStyle}
            >
              {focus.emoji && <span className="plan-focus-emoji">{focus.emoji}</span>}
              <span className="plan-focus-label">{focus.name}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}











