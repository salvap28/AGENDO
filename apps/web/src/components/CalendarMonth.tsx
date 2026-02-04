'use client';
import { useMemo, useState } from "react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, isSameMonth, isToday, format
} from "date-fns";
import { es } from "date-fns/locale";
import Chevron from "@/components/icons/Chevron";

function buildGrid(cursor: Date) {
  const mS = startOfMonth(cursor);
  const mE = endOfMonth(cursor);
  const gS = startOfWeek(mS, { weekStartsOn: 1 });
  const gE = endOfWeek(mE, { weekStartsOn: 1 });
  const days: { d: Date; inMonth: boolean; today: boolean }[] = [];
  let d = gS;
  while (d <= gE) {
    days.push({ d, inMonth: isSameMonth(d, cursor), today: isToday(d) });
    d = addDays(d, 1);
  }
  return days;
}

export default function CalendarMonth() {
  const [cursor, setCursor] = useState(new Date());
  const days = useMemo(() => buildGrid(cursor), [cursor]);
  const label = useMemo(() => {
    const raw = format(cursor, "LLLL yyyy", { locale: es });
    return raw[0].toUpperCase() + raw.slice(1);
  }, [cursor]);

  const week = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) =>
      format(addDays(base, i), "EEE", { locale: es }).replace(".", "").toUpperCase()
    );
  }, []);

  return (
    <section className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-center gap-3">
        <button
          aria-label="Mes anterior"
          onClick={() => setCursor(subMonths(cursor, 1))}
          className="btn w-9 h-9 !p-0 hover:bg-white/10"
        >
          <Chevron dir="left" />
        </button>

        <h2 className="rounded-pill px-4 py-2 text-lg font-semibold text-ink/90 bg-white/5 border border-white/10 shadow-glow">
          {label}
        </h2>

        <button
          aria-label="Mes siguiente"
          onClick={() => setCursor(addMonths(cursor, 1))}
          className="btn w-9 h-9 !p-0 hover:bg-white/10"
        >
          <Chevron />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center">
        <button className="btn-primary breath">Hoy</button>
      </div>

      {/* Week header */}
      <div className="mt-6 grid grid-cols-7 gap-3 text-center text-sub">
        {week.map((w) => (
          <div key={w} className="text-[0.8rem] tracking-wide">{w}</div>
        ))}
      </div>

      {/* Month grid */}
      <div className="mt-2 grid grid-cols-7 gap-3">
        {days.map(({ d, inMonth, today }, i) => (
          <div
            key={i}
            className={`group card relative overflow-hidden p-3 transition
              ${inMonth ? "" : "opacity-50"}
              ${today ? "ring-1 ring-violet/60 shadow-glow" : ""}
              hover:-translate-y-[2px] hover:border-white/15 hover:shadow-glow`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sub text-sm">{format(d, "d", { locale: es })}</div>
              <div className="flex gap-1 opacity-80">
                <span className="h-[6px] w-[6px] rounded-full bg-violet"></span>
                <span className="h-[6px] w-[6px] rounded-full bg-blue"></span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-[3px] w-3/4 rounded-full bg-white/10">
                <span className="block h-[3px] w-1/3 rounded-full bg-blue/90"></span>
              </div>
              <div className="h-[3px] w-2/3 rounded-full bg-white/10">
                <span className="block h-[3px] w-1/4 rounded-full bg-violet/90"></span>
              </div>
            </div>

            {/* tooltip */}
            <div className="pointer-events-none absolute inset-x-2 top-2 translate-y-[-110%] rounded-xl bg-panel/90 p-2 text-xs text-sub opacity-0 shadow-card transition group-hover:opacity-100">
              Bloques: 1 • Sueño: 7h • Café: 2
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
