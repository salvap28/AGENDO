'use client'

import { useEffect, useState } from 'react'
import MiniMonthPicker from './MiniMonthPicker'
import TimePicker, { Time } from './TimePicker'
import { YMD } from './date-utils'

export type CreatePayload = {
  id?: string
  date: YMD
  title: string
  start?: Time
  end?: Time
  notes?: string
}

export default function CreateSheet({
  open, initial, onClose, onSubmit, onDelete
}: {
  open: boolean
  initial: CreatePayload
  onClose: () => void
  onSubmit: (p: CreatePayload) => void
  onDelete?: (id: string) => void
}) {
  const [payload, setPayload] = useState<CreatePayload>(initial)
  const [showDate, setShowDate] = useState(false)
  const [showStart, setShowStart] = useState(false)
  const [showEnd, setShowEnd] = useState(false)

  useEffect(()=>setPayload(initial),[initial])
  useEffect(()=>{
    const onEsc = (e: KeyboardEvent) => { if (e.key==='Escape') onClose() }
    if (open) window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  },[open,onClose])

  if (!open) return null

  const dateLabel = new Intl.DateTimeFormat('es-AR', { weekday:'short', day:'numeric', month:'long' })
    .format(new Date(payload.date.y, payload.date.m, payload.date.d))

  return (
    <div className="sheet">
      <div className="sheet-backdrop" onClick={onClose}/>
      <aside className="sheet-panel p-4 sm:p-5 grid content-start gap-4">
        <header className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[color:var(--text-secondary)]">
            {payload.id ? 'Editar bloque' : 'Crear bloque'}
          </h3>
          <button className="btn-cal-ghost !h-9" onClick={onClose}>Cerrar</button>
        </header>

        <div className="text-[12px] text-[color:var(--text-tertiary)] -mb-2">{dateLabel}</div>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-[12px] text-[color:var(--text-tertiary)]">Título</label>
            <input
              autoFocus
              className="h-10 rounded-[12px] px-3 bg-[color:var(--surface-0)] border border-[color:var(--surface-1)] text-[color:var(--text-secondary)] outline-none focus:focus-ring"
              placeholder="Nombre del bloque"
              value={payload.title}
              onChange={(e)=>setPayload(p=>({...p, title: e.target.value}))}
              onKeyDown={(e)=>{ if (e.key==='Enter') onSubmit(payload) }}
            />
          </div>

          {/* Fecha + Hora */}
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <button className="btn-cal-ghost w-full justify-between" onClick={()=>{ setShowDate(s=>!s); setShowStart(false); setShowEnd(false) }}>
                Fecha
                <span className="text-[color:var(--text-secondary)]">{`${payload.date.d}/${payload.date.m+1}`}</span>
              </button>
              {showDate && (
                <div className="absolute z-50 mt-2">
                  <MiniMonthPicker
                    value={payload.date}
                    onChange={(d)=>{ setPayload(p=>({ ...p, date:d })); setShowDate(false) }}
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <button className="btn-cal-ghost w-full justify-between" onClick={()=>{ setShowStart(s=>!s); setShowDate(false); setShowEnd(false) }}>
                Inicio
                <span className="text-[color:var(--text-secondary)]">{fmtTime(payload.start)}</span>
              </button>
              {showStart && (
                <div className="absolute z-50 mt-2">
                  <TimePicker
                    value={payload.start ?? {hh:9,mm:0}}
                    onChange={(t)=>setPayload(p=>({ ...p, start:t }))}
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <button className="btn-cal-ghost w-full justify-between" onClick={()=>{ setShowEnd(s=>!s); setShowDate(false); setShowStart(false) }}>
                Fin
                <span className="text-[color:var(--text-secondary)]">{fmtTime(payload.end)}</span>
              </button>
              {showEnd && (
                <div className="absolute z-50 mt-2">
                  <TimePicker
                    value={payload.end ?? {hh:10,mm:0}}
                    onChange={(t)=>setPayload(p=>({ ...p, end:t }))}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-[12px] text-[color:var(--text-tertiary)]">Notas</label>
            <textarea
              rows={4}
              className="rounded-[12px] px-3 py-2 bg-[color:var(--surface-0)] border border-[color:var(--surface-1)] text-[color:var(--text-secondary)] outline-none focus:focus-ring"
              placeholder="Opcional"
              value={payload.notes ?? ''}
              onChange={(e)=>setPayload(p=>({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-between pt-2">
            {payload.id ? (
              <button className="btn-cal-ghost" onClick={()=> onDelete?.(payload.id!)}>Eliminar</button>
            ) : <span />}
            <div className="flex gap-2">
              <button className="btn-cal-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn-cal-primary" onClick={()=>onSubmit(payload)}>Guardar</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

function fmtTime(t?: Time) {
  if (!t) return '--:--'
  return `${t.hh.toString().padStart(2,'0')}:${t.mm.toString().padStart(2,'0')}`
}
