import { BlockCategory, CompletionFeeling, RangeBounds } from './types.js';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function normalizeRange(from: Date, to: Date): RangeBounds {
  const start = startOfDay(from);
  const end = endOfDay(to);
  if (start.getTime() <= end.getTime()) {
    return { from: start, to: end };
  }
  return { from: end, to: start };
}

export function isWithinRange(date: Date, range: RangeBounds): boolean {
  const ts = date.getTime();
  return ts >= range.from.getTime() && ts <= range.to.getTime();
}

export function parseDateFromYMD(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export function dayNameFromIndex(dayIndex: number): string {
  return DAY_NAMES[mod(dayIndex, 7)];
}

export function formatSlotLabel(startMinutes: number, slotMinutes: number): string {
  const endMinutes = (startMinutes + slotMinutes) % (24 * 60);
  return `${formatMinutes(startMinutes)}-${formatMinutes(endMinutes)}`;
}

export function formatWeekRangeLabel(from: Date, to: Date): string {
  const startDay = from.getDate();
  const endDay = to.getDate();
  const startMonth = MONTH_NAMES[from.getMonth()];
  const endMonth = MONTH_NAMES[to.getMonth()];
  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth}-${endDay} ${endMonth}`;
}

export function humanizeCategory(category: BlockCategory): string {
  switch (category) {
    case 'study':
      return 'Estudio';
    case 'work':
      return 'Trabajo';
    case 'creative':
      return 'Creatividad';
    case 'health':
      return 'Salud';
    case 'personal':
      return 'Personal';
    default:
      return 'Otros';
  }
}

export function average(values: number[]): number | null {
  if (!values.length) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

export function feelingValue(feeling: CompletionFeeling): number {
  switch (feeling) {
    case 'excellent':
      return 5;
    case 'good':
      return 4;
    case 'neutral':
      return 3;
    case 'tired':
      return 2;
    case 'frustrated':
      return 1;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatMinutes(totalMinutes: number): string {
  const minutes = mod(totalMinutes, 24 * 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
