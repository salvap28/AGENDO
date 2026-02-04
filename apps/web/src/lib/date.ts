export function parseISODate(d?: string) {
  if (!d) return undefined
  const [y, m, day] = d.split('-').map(Number)
  if (!y || !m || !day) return undefined
  return new Date(Date.UTC(y, m - 1, day))
}

export function startOfDayUTC(d: Date) {
  const dd = new Date(d)
  dd.setUTCHours(0, 0, 0, 0)
  return dd
}

export function endOfDayUTC(d: Date) {
  const dd = new Date(d)
  dd.setUTCHours(23, 59, 59, 999)
  return dd
}
