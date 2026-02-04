'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

type PlanExistingBlocksModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onDeleteBlocks: () => void;
  onKeepBlocks: () => void;
  blocksCount: number;
  date: string;
};

export default function PlanExistingBlocksModal({
  isOpen,
  onClose,
  onDeleteBlocks,
  onKeepBlocks,
  blocksCount,
  date,
}: PlanExistingBlocksModalProps) {
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

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="plan-existing-blocks-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ zIndex: 10000 }}
        >
          <motion.div
            className="plan-existing-blocks-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="plan-existing-blocks-title">
              Ya tenés bloques planificados
            </h2>
            <p className="plan-existing-blocks-subtitle">
              Encontré <strong>{blocksCount} bloque{blocksCount !== 1 ? 's' : ''}</strong> para el{' '}
              <strong>{formatDate(date)}</strong>.
            </p>
            <p className="plan-existing-blocks-question">
              ¿Qué querés hacer?
            </p>
            
            <div className="plan-existing-blocks-options">
              <motion.button
                type="button"
                className="plan-existing-blocks-option plan-existing-blocks-option--delete"
                onClick={onDeleteBlocks}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="plan-existing-blocks-option-content">
                  <span className="plan-existing-blocks-option-icon">🗑️</span>
                  <div>
                    <h3>Eliminar bloques existentes</h3>
                    <p>Se eliminarán todos los bloques de este día y se generará un plan nuevo desde cero.</p>
                  </div>
                </div>
              </motion.button>
              
              <motion.button
                type="button"
                className="plan-existing-blocks-option plan-existing-blocks-option--keep"
                onClick={onKeepBlocks}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="plan-existing-blocks-option-content">
                  <span className="plan-existing-blocks-option-icon">✨</span>
                  <div>
                    <h3>Tenerlos en cuenta</h3>
                    <p>Agendo considerará tus bloques existentes al generar el nuevo plan.</p>
                  </div>
                </div>
              </motion.button>
            </div>

            <button
              type="button"
              className="plan-existing-blocks-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

