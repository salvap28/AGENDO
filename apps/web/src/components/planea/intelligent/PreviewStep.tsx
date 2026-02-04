'use client';

import { motion } from 'framer-motion';
import type { TaskPreview } from '@/types/intelligent-planning';

type PreviewStepProps = {
  tasksPreview: TaskPreview[];
  onContinue: () => void;
  onBack: () => void;
  onBackToInput?: () => void;
  loading: boolean;
};

export default function PreviewStep({ tasksPreview, onContinue, onBack, onBackToInput, loading }: PreviewStepProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Sin fecha específica';
    if (dateStr === 'today') return 'Hoy';
    if (dateStr === 'tomorrow') return 'Mañana';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return dateStr;
    }
  };

  const getTaskTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      STUDY: 'Estudio',
      WORK: 'Trabajo',
      PHYSICAL: 'Ejercicio',
      PERSONAL: 'Personal',
      OTHER: 'Otro',
    };
    return labels[type || 'OTHER'] || 'Otro';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="intelligent-step"
    >
      <div className="intelligent-step__header">
        <h2 className="intelligent-step__title">Esto entendí</h2>
        <p className="intelligent-step__subtitle">
          Revisa las tareas que detecte. Para dejar todo bien armado, voy a hacerte algunas preguntas rapidas (maximo 4).
        </p>
      </div>

      <div className="intelligent-step__content">
        <div className="tasks-preview-grid">
          {tasksPreview.map((task) => (
            <motion.div
              key={task.id}
              className="task-preview-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: tasksPreview.indexOf(task) * 0.05 }}
            >
              <div className="task-preview-card__header">
                <h4 className="task-preview-card__title">{task.title}</h4>
                {task.confidence < 0.7 && (
                  <span className="task-preview-card__confidence">Baja confianza</span>
                )}
              </div>
              <div className="task-preview-card__meta">
                {task.detectedDate && (
                  <span className="task-preview-card__date">
                    📅 {formatDate(task.detectedDate)}
                  </span>
                )}
                {task.taskType && (
                  <span className="task-preview-card__type">
                    {getTaskTypeLabel(task.taskType)}
                  </span>
                )}
                {task.estimatedDuration && (
                  <span className="task-preview-card__duration">
                    ⏱️ ~{task.estimatedDuration} min
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="intelligent-step__footer">
        <div className="intelligent-step__footer-left">
          {onBackToInput ? (
            <button
              type="button"
              className="day-form-modal__btn day-form-modal__btn--ghost"
              onClick={onBackToInput}
              disabled={loading}
              title="Volver a editar el texto original"
            >
              ← Volver al inicio
            </button>
          ) : (
            <button
              type="button"
              className="day-form-modal__btn day-form-modal__btn--ghost"
              onClick={onBack}
              disabled={loading}
            >
              Volver
            </button>
          )}
        </div>
        <div className="intelligent-step__footer-right">
          <button
            type="button"
            className="day-form-modal__btn day-form-modal__btn--primary"
            onClick={onContinue}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Seguir'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

