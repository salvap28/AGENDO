'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

type PlanModeSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'quick' | 'intelligent') => void;
  selectedDate?: string | null;
};

export default function PlanModeSelector({
  isOpen,
  onClose,
  onSelectMode,
  selectedDate,
}: PlanModeSelectorProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'hoy';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[1400] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[1401] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="day-form-modal"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{ maxWidth: '600px', width: '100%' }}
            >
              <div className="day-form-modal__header">
                <div>
                  <h3 className="day-form-modal__title">Planeá con Agendo</h3>
                  <p className="day-form-modal__date" style={{ marginTop: '4px' }}>
                    {selectedDate ? `Para ${formatDate(selectedDate)}` : 'Para hoy'}
                  </p>
                </div>
                <button
                  className="day-form-modal__close"
                  onClick={onClose}
                  aria-label="Cerrar"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M15 5L5 15M5 5l10 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="day-form-modal__content" style={{ padding: 'clamp(24px, 3vw, 32px)' }}>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  {/* Opción 1: Planear el día (modo rápido) */}
                  <motion.button
                    className="plan-mode-option"
                    onClick={() => {
                      onSelectMode('quick');
                      onClose();
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="plan-mode-option__icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 2v20M2 12h20"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
                      </svg>
                    </div>
                    <h4 className="plan-mode-option__title">Planear el día</h4>
                    <p className="plan-mode-option__subtitle">
                      Organizá {selectedDate ? formatDate(selectedDate) : 'hoy'} o el día seleccionado, rápido.
                    </p>
                  </motion.button>

                  {/* Opción 2: Planeación inteligente */}
                  <motion.button
                    className="plan-mode-option plan-mode-option--intelligent"
                    onClick={() => {
                      onSelectMode('intelligent');
                      onClose();
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="plan-mode-option__icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <h4 className="plan-mode-option__title">Planeación inteligente</h4>
                    <p className="plan-mode-option__subtitle">
                      Usá texto o audio para organizar varios días con IA.
                    </p>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}








