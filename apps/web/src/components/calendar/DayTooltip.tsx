'use client'

import { useEffect, useState } from 'react'

export default function DayTooltip({
  anchor, text, lines
}: { anchor: DOMRect | null; text: string; lines?: string[] }) {
  const [pos, setPos] = useState<{x:number;y:number}|null>(null)

  useEffect(()=>{
    if (!anchor) { setPos(null); return }
    setPos({ x: anchor.left + anchor.width/2, y: anchor.top - 8 })
  }, [anchor])

  if (!pos) return null
  return (
    <div className="fixed z-40" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%,-100%)' }}>
      <div className="pop-tip">
        <div className="font-medium">{text}</div>
        {lines?.length ? (
          <ul className="mt-1 text-[12px] text-[color:var(--text-tertiary)] space-y-[2px]">
            {lines.map((l,i)=><li key={i}>{l}</li>)}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
