'use client';

import { motion } from 'framer-motion';
import { usePlanStore } from '@/stores/planStore';

export default function StepAclaracion() {
  const { aclaracionFinal, setAclaracionFinal } = usePlanStore();

  return (
    <div className="plan-step">
      <h2 className="plan-step-title">Aclaración final</h2>
      <p className="plan-step-subtitle">
        Contanos cualquier detalle adicional que querés que consideremos
      </p>

      <motion.div
        className="plan-textarea-container"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <textarea
          className="plan-textarea"
          placeholder="Ej: Tengo una reunión a las 15:00 que no puedo mover, necesito terminar el proyecto X antes del mediodía, prefiero bloques de 90 minutos..."
          value={aclaracionFinal}
          onChange={(e) => setAclaracionFinal(e.target.value)}
          rows={8}
        />
        <p className="plan-textarea-hint">
          Este texto tiene prioridad absoluta. Todo lo que escribas aquí será considerado en el plan.
        </p>
      </motion.div>
    </div>
  );
}











