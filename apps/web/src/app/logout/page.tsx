'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    logout();
  }, [logout]);

  // Disable body scroll for the logout screen and ensure it's removed on unmount
  useEffect(() => {
    try {
      document.body.classList.add('no-scroll-logout');
      document.documentElement.classList.add('no-scroll-logout');
    } catch (e) {
      /* ignore during SSR */
    }
    return () => {
      try {
        document.body.classList.remove('no-scroll-logout');
        document.documentElement.classList.remove('no-scroll-logout');
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  // Evitar problemas de hidratación - solo renderizar después de montar
  if (!mounted) {
    return (
      <main className="logout-shell app-bg">
        <div className="logout-bg" aria-hidden />
      </main>
    );
  }

  return (
    <main className="logout-shell app-bg">
      <div className="logout-bg" aria-hidden />
      <section className="logout-card glass-panel">
        <p className="logout-eyebrow">Sesión finalizada</p>
        <h1 className="logout-title">Todo quedó guardado.</h1>
        <p className="logout-body">Tus datos permanecen privados. Volvé cuando quieras continuar con tu día.</p>
        <div className="logout-actions">
          <button className="logout-btn logout-btn--ghost" onClick={() => router.replace('/')}>
            Ir al inicio
          </button>
          <Link className="logout-btn logout-btn--solid" href="/acceso">
            Iniciar sesión
          </Link>
        </div>
      </section>
    </main>
  );
}
