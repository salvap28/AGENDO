'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type Props = {
  value?: Date | null;
  onChange?: (d: Date | null) => void;
  anchorRef?: React.RefObject<HTMLButtonElement>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/** Utilidad */
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function DatePicker({
  value,
  onChange,
  anchorRef,
  open: openProp,
  onOpenChange,
  className,
}: Props) {
  const [open, setOpen] = useState(!!openProp);
  const [cursor, setCursor] = useState<Date>(value ?? new Date());
  const panelRef = useRef<HTMLDivElement>(null);

  // controlar desde afuera si viene open
  useEffect(() => { if (openProp !== undefined) setOpen(openProp); }, [openProp]);

  // cierre por click fuera / escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const p = panelRef.current;
      if (!p) return;
      if (!p.contains(e.target as Node) && !anchorRef?.current?.contains(e.target as Node)) {
        setOpen(false); onOpenChange?.(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); onOpenChange?.(false); }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, onOpenChange, anchorRef]);

  // helpers de mes
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startDay = (monthStart.getDay() + 6) % 7; // L=0, .. D=6
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

  const grid: { d: Date; inMonth: boolean }[] = [];
  // prev padding
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), -i);
    grid.push({ d, inMonth: false });
  }
  // month days
  for (let i = 1; i <= daysInMonth; i++) {
    grid.push({ d: new Date(cursor.getFullYear(), cursor.getMonth(), i), inMonth: true });
  }
  // next padding hasta múltiplo de 7
  while (grid.length % 7 !== 0) {
    const last = grid[grid.length - 1].d;
    grid.push({ d: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const today = new Date();

  const pick = (d: Date) => {
    onChange?.(d);
    setOpen(false);
    onOpenChange?.(false);
  };

  return (
    <>
      {/* Backdrop con blur + fade */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[3px] opacity-0 animate-[fadeIn_.18s_ease-out_forwards]"
          onClick={() => { setOpen(false); onOpenChange?.(false); }}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          'popover-agendo z-50 w-[320px] p-3',
          'fixed top-20 left-1/2 -translate-x-1/2',
          'opacity-0 translate-y-2 pointer-events-none',
          open && 'pointer-events-auto animate-[slideFade_.22s_ease-out_forwards]',
          className
        )}
        data-open={open}
      >
        {/* header */}
        <div className="flex items-center justify-between mb-2">
          <button
            className="calendar-nav"
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            aria-label="Mes anterior"
          >
            ‹
          </button>

          <div className="font-medium text-white/90 select-none capitalize">
            {new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(cursor)}
          </div>

          <button
            className="calendar-nav"
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

        {/* labels */}
        <div className="grid grid-cols-7 text-center text-xs text-white/60 mb-1">
          {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map(k => <div key={k}>{k}</div>)}
        </div>

        {/* días (estilo NO circular perfecto, como pediste) */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map(({ d, inMonth }) => {
            const isToday = sameDay(d, today);
            const isSelected = value && sameDay(d, value);
            return (
              <button
                key={d.toISOString()}
                onClick={() => pick(d)}
                className={clsx(
                  'h-9 rounded-lg border text-sm',
                  'transition-colors',
                  inMonth ? 'text-white/90 border-white/10 bg-white/5' : 'text-white/35 border-white/5 bg-white/2',
                  'hover:bg-[rgba(123,108,255,.12)] hover:border-[rgba(123,108,255,.28)]',
                  isSelected && 'bg-[rgba(123,108,255,.22)] border-[rgba(123,108,255,.45)] text-white',
                  isToday && 'day--today'
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex justify-end">
          <button
            className="btn-ghost px-3"
            onClick={() => { onChange?.(null); setOpen(false); onOpenChange?.(false); }}
          >
            Borrar
          </button>
        </div>
      </div>

      {/* keyframes para animaciones */}
      <style jsx global>{`
        @keyframes slideFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
