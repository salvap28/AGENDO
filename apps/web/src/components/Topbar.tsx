'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [hoverLogout, setHoverLogout] = useState(false);
  const navLinks = useMemo(
    () => [
      { href: '/calendario', label: 'Calendario', active: pathname.startsWith('/calendario') },
      { href: '/plan', label: 'Planeá con Agendo', active: pathname.startsWith('/plan') },
    ],
    [pathname],
  );

  return (
    <header className="agendo-topbar" aria-label="Barra de navegación principal">
      <div className="agendo-topbar__inner">
        <Link className="topbar-brand" href="/">
          Agendo
        </Link>
        <nav className="topbar-actions" aria-label="Secciones">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="topbar-btn" data-active={link.active || undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <button
            className="topbar-chip"
            onClick={() => router.push('/logout')}
            onMouseEnter={() => setHoverLogout(true)}
            onMouseLeave={() => setHoverLogout(false)}
          >
            {hoverLogout ? 'Cerrar sesión' : user.name || user.email}
          </button>
        ) : (
          <Link className="topbar-chip" href="/acceso">
            Acceder
          </Link>
        )}
      </div>
    </header>
  );
}
