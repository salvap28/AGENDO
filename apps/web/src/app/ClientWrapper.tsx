'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import ProfileMenu from '@/components/ProfileMenu';
import MobileNavMenu from '@/components/MobileNavMenu';
import QuickActionsMenu from '@/components/QuickActionsMenu';
import { fetchOnboardingState } from '@/lib/api/onboarding';
import { setupGlassDisplacement } from '@/lib/glassDisplacement';
import Tutorial from '@/components/Tutorial';
import NotificationPermissionPopup from '@/components/NotificationPermissionPopup';

const ONBOARDING_SKIP_KEY = 'agendo_onboarding_skip';

const shouldSkipOnboardingForUser = (userId?: string | null) => {
  if (typeof window === 'undefined' || !userId) return false;
  const raw = localStorage.getItem(ONBOARDING_SKIP_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'userId' in parsed) {
      return parsed.userId === userId;
    }
  } catch {
    // valor legacy, lo limpiamos para no bloquear cuentas nuevas
    localStorage.removeItem(ONBOARDING_SKIP_KEY);
  }
  return false;
};

declare global {
  interface Window {
    __agendoBooted?: boolean;
  }
}

const AgendoBackground = dynamic(() => import('@/components/AgendoBackground'), { ssr: false });

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/calendario')) {
    const today = new Date();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayName = dayNames[today.getDay()];
    const day = today.getDate();
    return `Hoy · ${dayName} ${day}`;
  }
  if (pathname.startsWith('/estadisticas')) {
    return 'Estadísticas';
  }
  if (pathname.startsWith('/profile')) {
    return 'Perfil';
  }
  return 'Agendo';
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const isOnboarding = pathname.startsWith('/onboarding');
  const isLogout = pathname.startsWith('/logout');
  const isPlan = pathname.startsWith('/plan');
  const { user, loading } = useAuth();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const navLinks = [
    { href: '/calendario', label: 'Calendario', active: pathname.startsWith('/calendario'), id: 'nav-calendario' },
  ];
  const pageTitle = getPageTitle(pathname);

  useLayoutEffect(() => {
    const body = document.body;
    if (!body) return;
    if (!window.__agendoBooted) {
      body.classList.remove('app-loaded');
      requestAnimationFrame(() => {
        body.classList.add('app-loaded');
        window.__agendoBooted = true;
      });
    } else {
      body.classList.add('app-loaded');
    }
  }, []);

  useLayoutEffect(() => {
    if (isHome) {
      document.documentElement.classList.add('halo-ready');
    } else {
      document.documentElement.classList.remove('halo-ready');
    }
  }, [isHome]);

  useEffect(() => {
    return setupGlassDisplacement();
  }, []);

  useEffect(() => {
    const isAccessOrOnboarding = pathname.startsWith('/acceso') || pathname.startsWith('/onboarding');
    const token = typeof window !== 'undefined' ? localStorage.getItem('agendo_token') : null;
    if (!user || loading || checkedOnboarding || isAccessOrOnboarding || isLogout || !token) return;

    if (shouldSkipOnboardingForUser(user.id)) {
      setCheckedOnboarding(true);
      return;
    }

    fetchOnboardingState(token)
      .then((state) => {
        if (!state.completed) {
          router.replace('/onboarding');
        } else {
          setCheckedOnboarding(true);
        }
      })
      .catch(() => {
        setCheckedOnboarding(true);
      });
  }, [user, loading, checkedOnboarding, pathname, router]);

  return (
    <>
      <div className="halo-layer">
        {/* AgendoBackground desactivado temporalmente */}
        {false && isHome && (
          <AgendoBackground
            center={[0.5, 0.75]}
            radius={0.64}
            ringWidth={0.002}
            softness={0.9}
            intensity={1.0}
            glowStrength={0.12}
            breathAmp={0.02}
            speed={0.25}
            vignette={0.08}
          />
        )}
      </div>

      {!isHome && !isOnboarding && !isLogout && !isPlan && (
        <>
          <header className="agendo-topbar" aria-label="Barra de navegación principal">
            <div className="agendo-topbar__inner">
              {/* Desktop Layout */}
              <div className="topbar-desktop">
                <Link className="topbar-brand" href="/">
                  Agendo
                </Link>
                <nav className="topbar-actions" aria-label="Secciones">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      id={link.id}
                      className="topbar-btn"
                      data-active={link.active || undefined}
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
                {user ? (
                  <div id="nav-profile">
                    <ProfileMenu />
                  </div>
                ) : (
                  <Link className="topbar-chip" href="/acceso">
                    Acceder
                  </Link>
                )}
              </div>

              {/* Mobile Layout */}
              <div className="topbar-mobile">
                <button
                  type="button"
                  id="tutorial-mobile-menu"
                  className="topbar-mobile__menu-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMobileNavOpen(true);
                  }}
                  aria-label="Abrir menú"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                </button>
                {pathname.startsWith('/calendario') ? (
                  <button
                    type="button"
                    className="topbar-mobile__title topbar-mobile__title--clickable"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('agendo:open-today-overlay'));
                    }}
                    aria-label="Abrir día de hoy"
                  >
                    {pageTitle}
                    <svg
                      className="topbar-mobile__title-icon"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <h1 className="topbar-mobile__title">{pageTitle}</h1>
                )}
              </div>
            </div>
          </header>

          <MobileNavMenu isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
          <QuickActionsMenu isOpen={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
        </>
      )}

      <div className={clsx('app-content relative z-10', !isHome && !isOnboarding && !isLogout && !isPlan && 'has-topbar')}>{children}</div>
      <Tutorial />
      <NotificationPermissionPopup />
    </>
  );
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
