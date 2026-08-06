import {
  startOfISOWeek,
  addDays,
  addWeeks,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  isAfter,
} from 'date-fns';
import type { Week, WeekKey } from './types';

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function weekKeyOf(date: Date): WeekKey {
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  return `${year}-W${pad2(week)}`;
}

/** Construye el objeto Week (lunes a domingo, cierre jueves) a partir de cualquier fecha dentro de esa semana. */
export function buildWeek(date: Date): Week {
  const monday = startOfISOWeek(date);
  const sunday = addDays(monday, 6);
  const thursday = addDays(monday, 3);
  return {
    key: weekKeyOf(date),
    weekNumber: getISOWeek(date),
    year: getISOWeekYear(date),
    startDate: fmt(monday),
    endDate: fmt(sunday),
    closeDate: fmt(thursday),
  };
}

export function buildWeekByKey(key: WeekKey): Week {
  const [yearStr, weekStr] = key.split('-W');
  const year = Number(yearStr);
  const weekNum = Number(weekStr);
  // 4 de enero siempre cae en la semana ISO 1 del año.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = startOfISOWeek(jan4);
  const monday = addWeeks(week1Monday, weekNum - 1);
  return buildWeek(monday);
}

export function nextWeek(week: Week): Week {
  const monday = addDays(parseISO(week.startDate), 7);
  return buildWeek(monday);
}

export function previousWeek(week: Week): Week {
  const monday = addDays(parseISO(week.startDate), -7);
  return buildWeek(monday);
}

export function currentWeek(now: Date = new Date()): Week {
  return buildWeek(now);
}

/**
 * Una semana queda bloqueada (histórico inmutable) una vez que pasa su fecha de cierre (jueves).
 * Se compara a nivel de día: bloqueada desde el viernes de esa semana en adelante.
 */
export function isWeekLocked(week: Week, now: Date = new Date()): boolean {
  const closeDate = parseISO(week.closeDate);
  const today = parseISO(fmt(now));
  return isAfter(today, closeDate);
}

export function daysBetween(isoDateA: string, isoDateB: string): number {
  const a = parseISO(isoDateA);
  const b = parseISO(isoDateB);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
