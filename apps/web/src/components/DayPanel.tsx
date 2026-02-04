'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DayPanel({ date, onClose }: { date: Date; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 h-full w-full max-w-[420px] panel p-5 backdrop-blur-md sm:p-6"
        style={{ animation: 'slideIn .35s ease-in-out forwards', transform: 'translateX(100%)' }}
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-warm">{format(date, "EEEE d 'de' MMMM", { locale: es })}</h3>
          <button className="btn-ghost self-start sm:self-auto" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="space-y-3 text-sm sm:text-base">
          <div className="text-mist text-sm">Resumen del día</div>
          <div className="card p-3">Bloques: 0</div>
          <div className="card p-3">Sueño: — • Café: — • Humor: —</div>
          <button className="btn-primary mt-4 w-full">Crear bloque</button>
        </div>
      </aside>
    </div>
  );
}
