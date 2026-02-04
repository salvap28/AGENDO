'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useAuth } from './providers/AuthProvider';
import { AnimatePresence, motion } from 'framer-motion';

export default function ProfileMenu() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const displayName = user?.name || user?.email || 'Mi perfil';

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!panelRef.current || !triggerRef.current) return;
      if (
        target &&
        !panelRef.current.contains(target) &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!user) return null;

  return (
    <div className="profile-menu">
      <button
        ref={triggerRef}
        type="button"
        className="topbar-chip profile-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{displayName}</span>
        <svg
          className={clsx('profile-caret', open && 'open')}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            className="profile-panel"
            role="menu"
            aria-label="Opciones de perfil"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          >
            <Link className="profile-item" href="/estadisticas">
              Ver estadisticas
            </Link>
            <div className="profile-separator" role="presentation" />
            <Link className="profile-item" href="/profile">
              Perfil
            </Link>
            {user?.isDev && (
              <>
                <div className="profile-separator" role="presentation" />
                <Link className="profile-item" href="/dev">
                  🛠️ Vista de Dev
                </Link>
              </>
            )}
            <button
              className="profile-item w-full text-left"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event('agendo:start-tutorial'));
              }}
            >
              Repetir tutorial
            </button>
            <Link className="profile-item danger" href="/logout">
              Cerrar sesion
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
