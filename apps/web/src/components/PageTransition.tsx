'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }){
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const el = ref.current
    if(!el) return
    el.classList.add('route-fade-enter')
    requestAnimationFrame(() => {
      el.classList.add('route-fade-enter-active')
      el.classList.remove('route-fade-enter')
    })
    const end = () => el.classList.remove('route-fade-enter-active')
    const t = setTimeout(end, 280)
    return () => clearTimeout(t)
  }, [pathname])

  return <div ref={ref}>{children}</div>
}
