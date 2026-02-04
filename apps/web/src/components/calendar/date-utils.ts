// Pequeño helper de fechas para el mes
export type YMD = { y:number; m:number; d:number }

export function today(): YMD{
  const n = new Date()
  return { y: n.getFullYear(), m: n.getMonth()+1, d: n.getDate() }
}

export function sameYMD(a: YMD, b: YMD){
  return a.y===b.y && a.m===b.m && a.d===b.d
}

export function monthLabel(y:number, m:number){
  const formatter = new Intl.DateTimeFormat('es-ES', { month:'long', year:'numeric' })
  return capitalize(formatter.format(new Date(y, m-1, 1)))
}
const capitalize = (s:string)=> s.charAt(0).toUpperCase() + s.slice(1)

export function addMonths(src: YMD, delta: -1|1): YMD{
  const d = new Date(src.y, src.m-1, 1)
  d.setMonth(d.getMonth()+delta)
  return { y: d.getFullYear(), m: d.getMonth()+1, d: 1 }
}

/** Matriz 6x7 con días mostrables (mes + “colas” de adyacentes) */
export function makeMonthMatrix(y:number, m:number): YMD[]{
  const first = new Date(y, m-1, 1)
  const startDay = (first.getDay()+6)%7  // Lunes=0
  const daysInMonth = new Date(y, m, 0).getDate()

  const prevMonthDate = new Date(y, m-1, 0) // último del mes anterior
  const prevDays = prevMonthDate.getDate()

  const cells: YMD[] = []
  // prev tail
  for (let i=startDay-1; i>=0; i--){
    const d = prevDays - i
    const pm = m-1<=0 ? 12 : m-1
    const py = m-1<=0 ? y-1 : y
    cells.push({ y:py, m:pm, d })
  }
  // this month
  for (let d=1; d<=daysInMonth; d++) cells.push({ y, m, d })
  // next head
  while (cells.length < 42){
    const idx = cells.length - (startDay + daysInMonth)
    const nm = m+1>12 ? 1 : m+1
    const ny = m+1>12 ? y+1 : y
    cells.push({ y:ny, m:nm, d: idx+1 })
  }
  return cells
}
