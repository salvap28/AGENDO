'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from './providers/AuthProvider';

type MobileNavMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MobileNavMenu({ isOpen, onClose }: MobileNavMenuProps) {
  const pathname = usePathname();
  const { user } = useAuth();

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
    if (isOpen) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const navItems = [
    { href: '/calendario', label: 'Calendario', active: pathname.startsWith('/calendario') },
    { href: '/plan', label: 'Planeá con Agendo', active: pathname.startsWith('/plan') },
  ];

  if (typeof window === 'undefined') {
    return null;
  }

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="mobile-nav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            className="mobile-nav-menu"
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ 
              type: 'spring', 
              damping: 28, 
              stiffness: 300,
              mass: 0.8
            }}
          >
            <div className="mobile-nav-menu__header">
              <h2 className="mobile-nav-menu__title">Menú</h2>
              <button
                type="button"
                className="mobile-nav-menu__close"
                onClick={onClose}
                aria-label="Cerrar menú"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="mobile-nav-menu__content">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx('mobile-nav-item', item.active && 'active')}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              ))}

              {user && (
                <>
                  <div className="mobile-nav-separator" />
                  <Link
                    href="/profile"
                    className="mobile-nav-item"
                    onClick={onClose}
                  >
                    Perfil
                  </Link>
                  <button
                    className="mobile-nav-item"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new Event('agendo:start-tutorial'));
                    }}
                  >
                    Repetir tutorial
                  </button>
                  <Link
                    href="/estadisticas"
                    className="mobile-nav-item"
                    onClick={onClose}
                  >
                    Ver estadísticas
                  </Link>
                  <div className="mobile-nav-separator" />
                  <Link
                    href="/logout"
                    className="mobile-nav-item mobile-nav-item--danger"
                    onClick={onClose}
                  >
                    Cerrar sesión
                  </Link>
                </>
              )}

              {!user && (
                <>
                  <div className="mobile-nav-separator" />
                  <Link
                    href="/acceso"
                    className="mobile-nav-item"
                    onClick={onClose}
                  >
                    Acceder
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(menuContent, document.body);
}
