import { describe, expect, it } from 'vitest';
import type { AppState } from '../../domain/types';
import { KNOWN_TEAMS } from '../../domain/types';
import { createAuditor, createLine, importHistoricalAssignments, type HistoricalAssignmentInput } from '../repository';
import { buildWeek } from '../../domain/weeks';

function emptyState(): AppState {
  return { lines: [], auditors: [], weeks: [], assignments: [], teams: [...KNOWN_TEAMS], schemaVersion: 1 };
}

const PAST_WEEK_KEY = buildWeek(new Date('2025-05-11')).key;
const PAST_WEEK_KEY_2 = buildWeek(new Date('2025-05-18')).key;

describe('importHistoricalAssignments', () => {
  it('creates lines and auditors on the fly for a locked (past) week, without throwing', () => {
    const state = emptyState();
    const input: HistoricalAssignmentInput = {
      weekKey: PAST_WEEK_KEY,
      lineName: 'DELTA',
      team: 'GM',
      location: 'Principal',
      station: '026-001 Remachadora',
      layer: 'L2',
      auditorName: 'SONIA RESENDIZ',
      folio: '1804257',
    };

    const result = importHistoricalAssignments(state, [input]);

    expect(result.createdLines).toBe(1);
    expect(result.createdAuditors).toBe(1);
    expect(result.createdAssignments).toBe(1);
    const line = result.state.lines.find((l) => l.name === 'DELTA')!;
    const auditor = result.state.auditors.find((a) => a.name === 'SONIA RESENDIZ')!;
    const assignment = result.state.assignments[0];
    expect(assignment.lineId).toBe(line.id);
    expect(assignment.auditorId).toBe(auditor.id);
    expect(assignment.status).toBe('cerrada');
    expect(assignment.folio).toBe('1804257');
    expect(assignment.station).toBe('026-001 Remachadora');
  });

  it('matches an existing line/auditor case-insensitively instead of creating duplicates', () => {
    let state = emptyState();
    state = createLine(state, { name: 'delta', team: 'GM', location: 'Principal' });
    state = createAuditor(state, { name: 'sonia resendiz', layers: ['L1'], location: 'Principal' });

    const result = importHistoricalAssignments(state, [
      {
        weekKey: PAST_WEEK_KEY,
        lineName: 'DELTA',
        team: 'GM',
        location: 'Principal',
        layer: 'L2',
        auditorName: 'SONIA RESENDIZ',
        folio: '1804257',
      },
    ]);

    expect(result.createdLines).toBe(0);
    expect(result.createdAuditors).toBe(0);
    expect(result.state.lines).toHaveLength(1);
    expect(result.state.auditors).toHaveLength(1);
    // El auditor ya existía con L1 solamente; al aparecer en un registro L2 se le agrega esa capa.
    expect(result.state.auditors[0].layers.sort()).toEqual(['L1', 'L2']);
  });

  it('is idempotent: importing the exact same rows twice does not duplicate assignments', () => {
    const state = emptyState();
    const input: HistoricalAssignmentInput = {
      weekKey: PAST_WEEK_KEY,
      lineName: 'DELTA',
      team: 'GM',
      location: 'Principal',
      layer: 'L1',
      auditorName: null,
      folio: '',
    };

    const first = importHistoricalAssignments(state, [input]);
    const second = importHistoricalAssignments(first.state, [input]);

    expect(second.createdAssignments).toBe(0);
    expect(second.skippedDuplicates).toBe(1);
    expect(second.state.assignments).toHaveLength(1);
  });

  it('leaves auditorId null and flags needsAttention when no auditor name was captured', () => {
    const state = emptyState();
    const result = importHistoricalAssignments(state, [
      {
        weekKey: PAST_WEEK_KEY,
        lineName: 'P71A',
        team: 'MT1',
        location: 'Principal',
        layer: 'L1',
        auditorName: null,
        folio: '91286',
      },
    ]);

    expect(result.state.assignments[0].auditorId).toBeNull();
    expect(result.state.assignments[0].needsAttention).toBe(true);
  });

  it('backfills lastL3Date and lastL2L3Date from the migrated history', () => {
    const state = emptyState();
    const result = importHistoricalAssignments(state, [
      {
        weekKey: PAST_WEEK_KEY,
        lineName: 'DELTA',
        team: 'GM',
        location: 'Principal',
        layer: 'L2',
        auditorName: 'AUDITOR A',
        folio: '111',
      },
      {
        weekKey: PAST_WEEK_KEY,
        lineName: 'DELTA',
        team: 'GM',
        location: 'Principal',
        layer: 'L3',
        auditorName: 'AUDITOR B',
        folio: '112',
      },
      {
        weekKey: PAST_WEEK_KEY_2,
        lineName: 'DELTA',
        team: 'GM',
        location: 'Principal',
        layer: 'L3',
        auditorName: 'AUDITOR C',
        folio: '113',
      },
    ]);

    const line = result.state.lines.find((l) => l.name === 'DELTA')!;
    // lastL3Date: la más reciente entre las dos semanas con L3 (la segunda).
    const week2 = buildWeek(new Date('2025-05-18'));
    expect(line.lastL3Date).toBe(week2.startDate);
    // lastL2L3Date: solo la primera semana tuvo L2 Y L3 juntas.
    const week1 = buildWeek(new Date('2025-05-11'));
    expect(line.lastL2L3Date).toBe(week1.startDate);
  });
});
