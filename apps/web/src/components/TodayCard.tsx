
'use client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function TodayCard() {
  const now = new Date();
  const blocks = [
    { time: '10:00', title: 'Deep work' },
    { time: '14:30', title: 'Entrenamiento' },
    { time: '18:00', title: 'Leer 30m' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-warm">Hoy</h3>
        <div className="text-mist text-sm">{format(now, "EEE d 'de' MMM", { locale: es })}</div>
      </div>

      <div className="space-y-2 mb-4">
        {blocks.map((b, i)=> (
          <div key={i} className="card p-3 flex items-center justify-between">
            <div>
              <div className="text-warm font-medium">{b.title}</div>
              <div className="text-mist text-xs">Bloque</div>
            </div>
            <div className="text-warm text-sm">{b.time}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <button className="btn-ghost">Dormí 7h</button>
        <button className="btn-ghost">Café: 1</button>
        <button className="btn-ghost">Humor: 8/10</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-primary w-full">Crear bloque</button>
        <button className="btn-ghost w-full">Registrar hoy</button>
      </div>
    </div>
  );
}
