'use client';

import React, { useMemo, useRef, useState } from 'react';
import Popover from './Popover';

type Props = {
  value?: { h: number; m: number } | null;
  onChange?: (v: { h: number; m: number } | null) => void;
  className?: string;
  placeholder?: string;
};

const range = (n: number) => Array.from({length:n}, (_,i)=>i);
const pad = (n:number)=> String(n).padStart(2,'0');

export default function TimePicker({ value, onChange, className, placeholder='--:--'}: Props){
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hours = useMemo(()=>range(24),[]);
  const minutes = useMemo(()=>range(60),[]);

  const pick = (h: number, m: number) => {
    onChange?.({h,m});
    setOpen(false);
  };

  const vh = value?.h ?? 0;
  const vm = value?.m ?? 0;

  return (
    <div className="relative inline-block">
      <button
        ref={anchorRef}
        type="button"
        className={`input w-[120px] text-left ${className||''}`}
        onClick={()=> setOpen(v=>!v)}
      >
        {value ? `${pad(vh)}:${pad(vm)}` : placeholder}
      </button>

      <Popover open={open} onOpenChange={setOpen} anchorRef={anchorRef} className="p-3">
        <div className="flex gap-2">
          {/* Horas */}
          <ul className="no-scrollbar max-h-56 overflow-auto pr-1">
            {hours.map(h=>(
              <li key={h}>
                <button
                  type="button"
                  className={`item min-w-[48px] text-center ${h===vh ? 'active' : ''}`}
                  onClick={()=> pick(h, vm)}
                >
                  {pad(h)}
                </button>
              </li>
            ))}
          </ul>

          {/* Minutos */}
          <ul className="no-scrollbar max-h-56 overflow-auto">
            {minutes.map(m=>(
              <li key={m}>
                <button
                  type="button"
                  className={`item min-w-[48px] text-center ${m===vm ? 'active' : ''}`}
                  onClick={()=> pick(vh, m)}
                >
                  {pad(m)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between mt-2">
          <button className="btn-ghost text-sm" onClick={()=>{ onChange?.(null); setOpen(false); }}>Borrar</button>
          <button className="btn-primary text-sm" onClick={()=> setOpen(false)}>Aceptar</button>
        </div>
      </Popover>
    </div>
  );
}
