'use client';

import { motion } from 'framer-motion';
import { usePlanStore, type Intensidad } from '@/stores/planStore';

export default function StepIntensidad() {
  const { intensidad, setIntensidad } = usePlanStore();

  const opciones: { value: Intensidad; label: string; emoji: string; descripcion: string }[] = [
    { value: 'liviana', label: 'Liviana', emoji: '🌿', descripcion: 'Un día relajado y sin presión' },
    { value: 'balanceada', label: 'Balanceada', emoji: '⚖️', descripcion: 'Equilibrio entre trabajo y descanso' },
    { value: 'intensa', label: 'Intensa', emoji: '🔥', descripcion: 'Máximo rendimiento y productividad' },
  ];

  return (
    <div className="plan-step">
      <h2 className="plan-step-title">¿Qué intensidad querés para el día?</h2>
      <p className="plan-step-subtitle">Elegí el ritmo que mejor se adapte a vos</p>

      <div className="plan-options-grid">
        {opciones.map((opcion) => (
          <motion.button
            key={opcion.value}
            type="button"
            className={`plan-option ${intensidad === opcion.value ? 'is-active' : ''}`}
            onClick={() => setIntensidad(opcion.value)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="plan-option-emoji">{opcion.emoji}</span>
            <span className="plan-option-label">{opcion.label}</span>
            <span className="plan-option-desc">{opcion.descripcion}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}











