import { describe, expect, it } from 'vitest';
import { buildWeek, buildWeekByKey, isWeekLocked, nextWeek, previousWeek, shiftWeek, weekKeyOf } from '../weeks';

describe('weeks', () => {
  it('builds a week with Monday start, Sunday end, Thursday close', () => {
    // 2026-08-06 es jueves.
    const week = buildWeek(new Date('2026-08-06T12:00:00'));
    expect(week.startDate).toBe('2026-08-03'); // lunes
    expect(week.endDate).toBe('2026-08-09'); // domingo
    expect(week.closeDate).toBe('2026-08-06'); // jueves
    expect(week.key).toBe(weekKeyOf(new Date('2026-08-06T12:00:00')));
  });

  it('round-trips buildWeekByKey with buildWeek', () => {
    const week = buildWeek(new Date('2026-08-06T12:00:00'));
    const rebuilt = buildWeekByKey(week.key);
    expect(rebuilt.startDate).toBe(week.startDate);
    expect(rebuilt.closeDate).toBe(week.closeDate);
  });

  it('computes next and previous week correctly', () => {
    const week = buildWeek(new Date('2026-08-06T12:00:00'));
    const next = nextWeek(week);
    const prev = previousWeek(week);
    expect(next.startDate).toBe('2026-08-10');
    expect(prev.startDate).toBe('2026-07-27');
  });

  it('locks a week only after its Thursday close date has passed', () => {
    const week = buildWeek(new Date('2026-08-06T12:00:00')); // close = 2026-08-06 (jueves)
    expect(isWeekLocked(week, new Date('2026-08-04'))).toBe(false); // martes misma semana
    expect(isWeekLocked(week, new Date('2026-08-06'))).toBe(false); // el mismo jueves aún no
    expect(isWeekLocked(week, new Date('2026-08-07'))).toBe(true); // viernes siguiente
    expect(isWeekLocked(week, new Date('2026-09-01'))).toBe(true); // mucho después
  });

  it('shifts a week forward and backward by n weeks', () => {
    const week = buildWeek(new Date('2026-08-06T12:00:00'));
    expect(shiftWeek(week, 4).startDate).toBe('2026-08-31');
    expect(shiftWeek(week, -4).startDate).toBe('2026-07-06');
    expect(shiftWeek(week, 0).startDate).toBe(week.startDate);
  });
});
