'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Focus, FocusCreatePayload, FocusUpdatePayload, createFocus, updateFocus } from '@/lib/api/focuses';
import clsx from 'clsx';

const FOCUS_COLORS = [
  { value: '#7B6CFF', label: 'Violeta' },
  { value: '#56E1E9', label: 'Turquesa' },
  { value: '#FF6B9D', label: 'Rosa' },
  { value: '#9B59B6', label: 'Púrpura' },
  { value: '#F39C12', label: 'Naranja' },
  { value: '#3498DB', label: 'Azul' },
  { value: '#2ECC71', label: 'Verde' },
  { value: '#E74C3C', label: 'Rojo' },
];


type FocusFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (focus: Focus) => void;
  initialFocus?: Focus | null;
};

export default function FocusFormModal({ isOpen, onClose, onSave, initialFocus }: FocusFormModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialFocus) {
        setName(initialFocus.name);
        setColor(initialFocus.color || '');
      } else {
        setName('');
        setColor('');
      }
      setError(null);
    }
  }, [isOpen, initialFocus]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: FocusCreatePayload | FocusUpdatePayload = {
        name: name.trim(),
        ...(color && { color }),
      };

      const savedFocus = initialFocus
        ? await updateFocus(initialFocus.id, payload)
        : await createFocus(payload as FocusCreatePayload);

      onSave(savedFocus);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al guardar el foco');
    } finally {
      setSaving(false);
    }
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
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
            className="day-form-modal focus-form-modal"
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
              <h3 className="day-form-modal__title">{initialFocus ? 'Editar foco' : 'Crear foco'}</h3>
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

            <form onSubmit={handleSubmit} className="focus-form">
              <div className="focus-form__field">
                <label htmlFor="focus-name">Nombre del foco *</label>
                <input
                  id="focus-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Ejercicio, Lectura..."
                  maxLength={50}
                  autoFocus
                  required
                />
              </div>


              <div className="focus-form__field">
                <label>Color (opcional)</label>
                <div className="focus-form__color-selector">
                  {FOCUS_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={clsx('focus-form__color-btn', color === c.value && 'is-active')}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setColor(color === c.value ? '' : c.value)}
                      aria-label={c.label}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="focus-form__error">{error}</p>}

              <div className="focus-form__actions">
                <button type="button" className="focus-form__cancel" onClick={onClose} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="focus-form__save" disabled={saving || !name.trim()}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

