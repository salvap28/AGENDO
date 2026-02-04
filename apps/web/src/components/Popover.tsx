'use client';

import React, { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  anchorRef: React.RefObject<HTMLElement>;
  className?: string;
  children: React.ReactNode;
};

export default function Popover({ open, onOpenChange, anchorRef, className, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar al click afuera y con Escape
  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const p = panelRef.current;
      if (!p) return;
      const t = e.target as Node;
      if (!p.contains(t) && !anchorRef.current?.contains(t)) onOpenChange(false);
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };

    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, onOpenChange, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={`popover-agendo ${className || ''}`}
      data-open="true"
      role="dialog"
    >
      {children}
    </div>
  );
}
