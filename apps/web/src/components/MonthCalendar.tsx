'use client';
import { useMemo, useState } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameMonth, isToday, format
} from 'date-fns';
import { es } from 'date-fns/locale';
import DayPanel from '@/components/DayPanel';

type DayCell = { d: Date; inMonth: boolean; today: boolean };

function buildGrid(cursor: Date): DayCell[] {
  const mS = startOfMonth(cursor);
  const mE = endOfMonth(cursor);
  const gS = startOfWeek(mS, { weekStartsOn: 1 });
  const gE = endOfWeek(mE, { weekStartsOn: 1 });
  const days: DayCell[] = [];
  let d = gS;
  while (d <= gE) {
    days.push({ d, inMonth: isSameMonth(d, cursor), today: isToday(d) });
    d = addDays(d, 1);
  }
  return days;
}

export default function MonthCalendar() {
  const [cursor, setCursor] = useState(new Date());
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const cells = useMemo(() => buildGrid(cursor), [cursor]);

  return (
    <section className="panel p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="calendar-nav self-start sm:self-auto"
          aria-label="Mes anterior"
          onClick={() => setCursor((d) => subMonths(d, 1))}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 19L8 12L15 5"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <h2 className="text-center text-lg font-semibold text-warm select-none sm:text-xl">
          {format(cursor, 'MMMM yyyy', { locale: es })}
        </h2>

        <button
          className="calendar-nav self-end sm:self-auto"
          aria-label="Mes siguiente"
          onClick={() => setCursor((d) => addMonths(d, 1))}
        >
          <svg className="rotate-180" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 19L8 12L15 5"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-4">
        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((w) => (
          <div
            key={w}
            className="text-[11px] uppercase tracking-wide text-mist text-center select-none sm:text-xs"
          >
            {w}
          </div>
        ))}
        {cells.map((c, i) => {
          const aria = format(c.d, "d 'de' MMMM 'de' yyyy", { locale: es });
          return (
            <button
              key={i}
              onClick={() => setOpenDay(c.d)}
              aria-label={aria}
              className={`day-card relative h-[86px] p-2 text-left text-sm transition-all duration-200 ease-out sm:h-[110px] sm:p-3
                ${c.inMonth ? '' : 'opacity-40'} ${c.today ? 'day--today' : ''}`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white/90 sm:text-sm">
                <span>{format(c.d, 'd')}</span>
                <div className="flex gap-1">
                  <span className="day-dot" />
                  <span className="day-dot" />
                </div>
              </div>
              <div
                className="relative mt-3 w-[70%] overflow-hidden rounded-full bg-white/15 sm:mt-4"
                style={{ height: 3 }}
              >
                <div className="day-progress" style={{ width: '42%' }} />
              </div>
            </button>
          );
        })}
      </div>

      {openDay && <DayPanel date={openDay} onClose={() => setOpenDay(null)} />}
    </section>
  );
}
