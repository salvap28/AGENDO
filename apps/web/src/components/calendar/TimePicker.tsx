'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type Time = { hh: number; mm: number }

export default function TimePicker({
  value, onChange
}: { value: Time; onChange: (t: Time)=>void }) {
  const hours = useMemo(()=>Array.from({length:24},(_,i)=>i),[])
  const minutes = useMemo(()=>[0,5,10,15,20,25,30,35,40,45,50,55],[])
  const [hh, setHh] = useState(value.hh)
  const [mm, setMm] = useState(value.mm)

  useEffect(()=>{ onChange({ hh, mm }) },[hh,mm,onChange]) // sync up

  return (
    <div className="pop p-3 grid grid-cols-2 gap-3 w-[240px]">
      <div>
        <div className="text-[12px] text-[color:var(--text-tertiary)] mb-1">Hora</div>
        <div className="time-col">
          {hours.map(h => (
            <button key={h}
              className={`time-item ${h===hh ? 'time-item--active' : ''}`}
              onClick={()=>setHh(h)}
            >{h.toString().padStart(2,'0')}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[12px] text-[color:var(--text-tertiary)] mb-1">Minutos</div>
        <div className="time-col">
          {minutes.map(m => (
            <button key={m}
              className={`time-item ${m===mm ? 'time-item--active' : ''}`}
              onClick={()=>setMm(m)}
            >{m.toString().padStart(2,'0')}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
