'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MultiDayPlan } from '@/types/intelligent-planning';
import api from '@/lib/api';

type PlanReviewStepProps = {
  sessionId: string;
  onConfirm: () => void;
  onCancel: () => void;
  onBackToInput?: () => void;
  loading: boolean;
  error: string | null;
};

type EditTarget = {
  blockId: string;
  dayDate: string;
  blockTitle: string;
};

export default function PlanReviewStep({
  sessionId,
  onConfirm,
  onCancel,
  onBackToInput,
  loading,
  error,
}: PlanReviewStepProps) {
  const [plan, setPlan] = useState<MultiDayPlan | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [editingEvent, setEditingEvent] = useState<EditTarget | null>(null);
  const [editTime, setEditTime] = useState<{ start: string; end: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [hasRepeatedTasks, setHasRepeatedTasks] = useState(false);
  const [updateAllInstances, setUpdateAllInstances] = useState(false);

  useEffect(() => {
    loadPlan();
  }, [sessionId]);

  const loadPlan = async () => {
    try {
      const response = await api.get<{ plan: MultiDayPlan }>(`/ai/intelligent-planning/${sessionId}/plan`);
      const loadedPlan = response.data.plan;
      setPlan(loadedPlan);

      const blockTitles = new Map<string, number>();
      loadedPlan.days.forEach((day) => {
        day.plan.bloques.forEach((block) => {
          const count = blockTitles.get(block.titulo) || 0;
          blockTitles.set(block.titulo, count + 1);
        });
      });
      const hasRepeated = Array.from(blockTitles.values()).some((count) => count > 1);
      setHasRepeatedTasks(hasRepeated);

      const firstDayWithBlocks = loadedPlan.days.find((d) => d.plan.bloques.length > 0);
      if (firstDayWithBlocks) {
        setSelectedDate(firstDayWithBlocks.date);
      }
    } catch (err: any) {
      console.error('Error cargando plan:', err);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleEditTime = (block: { id: string; titulo: string; inicio: string; fin: string }, dayDate: string) => {
    setEditingEvent({ blockId: block.id, dayDate, blockTitle: block.titulo });
    setEditTime({ start: block.inicio, end: block.fin });
    setShowEditModal(true);
  };

  const handleSaveTimeEdit = async () => {
    if (!editingEvent || !editTime || !plan) return;

    const updatedPlan: MultiDayPlan = JSON.parse(JSON.stringify(plan));
    const dayToUpdate = updatedPlan.days.find((d) => d.date === editingEvent.dayDate);
    if (dayToUpdate) {
      const blockToUpdate = dayToUpdate.plan.bloques.find((b) => b.id === editingEvent.blockId)
        || dayToUpdate.plan.bloques.find((b) => b.titulo === editingEvent.blockTitle);
      if (blockToUpdate) {
        blockToUpdate.inicio = editTime.start;
        blockToUpdate.fin = editTime.end;
      }
    }

    if (hasRepeatedTasks && updateAllInstances) {
      updatedPlan.days.forEach((day) => {
        if (day.date > editingEvent.dayDate) {
          day.plan.bloques.forEach((block) => {
            if (block.titulo === editingEvent.blockTitle) {
              block.inicio = editTime.start;
              block.fin = editTime.end;
            }
          });
        }
      });
    }

    try {
      await api.put(`/ai/intelligent-planning/${sessionId}/plan`, { plan: updatedPlan });
      setPlan(updatedPlan);
    } catch (err) {
      console.error('Error actualizando plan:', err);
      setPlan(updatedPlan);
    }

    setShowEditModal(false);
    setEditingEvent(null);
    setEditTime(null);
    setUpdateAllInstances(false);
  };

  const countRepeatedInstances = (blockTitle: string, fromDate: string): number => {
    if (!plan) return 0;
    return plan.days.filter((d) =>
      d.date >= fromDate &&
      d.plan.bloques.some((b) => b.titulo === blockTitle)
    ).length;
  };

  if (loadingPlan) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="intelligent-step"
      >
        <div className="intelligent-step__header">
          <h2 className="intelligent-step__title">Generando tu plan...</h2>
        </div>
      </motion.div>
    );
  }

  if (!plan) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="intelligent-step"
      >
        <div className="intelligent-step__header">
          <h2 className="intelligent-step__title">Error</h2>
          <p className="intelligent-step__subtitle">No se pudo cargar el plan.</p>
        </div>
      </motion.div>
    );
  }

  const selectedDay = plan.days.find((d) => d.date === selectedDate);
  const minDate = plan.days[0]?.date;
  const maxDate = plan.days[plan.days.length - 1]?.date;

  const calendarDates: string[] = [];
  if (minDate && maxDate) {
    const start = parseISO(minDate);
    const end = parseISO(maxDate);
    let current = start;
    while (current <= end) {
      calendarDates.push(format(current, 'yyyy-MM-dd'));
      current = addDays(current, 1);
    }
  }

  const totalBlocks = plan.days.reduce((sum, day) => sum + day.plan.bloques.length, 0);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="intelligent-step"
      >
        <div className="plan-confirming-overlay">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="plan-confirming-content"
          >
            <div className="plan-confirming-spinner">
              <div className="plan-confirming-spinner__ring">
                <div className="plan-confirming-spinner__ring-inner" />
              </div>
              <div className="plan-confirming-spinner__glow" />
            </div>
            <div className="plan-confirming-text">
              <h2 className="plan-confirming-title">Guardando tu plan</h2>
              <p className="plan-confirming-subtitle">
                Estamos agregando los bloques a tu calendario y verificando que no haya conflictos...
              </p>
            </div>
            <div className="plan-confirming-progress">
              <motion.div
                className="plan-confirming-progress__bar"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <div className="plan-confirming-steps">
              <motion.div
                className="plan-confirming-step"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
              >
                <div className="plan-confirming-step__dot" />
                <span>Verificando bloques existentes</span>
              </motion.div>
              <motion.div
                className="plan-confirming-step"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.3, repeatType: 'reverse' }}
              >
                <div className="plan-confirming-step__dot" />
                <span>Creando nuevos bloques</span>
              </motion.div>
              <motion.div
                className="plan-confirming-step"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.6, repeatType: 'reverse' }}
              >
                <div className="plan-confirming-step__dot" />
                <span>Finalizando...</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="day-form-modal"
    >
      <div className="day-form-modal__header">
        <div>
          <h2 className="day-form-modal__title">Tu plan esta listo</h2>
          <p className="day-form-modal__date">
            Revisa los dias y los bloques que se agregaran a tu calendario.
          </p>
        </div>
      </div>

      <div className="day-form-modal__scroll">
        <div className="day-form-modal__content">
          <div className="plan-mini-calendar">
            <div className="plan-mini-calendar__grid">
              {calendarDates.map((dateStr) => {
                const day = plan.days.find((d) => d.date === dateStr);
                const isSelected = selectedDate === dateStr;
                const hasNew = (day?.plan.bloques.length || 0) > 0;

                return (
                  <button
                    key={dateStr}
                    className={`plan-mini-calendar__day ${isSelected ? 'plan-mini-calendar__day--selected' : ''} ${hasNew ? 'plan-mini-calendar__day--has-new' : ''}`}
                    onClick={() => setSelectedDate(dateStr)}
                  >
                    <span className="plan-mini-calendar__day-number">
                      {format(parseISO(dateStr), 'd')}
                    </span>
                    <span className="plan-mini-calendar__day-name">
                      {format(parseISO(dateStr), 'EEE', { locale: es })}
                    </span>
                    {hasNew && (
                      <span className="plan-mini-calendar__day-indicator plan-mini-calendar__day-indicator--new" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDay && (
            <div className="plan-day-detail">
              <h3 className="plan-day-detail__title">
                {format(parseISO(selectedDay.date), "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <div className="plan-day-detail__events">
                {selectedDay.plan.bloques.map((block, idx) => {
                  const isRepeated = hasRepeatedTasks &&
                    countRepeatedInstances(block.titulo, selectedDay.date) > 1;

                  return (
                    <motion.div
                      key={block.id || idx}
                      className="plan-event plan-event--new plan-event--editable"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="plan-event__header">
                        <h4 className="plan-event__title">{block.titulo}</h4>
                        <span className="plan-event__badge">Nuevo</span>
                      </div>
                      <div className="plan-event__meta">
                        <span className="plan-event__time">
                          {block.inicio} - {block.fin}
                        </span>
                        {isRepeated && (
                          <span className="plan-event__efficiency plan-event__efficiency--ok_slot">
                            Repetido
                          </span>
                        )}
                      </div>
                      {block.descripcion && (
                        <p className="plan-event__description">{block.descripcion}</p>
                      )}
                      <div className="plan-event__edit-overlay">
                        <button
                          type="button"
                          className="plan-event__edit-btn"
                          onClick={() => handleEditTime(block, selectedDay.date)}
                          title="Editar horario"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Editar horario
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="plan-summary">
            <div className="plan-summary__item">
              <span className="plan-summary__label">Bloques nuevos:</span>
              <span className="plan-summary__value">{totalBlocks}</span>
            </div>
            <div className="plan-summary__item">
              <span className="plan-summary__label">Dias afectados:</span>
              <span className="plan-summary__value">{plan.days.length}</span>
            </div>
          </div>

          {error && (
            <div className="intelligent-step__error">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="day-form-modal__footer">
        <div className="intelligent-step__footer-right">
          <button
            type="button"
            className="day-form-modal__btn day-form-modal__btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="day-form-modal__btn day-form-modal__btn--primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Confirmar y guardar'}
          </button>
        </div>
      </div>

      {onBackToInput && (
        <button
          type="button"
          className="plan-back-to-input-btn"
          onClick={onBackToInput}
          disabled={loading}
          title="Volver a editar el texto original"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {showEditModal && editingEvent && editTime && (
        <div className="plan-edit-time-overlay" onClick={() => {
          setShowEditModal(false);
          setEditingEvent(null);
          setEditTime(null);
          setUpdateAllInstances(false);
        }}>
          <div className="plan-edit-time-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="plan-edit-time-title">Editar horario</h3>
            <p className="plan-edit-time-subtitle">{editingEvent.blockTitle}</p>

            {hasRepeatedTasks && countRepeatedInstances(editingEvent.blockTitle, editingEvent.dayDate) > 1 && (
              <div className="plan-edit-time-warning">
                <p>Esta tarea aparece en {countRepeatedInstances(editingEvent.blockTitle, editingEvent.dayDate)} dias.</p>
                <label className="plan-edit-time-checkbox">
                  <input
                    type="checkbox"
                    checked={updateAllInstances}
                    onChange={(e) => setUpdateAllInstances(e.target.checked)}
                  />
                  <span>Cambiar tambien todas las instancias futuras</span>
                </label>
              </div>
            )}

            <div className="plan-edit-time-inputs">
              <div className="plan-edit-time-input-group">
                <label>Inicio</label>
                <input
                  type="time"
                  value={editTime.start}
                  onChange={(e) => setEditTime({ ...editTime, start: e.target.value })}
                />
              </div>
              <div className="plan-edit-time-input-group">
                <label>Fin</label>
                <input
                  type="time"
                  value={editTime.end}
                  onChange={(e) => setEditTime({ ...editTime, end: e.target.value })}
                />
              </div>
            </div>

            <div className="plan-edit-time-actions">
              <button
                type="button"
                className="day-form-modal__btn day-form-modal__btn--ghost"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                  setEditTime(null);
                  setUpdateAllInstances(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="day-form-modal__btn day-form-modal__btn--primary"
                onClick={handleSaveTimeEdit}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
