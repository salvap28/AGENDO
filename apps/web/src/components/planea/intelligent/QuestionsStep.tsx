'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IntelligentPlanningSession, PlanningQuestion } from '@/types/intelligent-planning';

type QuestionsStepProps = {
  session: IntelligentPlanningSession;
  onAnswer: (questionId: string, optionId?: string, customValue?: string, freeText?: string) => void;
  onBack: () => void;
  onBackToInput?: () => void;
  loading: boolean;
  error: string | null;
};

export default function QuestionsStep({
  session,
  onAnswer,
  onBack,
  onBackToInput,
  loading,
  error,
}: QuestionsStepProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState<string>('');
  const [freeText, setFreeText] = useState<string>('');
  const currentQuestion = session.currentQuestion;

  useEffect(() => {
    // Resetear selección cuando cambia la pregunta
    setSelectedOptionId(null);
    setCustomValue('');
    setFreeText('');
  }, [currentQuestion?.id]);

  const handleOptionSelect = (optionId: string) => {
    setSelectedOptionId(optionId);
    // Si la opción no permite custom value, limpiar el campo custom
    const option = currentQuestion?.options.find((opt) => opt.id === optionId);
    if (!option?.allowsCustomValue) {
      setCustomValue('');
    }
  };

  const handleContinue = () => {
    if (!currentQuestion) return;

    // Validar que haya una respuesta
    if (currentQuestion.allowFreeTextAlone) {
      // Si permite texto libre solo, puede enviar solo texto libre
      if (freeText.trim()) {
        onAnswer(currentQuestion.id, undefined, undefined, freeText.trim());
        return;
      }
    }

    // Si no hay texto libre permitido o no hay texto libre, necesita opción seleccionada
    if (!selectedOptionId) {
      return;
    }

    const selectedOption = currentQuestion.options.find((opt) => opt.id === selectedOptionId);
    if (!selectedOption) return;

    // Si la opción requiere custom value, validar que esté presente
    if (selectedOption.allowsCustomValue && !customValue.trim()) {
      return;
    }

    // Enviar respuesta
    onAnswer(
      currentQuestion.id,
      selectedOptionId,
      selectedOption.allowsCustomValue ? customValue.trim() : undefined,
      freeText.trim() || undefined
    );
  };

  const handleSkip = () => {
    if (currentQuestion && currentQuestion.canSkip) {
      onAnswer(currentQuestion.id);
    }
  };

  if (!currentQuestion) {
    return null;
  }

  const selectedOption = selectedOptionId
    ? currentQuestion.options.find((opt) => opt.id === selectedOptionId)
    : null;
  const showCustomInput = selectedOption?.allowsCustomValue === true;
  const canSubmit =
    (currentQuestion.allowFreeTextAlone && freeText.trim()) ||
    (selectedOptionId && (!selectedOption?.allowsCustomValue || customValue.trim()));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="intelligent-step"
    >
      <div className="intelligent-step__header">
        <h2 className="intelligent-step__title">{currentQuestion.text}</h2>
        {currentQuestion.relatedTaskId && (
          <p className="intelligent-step__subtitle" style={{ fontSize: '0.875rem', marginTop: '8px' }}>
            Relacionado con una tarea específica
          </p>
        )}
      </div>

      <div className="intelligent-step__content">
        {/* Opciones como chips */}
        {currentQuestion.options.length > 0 && (
          <div className="question-options" style={{ marginBottom: currentQuestion.allowFreeTextAlone ? '24px' : '0' }}>
            {currentQuestion.options.map((option) => (
              <motion.button
                key={option.id}
                className={`question-option ${selectedOptionId === option.id ? 'question-option--selected' : ''}`}
                onClick={() => handleOptionSelect(option.id)}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="question-option__label">{option.label}</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Input para custom value de la opción seleccionada */}
        <AnimatePresence>
          {showCustomInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: currentQuestion.allowFreeTextAlone ? '24px' : '0' }}
            >
              <input
                type="text"
                className="intelligent-input"
                placeholder={`Especificá ${selectedOption?.label.toLowerCase() || 'el valor'}`}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                disabled={loading}
                autoFocus
                style={{ marginTop: '16px' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input para texto libre independiente */}
        <AnimatePresence>
          {currentQuestion.allowFreeTextAlone && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <textarea
                className="intelligent-input"
                placeholder={currentQuestion.freeTextPlaceholder || 'Escribí tu respuesta...'}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                disabled={loading}
                rows={4}
                style={{ marginTop: showCustomInput ? '16px' : '0' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="intelligent-step__error" style={{ marginTop: '16px' }}>
            {error}
          </div>
        )}
      </div>

      <div className="intelligent-step__footer">
        <div className="intelligent-step__footer-left">
          {currentQuestion.canSkip && (
            <button
              type="button"
              className="day-form-modal__btn day-form-modal__btn--ghost"
              onClick={handleSkip}
              disabled={loading}
            >
              Saltá esta / Decidí vos
            </button>
          )}
          {onBackToInput && (
            <button
              type="button"
              className="day-form-modal__btn day-form-modal__btn--ghost"
              onClick={onBackToInput}
              disabled={loading}
              title="Volver a editar el texto original"
            >
              ← Volver al inicio
            </button>
          )}
        </div>
        <div className="intelligent-step__footer-right">
          <button
            type="button"
            className="day-form-modal__btn day-form-modal__btn--ghost"
            onClick={onBack}
            disabled={loading}
          >
            Volver
          </button>
          <button
            type="button"
            className="day-form-modal__btn day-form-modal__btn--primary"
            onClick={handleContinue}
            disabled={!canSubmit || loading}
          >
            {loading ? 'Procesando...' : 'Continuar'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
