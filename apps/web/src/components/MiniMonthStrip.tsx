
'use client';
import { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, addDays, isSameDay, isToday, format } from 'date-fns';
import { es } from 'date-fns/locale';

type Cell = { d: Date };

export default function MiniMonthStrip() {
  const [cursor] = useState(new Date());
  const days = useMemo(()=>{
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const arr: Cell[] = [];
    let d = start;
    while (d <= end) {
      arr.push({ d });
      d = addDays(d, 1);
    }
    return arr;
  },[cursor]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-warm">Calendario</h3>
        <div className="text-mist text-sm">{format(cursor,'MMMM yyyy',{locale:es})}</div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid grid-rows-2 auto-cols-[44px] grid-flow-col gap-2 pr-2">
          {days.map((c, i)=>{
            const today = isToday(c.d);
            return (
              <button
                key={i}
                className={`day-card h-[56px] w-[44px] flex flex-col items-center justify-center ${today ? 'day--today' : ''}`}
                aria-label={format(c.d, "d 'de' MMMM 'de' yyyy", { locale: es })}
                onClick={()=>{}}
              >
                <span className="text-[10px] text-mist -mb-0.5">{format(c.d,'EEE',{locale:es}).slice(0,3)}</span>
                <span className="text-sm font-semibold text-warm">{format(c.d,'d')}</span>
                <div className="w-7 mt-1 bg-white/15 rounded-full overflow-hidden" style={{height:3}}>
                  <div className="day-progress" style={{width: (i%5)*20 + '%'}}/>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
