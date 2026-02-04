'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlanStore } from '@/stores/planStore';
import PlanExitModal from './PlanExitModal';
import api from '@/lib/api';

export default function PlanResult() {
  const router = useRouter();
  const { 
    planGenerado, 
    reset, 
    setLoading, 
    setError, 
    goToStep, 
    setPlanGenerado,
    quiereNotificaciones,
    cantidadNotificaciones,
    tiemposNotificaciones,
    tareasPersonalizadas,
    fechaSeleccionada,
  } = usePlanStore();
  const [isApplying, setIsApplying] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackLiked, setFeedbackLiked] = useState<boolean | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  if (!planGenerado) {
    return null;
  }

  const handleApply = async () => {
    setIsApplying(true);
    setLoading(true);
    setError(null);

    try {
      const fecha = fechaSeleccionada || new Date().toISOString().split('T')[0];
      await api.post('/plan/apply', {
        fecha: fecha,
        plan: planGenerado,
        tareasPersonalizadas,
        quiereNotificaciones,
        cantidadNotificaciones,
        tiemposNotificaciones,
      });

      // Limpiar progreso guardado y resetear el store
      localStorage.removeItem('agendo_plan_progress');
      // Mostrar el formulario de feedback antes de salir
      setShowFeedback(true);
    } catch (err: any) {
      console.error('Error aplicando plan:', err);
      setError(err.response?.data?.error || 'Error al aplicar el plan. Por favor, intentá de nuevo.');
    } finally {
      setIsApplying(false);
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setPlanGenerado(null);
    goToStep(8);
  };

  const handleModify = () => {
    setPlanGenerado(null);
    goToStep(1);
  };

  const handleCancel = () => {
    // Si hay un plan generado, siempre mostrar el modal
    if (planGenerado) {
      setShowExitModal(true);
    } else {
      // Si no hay plan, salir directamente
      reset();
      router.push('/calendario');
    }
  };

  const handleExitWithoutSaving = () => {
    reset();
    setShowExitModal(false);
    router.push('/calendario');
  };

  const handleSubmitFeedback = async () => {
    if (feedbackLiked === null) return;
    
    setIsSubmittingFeedback(true);
    try {
      await api.post('/plan/feedback', {
        liked: feedbackLiked,
        comment: feedbackComment.trim() || undefined,
        planData: planGenerado, // Enviar los datos del plan para referencia
      });
      
      // Después de enviar el feedback, redirigir
      reset();
      router.push('/calendario');
    } catch (err: any) {
      console.error('Error enviando feedback:', err);
      // Aún así, redirigir al calendario
      reset();
      router.push('/calendario');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleSkipFeedback = () => {
    reset();
    router.push('/calendario');
  };

  return (
    <main className="plan-page">
      <div className="plan-result">
      <header className="plan-result-header">
        <div className="plan-result-header-content">
          <h1 className="plan-result-title">Tu plan generado</h1>
          <p className="plan-result-subtitle">Revisá y aplicá tu plan del día</p>
        </div>
        <button
          type="button"
          className="plan-close-button"
          onClick={handleCancel}
          aria-label="Cancelar y salir"
          title="Cancelar y salir"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>

      {/* Resumen */}
      {planGenerado.resumen && (
        <motion.div
          className="plan-result-summary"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3>Resumen</h3>
          <p>{planGenerado.resumen}</p>
        </motion.div>
      )}

      {/* Explicación */}
      {planGenerado.explicacion && (
        <motion.div
          className="plan-result-explanation"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3>Explicación del plan</h3>
          <p>{planGenerado.explicacion}</p>
        </motion.div>
      )}

      {/* Bloques */}
      <div className="plan-result-blocks">
        <h3>Bloques del día</h3>
        {planGenerado.bloques.map((bloque, index) => (
          <motion.div
            key={bloque.id}
            className="plan-result-block"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <div className="plan-result-block-header">
              <div className="plan-result-block-time">
                <span>{bloque.inicio}</span>
                <span className="plan-result-block-separator">→</span>
                <span>{bloque.fin}</span>
              </div>
              <span className="plan-result-block-foco">{bloque.foco}</span>
            </div>
            <h4 className="plan-result-block-title">{bloque.titulo}</h4>
            {bloque.descripcion && (
              <p className="plan-result-block-desc">{bloque.descripcion}</p>
            )}
            {bloque.tareas.length > 0 && (
              <div className="plan-result-block-tasks">
                <p className="plan-result-block-tasks-label">Tareas:</p>
                <ul>
                  {bloque.tareas.map((tareaId) => {
                    const tarea = planGenerado.tareasAsignadas.find((t) => t.id === tareaId);
                    return tarea ? (
                      <li key={tareaId}>{tarea.titulo}</li>
                    ) : null;
                  })}
                </ul>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Descansos */}
      {planGenerado.descansos.length > 0 && (
        <div className="plan-result-descansos">
          <h3>Descansos programados</h3>
          {planGenerado.descansos.map((descanso, index) => (
            <motion.div
              key={index}
              className="plan-result-descanso"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <div className="plan-result-descanso-time">
                {descanso.inicio} - {descanso.fin}
              </div>
              <div className="plan-result-descanso-type">
                <span className="plan-result-descanso-indicator" data-type={descanso.tipo} />
                <span>{descanso.tipo === 'corto' ? 'Pausa corta' : 'Descanso largo'}</span>
              </div>
              {descanso.descripcion && (
                <p className="plan-result-descanso-desc">{descanso.descripcion}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Recomendaciones */}
      {planGenerado.recomendaciones.length > 0 && (
        <div className="plan-result-recommendations">
          <h3>Recomendaciones</h3>
          <ul>
              {planGenerado.recomendaciones.map((rec, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <span className="plan-result-recommendation-indicator" />
                {rec}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Acciones */}
      <div className="plan-result-actions">
        <motion.button
          type="button"
          className="plan-btn plan-btn--primary plan-btn--apply"
          onClick={handleApply}
          disabled={isApplying}
          whileHover={!isApplying ? { scale: 1.02 } : {}}
          whileTap={!isApplying ? { scale: 0.98 } : {}}
        >
          {isApplying ? (
            <>
              <span className="plan-btn-spinner" />
              Aplicando plan...
            </>
          ) : (
            'Aplicar plan a mi día'
          )}
        </motion.button>

        <div className="plan-result-actions-secondary">
          <motion.button
            type="button"
            className="plan-btn plan-btn--secondary"
            onClick={handleModify}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Modificar plan
          </motion.button>
          <motion.button
            type="button"
            className="plan-btn plan-btn--secondary"
            onClick={handleRegenerate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Regenerar plan
          </motion.button>
        </div>
      </div>

      <PlanExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onExitWithoutSaving={handleExitWithoutSaving}
        isResultView={true}
      />

      {/* Modal de Feedback */}
      {showFeedback && (
        <motion.div
          className="plan-feedback-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleSkipFeedback();
          }}
        >
          <motion.div
            className="plan-feedback-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="plan-feedback-title">¿Te gustó el plan generado?</h3>
            <p className="plan-feedback-subtitle">Tu opinión nos ayuda a mejorar</p>

            <div className="plan-feedback-actions">
              <motion.button
                type="button"
                className={`plan-feedback-btn plan-feedback-btn--like ${feedbackLiked === true ? 'is-active' : ''}`}
                onClick={() => setFeedbackLiked(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="plan-feedback-icon">👍</span>
                <span>Me gustó</span>
              </motion.button>
              <motion.button
                type="button"
                className={`plan-feedback-btn plan-feedback-btn--dislike ${feedbackLiked === false ? 'is-active' : ''}`}
                onClick={() => setFeedbackLiked(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="plan-feedback-icon">👎</span>
                <span>No me gustó</span>
              </motion.button>
            </div>

            <div className="plan-feedback-comment">
              <label className="plan-feedback-label">¿Querés contarnos algo más? (opcional)</label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Tu opinión es valiosa para nosotros..."
                className="plan-feedback-textarea"
                rows={4}
                maxLength={500}
              />
              <span className="plan-feedback-char-count">{feedbackComment.length}/500</span>
            </div>

            <div className="plan-feedback-submit-actions">
              <button
                type="button"
                className="plan-btn plan-btn--secondary"
                onClick={handleSkipFeedback}
                disabled={isSubmittingFeedback}
              >
                Omitir
              </button>
              <button
                type="button"
                className="plan-btn plan-btn--primary"
                onClick={handleSubmitFeedback}
                disabled={feedbackLiked === null || isSubmittingFeedback}
              >
                {isSubmittingFeedback ? 'Enviando...' : 'Enviar feedback'}
              </button>
            </div>
          </motion.div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

