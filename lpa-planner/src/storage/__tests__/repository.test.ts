import { describe, expect, it } from 'vitest';
import type { AppState } from '../../domain/types';
import { KNOWN_TEAMS } from '../../domain/types';
import {
  WeekLockedError,
  addManualAssignment,
  createAuditor,
  createLine,
  deleteAssignment,
  ensureWeek,
  generateProposalForWeek,
  getWeekAssignments,
  updateAssignment,
} from '../repository';
import { buildWeek } from '../../domain/weeks';

function emptyState(): AppState {
  return { lines: [], auditors: [], weeks: [], assignments: [], teams: [...KNOWN_TEAMS], schemaVersion: 1 };
}

// Semana futura para que nunca quede bloqueada por el paso del tiempo real.
const FUTURE_WEEK_KEY = buildWeek(new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)).key;

function seedBasicState(): AppState {
  let state = emptyState();
  state = createLine(state, { name: 'LINEA-1', team: 'MT1', location: 'Principal' });
  state = createLine(state, { name: 'DELTA', team: 'GM', location: 'Principal' });
  state = createAuditor(state, { name: 'Auditor 1', layers: ['L1', 'L2', 'L3'], location: 'Principal' });
  return state;
}

describe('repository', () => {
  it('generates a proposal for a future week and persists it', () => {
    const state = seedBasicState();
    const { state: next, warnings } = generateProposalForWeek(state, FUTURE_WEEK_KEY);
    const assignments = getWeekAssignments(next, FUTURE_WEEK_KEY);
    expect(assignments.length).toBeGreaterThan(0);
    expect(warnings).toBeDefined();
  });

  it('refuses to generate or edit a locked (past) week', () => {
    const state = seedBasicState();
    const pastWeekKey = buildWeek(new Date('2020-01-01')).key;
    expect(() => generateProposalForWeek(state, pastWeekKey)).toThrow(WeekLockedError);

    const { state: withWeek } = ensureWeek(state, pastWeekKey);
    const line = withWeek.lines[0];
    const injected: AppState = {
      ...withWeek,
      assignments: [
        {
          id: 'past-1',
          weekKey: pastWeekKey,
          lineId: line.id,
          layer: 'L1',
          auditorId: null,
          folio: '',
          status: 'cerrada',
          reason: 'normal',
          needsAttention: false,
          createdAt: '2020-01-01',
          updatedAt: '2020-01-01',
        },
      ],
    };
    expect(() => updateAssignment(injected, 'past-1', { folio: '123' })).toThrow(WeekLockedError);
    expect(() => deleteAssignment(injected, 'past-1')).toThrow(WeekLockedError);
  });

  it('regenerating a proposal preserves already-confirmed rows and only refills pending ones', () => {
    let state = seedBasicState();
    const gen1 = generateProposalForWeek(state, FUTURE_WEEK_KEY);
    state = gen1.state;
    const firstAssignments = getWeekAssignments(state, FUTURE_WEEK_KEY);
    const toConfirm = firstAssignments[0];
    state = updateAssignment(state, toConfirm.id, { status: 'confirmada', folio: 'F-100' });

    const gen2 = generateProposalForWeek(state, FUTURE_WEEK_KEY);
    state = gen2.state;
    const after = getWeekAssignments(state, FUTURE_WEEK_KEY);
    const stillThere = after.find((a) => a.id === toConfirm.id);
    expect(stillThere?.status).toBe('confirmada');
    expect(stillThere?.folio).toBe('F-100');
  });

  it('updates lastL3Date and lastL2L3Date on the line once L2 and L3 are both confirmed', () => {
    let state = seedBasicState();
    const deltaLine = state.lines.find((l) => l.name === 'DELTA')!;
    // Forzar cita trimestral: crear asignaciones L2 y L3 manuales para DELTA.
    state = addManualAssignment(state, FUTURE_WEEK_KEY, deltaLine.id, 'L2');
    state = addManualAssignment(state, FUTURE_WEEK_KEY, deltaLine.id, 'L3');
    const [l2, l3] = getWeekAssignments(state, FUTURE_WEEK_KEY).filter((a) => a.lineId === deltaLine.id);

    state = updateAssignment(state, l2.id, { status: 'confirmada' });
    let updatedLine = state.lines.find((l) => l.id === deltaLine.id)!;
    expect(updatedLine.lastL2L3Date).toBeNull(); // aún falta L3

    state = updateAssignment(state, l3.id, { status: 'confirmada' });
    updatedLine = state.lines.find((l) => l.id === deltaLine.id)!;
    expect(updatedLine.lastL2L3Date).not.toBeNull();
    expect(updatedLine.lastL3Date).not.toBeNull();
  });
});
