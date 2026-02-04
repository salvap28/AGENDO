'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Focus, getFocusesForManage, updateFocus, deleteFocus } from '@/lib/api/focuses';
import FocusFormModal from './FocusFormModal';
import clsx from 'clsx';

type FocusManageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onFocusUpdated: () => void;
};

export default function FocusManageModal({ isOpen, onClose, onFocusUpdated }: FocusManageModalProps) {
  const [focuses, setFocuses] = useState<Focus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFocus, setEditingFocus] = useState<Focus | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [focusToDelete, setFocusToDelete] = useState<Focus | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFocuses();
    }
  }, [isOpen]);

  const loadFocuses = async () => {
    setLoading(true);
    try {
      const data = await getFocusesForManage();
      setFocuses(data);
    } catch (err) {
      console.error('Error cargando focos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.overflowX = 'hidden';
      document.documentElement.style.overflowX = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
    };
  }, [isOpen]);

  const handleToggleHidden = async (focus: Focus) => {
    if (focus.isSystem) {
      setUpdating(focus.id);
      try {
        await updateFocus(focus.id, { isHidden: !focus.isHidden });
        await loadFocuses();
        onFocusUpdated();
      } catch (err) {
        console.error('Error actualizando foco:', err);
      } finally {
        setUpdating(null);
      }
    }
  };

  const handleDeleteClick = (focus: Focus) => {
    if (focus.isSystem) return;
    setFocusToDelete(focus);
  };

  const handleDeleteConfirm = async () => {
    if (!focusToDelete) return;

    setDeleting(focusToDelete.id);
    try {
      await deleteFocus(focusToDelete.id);
      await loadFocuses();
      onFocusUpdated();
      setFocusToDelete(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar el foco');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setFocusToDelete(null);
  };

  const handleEdit = (focus: Focus) => {
    setEditingFocus(focus);
    setShowFormModal(true);
  };

  const handleFormSave = async () => {
    await loadFocuses();
    onFocusUpdated();
    setShowFormModal(false);
    setEditingFocus(null);
  };

  if (typeof window === 'undefined') return null;

  const systemFocuses = focuses.filter((f) => f.isSystem);
  const customFocuses = focuses.filter((f) => !f.isSystem);

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="day-form-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="day-form-modal focus-manage-modal"
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
              }}
              initial={{ opacity: 0, scale: 0.94, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.94, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.2, ease: [0.35, 0.7, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="day-form-modal__header">
                <h3>Gestionar focos</h3>
                <button type="button" className="day-form-modal__close" onClick={onClose} aria-label="Cerrar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6l12 12m0-12L6 18"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </header>

              <div className="focus-manage__content">
                {loading ? (
                  <div className="focus-manage__loading">Cargando...</div>
                ) : (
                  <>
                    {customFocuses.length > 0 && (
                      <section className="focus-manage__section">
                        <h4 className="focus-manage__section-title">Focos personalizados</h4>
                        <div className="focus-manage__list">
                          {customFocuses.map((focus) => (
                            <div key={focus.id} className="focus-manage__item">
                              <div className="focus-manage__item-info">
                                {focus.emoji && <span className="focus-manage__item-emoji">{focus.emoji}</span>}
                                <span className="focus-manage__item-name">{focus.name}</span>
                                {focus.color && (
                                  <span
                                    className="focus-manage__item-color"
                                    style={{ backgroundColor: focus.color }}
                                  />
                                )}
                              </div>
                              <div className="focus-manage__item-actions">
                                <button
                                  type="button"
                                  className="focus-manage__btn focus-manage__btn--edit"
                                  onClick={() => handleEdit(focus)}
                                  disabled={deleting === focus.id}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="focus-manage__btn focus-manage__btn--delete"
                                  onClick={() => handleDeleteClick(focus)}
                                  disabled={deleting === focus.id}
                                >
                                  {deleting === focus.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {systemFocuses.length > 0 && (
                      <section className="focus-manage__section">
                        <h4 className="focus-manage__section-title">Focos predefinidos</h4>
                        <p className="focus-manage__section-hint">Puedes ocultar estos focos si no los usas</p>
                        <div className="focus-manage__list">
                          {systemFocuses.map((focus) => (
                            <div key={focus.id} className="focus-manage__item">
                              <div className="focus-manage__item-info">
                                {focus.emoji && <span className="focus-manage__item-emoji">{focus.emoji}</span>}
                                <span className="focus-manage__item-name">{focus.name}</span>
                                {focus.isHidden && (
                                  <span className="focus-manage__item-hidden-badge">Oculto</span>
                                )}
                              </div>
                              <div className="focus-manage__item-actions">
                                <button
                                  type="button"
                                  className={clsx(
                                    'focus-manage__btn',
                                    'focus-manage__btn--toggle',
                                    focus.isHidden && 'is-active',
                                  )}
                                  onClick={() => handleToggleHidden(focus)}
                                  disabled={updating === focus.id}
                                >
                                  {updating === focus.id
                                    ? '...'
                                    : focus.isHidden
                                      ? 'Mostrar'
                                      : 'Ocultar'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FocusFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingFocus(null);
        }}
        onSave={handleFormSave}
        initialFocus={editingFocus}
      />

      <AnimatePresence>
        {focusToDelete && (
          <motion.div
            className="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDeleteCancel}
          >
            <motion.div
              className="confirm-sheet"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Confirmar eliminación"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="confirm-head">
                <p className="confirm-title">¿Eliminar el foco "{focusToDelete.name}"?</p>
                <p className="confirm-sub">Esta acción no se puede deshacer.</p>
              </header>
              <div className="confirm-actions">
                <button type="button" className="confirm-btn ghost" onClick={handleDeleteCancel}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="confirm-btn danger"
                  onClick={handleDeleteConfirm}
                  disabled={deleting === focusToDelete.id}
                >
                  {deleting === focusToDelete.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}

