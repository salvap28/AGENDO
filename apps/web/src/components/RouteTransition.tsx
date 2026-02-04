'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** Fade básico entre cambios de ruta */
export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState(pathname);

  useEffect(() => setKey(pathname), [pathname]);

  return (
    <div key={key} className="route-fade-enter route-fade-enter-active">
      {children}
    </div>
  );
}
