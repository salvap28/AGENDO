'use client';

import { motion } from 'framer-motion';
import { usePlanStore } from '@/stores/planStore';

export default function StepDescansos() {
  const { incluirDescansos, setIncluirDescansos } = usePlanStore();

  return (
    <div className="plan-step">
      <h2 className="plan-step-title">¿Incluir descansos programados?</h2>
      <p className="plan-step-subtitle">
        Podemos agregar pausas estratégicas para mantener tu energía
      </p>

      <div className="plan-switch-container">
        <motion.button
          type="button"
          className={`plan-switch ${incluirDescansos ? 'is-on' : ''}`}
          onClick={() => setIncluirDescansos(!incluirDescansos)}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            className="plan-switch-thumb"
            animate={{ x: incluirDescansos ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </motion.button>
        <span className="plan-switch-label">
          {incluirDescansos ? 'Sí, incluir descansos' : 'No, sin descansos programados'}
        </span>
      </div>

      {incluirDescansos && (
        <motion.div
          className="plan-descansos-info"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p>✨ Se agregarán pausas cortas y largas según tu intensidad del día</p>
        </motion.div>
      )}
    </div>
  );
}











