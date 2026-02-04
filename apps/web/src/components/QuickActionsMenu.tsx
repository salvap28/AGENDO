'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './providers/AuthProvider';

type QuickActionsMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function QuickActionsMenu({ isOpen, onClose }: QuickActionsMenuProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!panelRef.current) return;
      if (target && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const actions = [];

  // Si estamos en calendario, mostrar acciones de calendario
  if (pathname.startsWith('/calendario')) {
    actions.push(
      {
        label: 'Añadir bloque',
        onClick: () => {
          onClose();
          // Disparar evento para abrir el modal de añadir bloque
          const event = new CustomEvent('agendo:open-block-form');
          window.dispatchEvent(event);
        },
      },
      {
        label: 'Añadir tarea',
        onClick: () => {
          onClose();
          // Disparar evento para abrir el modal de añadir tarea
          const event = new CustomEvent('agendo:open-task-form');
          window.dispatchEvent(event);
        },
      }
    );
  }

  // Acción de check-in si está disponible
  if (user && pathname.startsWith('/calendario')) {
    actions.push({
      label: 'Registrar check-in',
      onClick: () => {
        onClose();
        // Disparar evento para abrir check-in
        const event = new CustomEvent('agendo:open-checkin');
        window.dispatchEvent(event);
      },
    });
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (actions.length === 0) {
    return null;
  }

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="quick-actions-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <div className="quick-actions-menu-wrapper">
            <motion.div
              ref={panelRef}
              className="quick-actions-menu"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: 'spring',
                damping: 25,
                stiffness: 300,
                mass: 0.8
              }}
            >
              {actions.map((action, index) => (
                <button
                  key={index}
                  type="button"
                  className="quick-actions-item"
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(menuContent, document.body);
}

