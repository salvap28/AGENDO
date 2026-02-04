'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePlanStore } from '@/stores/planStore';

type PlanExitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onExitWithoutSaving?: () => void;
  isResultView?: boolean;
};

export default function PlanExitModal({ isOpen, onClose, onExitWithoutSaving, isResultView = false }: PlanExitModalProps) {
  const router = useRouter();
  const { reset, currentStep } = usePlanStore();

  if (!isOpen) return null;

  const handleExitWithoutSaving = () => {
    if (onExitWithoutSaving) {
      onExitWithoutSaving();
    } else {
      reset();
      onClose();
      router.push('/calendario');
    }
  };

  const handleSaveAndExit = () => {
    // Guardar el progreso en localStorage
    const planState = usePlanStore.getState();
    const progressToSave = {
      energia: planState.energia,
      foco: planState.foco,
      tiempoDisponible: planState.tiempoDisponible,
      tiempoParcialDesde: planState.tiempoParcialDesde,
      tiempoParcialHasta: planState.tiempoParcialHasta,
      intensidad: planState.intensidad,
      tareasImportantes: planState.tareasImportantes,
      tareasPersonalizadas: planState.tareasPersonalizadas,
      incluirDescansos: planState.incluirDescansos,
      aclaracionFinal: planState.aclaracionFinal,
      quiereNotificaciones: planState.quiereNotificaciones,
      cantidadNotificaciones: planState.cantidadNotificaciones,
      tiemposNotificaciones: planState.tiemposNotificaciones,
      fechaSeleccionada: planState.fechaSeleccionada,
      currentStep: planState.currentStep,
      savedAt: new Date().toISOString(),
    };
    
    localStorage.setItem('agendo_plan_progress', JSON.stringify(progressToSave));
    reset();
    onClose();
    router.push('/calendario');
  };

  return (
    <motion.div
      className="plan-exit-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="plan-exit-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="plan-exit-modal-title">¿Querés salir del planificador?</h3>
        <p className="plan-exit-modal-description">
          {isResultView 
            ? 'Tenés un plan generado. ¿Qué querés hacer?'
            : `Tenés ${currentStep} de 8 pasos completados. ¿Qué querés hacer?`
          }
        </p>

        <div className="plan-exit-modal-actions">
          {!isResultView && (
            <motion.button
              type="button"
              className="plan-exit-btn plan-exit-btn--save"
              onClick={handleSaveAndExit}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="plan-exit-btn-icon">💾</span>
              <div className="plan-exit-btn-content">
                <span className="plan-exit-btn-title">Guardar y continuar después</span>
                <span className="plan-exit-btn-subtitle">Tu progreso se guardará automáticamente</span>
              </div>
            </motion.button>
          )}

          <motion.button
            type="button"
            className="plan-exit-btn plan-exit-btn--discard"
            onClick={handleExitWithoutSaving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="plan-exit-btn-icon">❌</span>
            <div className="plan-exit-btn-content">
              <span className="plan-exit-btn-title">Salir sin guardar</span>
              <span className="plan-exit-btn-subtitle">Se perderá todo el progreso</span>
            </div>
          </motion.button>
        </div>

        <button
          type="button"
          className="plan-exit-modal-cancel"
          onClick={onClose}
        >
          Continuar planificando
        </button>
      </motion.div>
    </motion.div>
  );
}

