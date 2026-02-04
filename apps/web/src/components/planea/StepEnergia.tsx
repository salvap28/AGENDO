'use client';

import { motion } from 'framer-motion';
import { usePlanStore, type Energia } from '@/stores/planStore';

export default function StepEnergia() {
  const { energia, setEnergia } = usePlanStore();

  const opciones: { value: Energia; label: string; emoji: string; descripcion: string }[] = [
    { value: 'baja', label: 'Baja', emoji: '😴', descripcion: 'Necesito un día tranquilo' },
    { value: 'media', label: 'Media', emoji: '😊', descripcion: 'Un día normal y balanceado' },
    { value: 'alta', label: 'Alta', emoji: '⚡', descripcion: 'Estoy listo para dar lo mejor' },
  ];

  return (
    <div className="plan-step">
      <h2 className="plan-step-title">¿Cómo te sentís hoy?</h2>
      <p className="plan-step-subtitle">Elegí tu nivel de energía para el día</p>

      <div className="plan-options-grid">
        {opciones.map((opcion) => (
          <motion.button
            key={opcion.value}
            type="button"
            className={`plan-option ${energia === opcion.value ? 'is-active' : ''}`}
            onClick={() => setEnergia(opcion.value)}
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











