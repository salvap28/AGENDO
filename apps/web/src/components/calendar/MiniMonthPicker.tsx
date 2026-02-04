'use client'

import { useMemo, useState } from 'react'
import { addMonths, makeMonthMatrix, monthLabel, sameYMD, today, YMD } from './date-utils'

export default function MiniMonthPicker({
  value, onChange
}: { value: YMD; onChange: (d: YMD) => void }) {
  const [cursor, setCursor] = useState<YMD>({ y: value.y, m: value.m, d: 1 })
  const matrix = useMemo(()=>makeMonthMatrix(cursor.y, cursor.m), [cursor])

  return (
    <div className="pop w-[280px] p-3">
      <div className="mini-head mb-2">
        <button className="mini-nav" aria-label="Mes anterior" onClick={()=>setCursor(p=>addMonths(p,-1))}>‹</button>
        <div className="text-sm font-medium text-[color:var(--text-secondary)]">{monthLabel(cursor.y, cursor.m)}</div>
        <button className="mini-nav" aria-label="Mes siguiente" onClick={()=>setCursor(p=>addMonths(p,1))}>›</button>
      </div>

      <div className="mini-grid mb-1 text-[10px] uppercase tracking-[.08em] text-[color:var(--text-tertiary)]">
        {['lu','ma','mi','ju','vi','sa','do'].map(k => <div key={k} className="text-center">{k}</div>)}
      </div>

      <div className="mini-grid">
        {matrix.map((d,i)=>{
          const inMonth = d.m===cursor.m
          const isToday = sameYMD(d, today())
          const selected = sameYMD(d, value)
          return (
            <button
              key={`${d.y}-${d.m}-${d.d}-${i}`}
              className={[
                'mini-cell',
                inMonth ? '' : 'mini-cell--muted',
                isToday ? 'mini-cell--today' : '',
                selected ? 'mini-cell--select' : ''
              ].join(' ')}
              onClick={()=>onChange(d)}
            >
              {d.d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
