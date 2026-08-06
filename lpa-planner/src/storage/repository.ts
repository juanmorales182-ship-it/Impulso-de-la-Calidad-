import type { Assignment, AppState, Auditor, AssignmentStatus, Layer, Line, PlantLocation, Team, Week } from '../domain/types';
import { generateProposal } from '../domain/generator';
import { buildWeekByKey, isWeekLocked } from '../domain/weeks';

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export class WeekLockedError extends Error {
  constructor(weekKey: string) {
    super(`La semana ${weekKey} ya está cerrada (histórico inmutable) y no puede modificarse.`);
    this.name = 'WeekLockedError';
  }
}

// ---------- Líneas ----------

export interface LineInput {
  name: string;
  team: Team;
  location: PlantLocation;
}

export function createLine(state: AppState, input: LineInput): AppState {
  const line: Line = {
    id: newId(),
    name: input.name.trim(),
    team: input.team,
    location: input.location,
    active: true,
    lastL2L3Date: null,
    lastL3Date: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return { ...state, lines: [...state.lines, line] };
}

export function updateLine(state: AppState, id: string, patch: Partial<LineInput>): AppState {
  return {
    ...state,
    lines: state.lines.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: nowIso() } : l)),
  };
}

export function setLineActive(state: AppState, id: string, active: boolean): AppState {
  return {
    ...state,
    lines: state.lines.map((l) => (l.id === id ? { ...l, active, updatedAt: nowIso() } : l)),
  };
}

// ---------- Auditores ----------

export interface AuditorInput {
  name: string;
  layers: Layer[];
  location: PlantLocation;
}

export function createAuditor(state: AppState, input: AuditorInput): AppState {
  const auditor: Auditor = {
    id: newId(),
    name: input.name.trim(),
    layers: input.layers,
    location: input.location,
    active: true,
    unavailableWeeks: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return { ...state, auditors: [...state.auditors, auditor] };
}

export function updateAuditor(state: AppState, id: string, patch: Partial<AuditorInput>): AppState {
  return {
    ...state,
    auditors: state.auditors.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: nowIso() } : a)),
  };
}

export function setAuditorActive(state: AppState, id: string, active: boolean): AppState {
  return {
    ...state,
    auditors: state.auditors.map((a) => (a.id === id ? { ...a, active, updatedAt: nowIso() } : a)),
  };
}

export function setAuditorAvailability(state: AppState, id: string, weekKey: string, available: boolean): AppState {
  return {
    ...state,
    auditors: state.auditors.map((a) => {
      if (a.id !== id) return a;
      const set = new Set(a.unavailableWeeks);
      if (available) set.delete(weekKey);
      else set.add(weekKey);
      return { ...a, unavailableWeeks: [...set], updatedAt: nowIso() };
    }),
  };
}

// ---------- Equipos/BU ----------

export function addTeam(state: AppState, team: Team): AppState {
  if (state.teams.includes(team)) return state;
  return { ...state, teams: [...state.teams, team] };
}

// ---------- Semanas ----------

export function ensureWeek(state: AppState, weekKey: string): { state: AppState; week: Week } {
  const existing = state.weeks.find((w) => w.key === weekKey);
  if (existing) return { state, week: existing };
  const week = buildWeekByKey(weekKey);
  return { state: { ...state, weeks: [...state.weeks, week] }, week };
}

export function getWeek(state: AppState, weekKey: string): Week | undefined {
  return state.weeks.find((w) => w.key === weekKey);
}

export function isWeekKeyLocked(state: AppState, weekKey: string, now: Date = new Date()): boolean {
  const week = getWeek(state, weekKey) ?? buildWeekByKey(weekKey);
  return isWeekLocked(week, now);
}

// ---------- Generación de propuesta ----------

export function generateProposalForWeek(
  state: AppState,
  weekKey: string,
): { state: AppState; warnings: string[] } {
  if (isWeekKeyLocked(state, weekKey)) {
    throw new WeekLockedError(weekKey);
  }
  const { state: withWeek, week } = ensureWeek(state, weekKey);

  const preserved = withWeek.assignments.filter(
    (a) => a.weekKey !== weekKey || a.status !== 'propuesta',
  );
  const alreadyDecided = withWeek.assignments.filter(
    (a) => a.weekKey === weekKey && a.status !== 'propuesta',
  );

  const decidedLineLayerKeys = new Set(alreadyDecided.map((a) => `${a.lineId}::${a.layer}`));

  const history = withWeek.assignments.filter((a) => a.weekKey !== weekKey);
  const { assignments: drafts, warnings } = generateProposal(withWeek.lines, withWeek.auditors, history, week);

  const newAssignments: Assignment[] = drafts
    .filter((d) => !decidedLineLayerKeys.has(`${d.lineId}::${d.layer}`))
    .map((d) => ({
      ...d,
      id: newId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }));

  return {
    state: { ...withWeek, assignments: [...preserved, ...newAssignments] },
    warnings,
  };
}

// ---------- Edición de asignaciones ----------

export interface AssignmentPatch {
  lineId?: string;
  layer?: Layer;
  auditorId?: string | null;
  folio?: string;
  status?: AssignmentStatus;
}

function applyLineAuditTracking(state: AppState, assignment: Assignment): AppState {
  if (assignment.status !== 'confirmada' && assignment.status !== 'cerrada') return state;
  const week = getWeek(state, assignment.weekKey) ?? buildWeekByKey(assignment.weekKey);

  let lines = state.lines;

  if (assignment.layer === 'L3') {
    lines = lines.map((l) => (l.id === assignment.lineId ? { ...l, lastL3Date: week.startDate } : l));
  }

  if (assignment.layer === 'L2' || assignment.layer === 'L3') {
    const siblingLayer: Layer = assignment.layer === 'L2' ? 'L3' : 'L2';
    const siblingDecided = state.assignments.some(
      (a) =>
        a.lineId === assignment.lineId &&
        a.weekKey === assignment.weekKey &&
        a.layer === siblingLayer &&
        (a.status === 'confirmada' || a.status === 'cerrada'),
    );
    if (siblingDecided) {
      lines = lines.map((l) => (l.id === assignment.lineId ? { ...l, lastL2L3Date: week.startDate } : l));
    }
  }

  return { ...state, lines };
}

export function updateAssignment(state: AppState, id: string, patch: AssignmentPatch): AppState {
  const current = state.assignments.find((a) => a.id === id);
  if (!current) return state;
  if (isWeekKeyLocked(state, current.weekKey)) {
    throw new WeekLockedError(current.weekKey);
  }

  const updated: Assignment = { ...current, ...patch, updatedAt: nowIso() };
  let nextState: AppState = {
    ...state,
    assignments: state.assignments.map((a) => (a.id === id ? updated : a)),
  };
  nextState = applyLineAuditTracking(nextState, updated);
  return nextState;
}

export function deleteAssignment(state: AppState, id: string): AppState {
  const current = state.assignments.find((a) => a.id === id);
  if (!current) return state;
  if (isWeekKeyLocked(state, current.weekKey)) {
    throw new WeekLockedError(current.weekKey);
  }
  return { ...state, assignments: state.assignments.filter((a) => a.id !== id) };
}

export function addManualAssignment(
  state: AppState,
  weekKey: string,
  lineId: string,
  layer: Layer,
): AppState {
  if (isWeekKeyLocked(state, weekKey)) {
    throw new WeekLockedError(weekKey);
  }
  const assignment: Assignment = {
    id: newId(),
    weekKey,
    lineId,
    layer,
    auditorId: null,
    folio: '',
    status: 'propuesta',
    reason: 'normal',
    needsAttention: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  return { ...state, assignments: [...state.assignments, assignment] };
}

export function getWeekAssignments(state: AppState, weekKey: string): Assignment[] {
  return state.assignments.filter((a) => a.weekKey === weekKey);
}

export function getHistoryAssignments(state: AppState, now: Date = new Date()): Assignment[] {
  return state.assignments.filter((a) => isWeekKeyLocked(state, a.weekKey, now));
}

// ---------- Migración de histórico (Excel) ----------

export interface HistoricalAssignmentInput {
  weekKey: string;
  lineName: string;
  team: Team;
  location: PlantLocation;
  station?: string;
  layer: Layer;
  auditorName: string | null;
  folio: string;
}

export interface ImportHistoricalResult {
  state: AppState;
  createdLines: number;
  createdAuditors: number;
  createdAssignments: number;
  skippedDuplicates: number;
}

/**
 * Carga en bloque asignaciones históricas ya cerradas (migradas de un Excel), creando líneas y
 * auditores nuevos por nombre cuando hace falta (case-insensitive, igual que importLines/
 * importAuditors). A diferencia de addManualAssignment, NO respeta el bloqueo por fecha: estos
 * registros nacen ya como historial cerrado, no son ediciones de una semana en curso. Es idempotente:
 * si la misma combinación línea+semana+capa+estación ya existe, se omite en vez de duplicarse.
 */
export function importHistoricalAssignments(
  state: AppState,
  inputs: HistoricalAssignmentInput[],
): ImportHistoricalResult {
  let next = state;
  let createdLines = 0;
  let createdAuditors = 0;
  let createdAssignments = 0;
  let skippedDuplicates = 0;

  const existingKeys = new Set(
    next.assignments.map((a) => `${a.lineId}::${a.weekKey}::${a.layer}::${a.station ?? ''}`),
  );

  for (const input of inputs) {
    let line = next.lines.find((l) => l.name.toLowerCase() === input.lineName.toLowerCase());
    if (!line) {
      next = createLine(next, { name: input.lineName, team: input.team, location: input.location });
      line = next.lines[next.lines.length - 1];
      createdLines += 1;
    }

    let auditorId: string | null = null;
    if (input.auditorName) {
      let auditor = next.auditors.find((a) => a.name.toLowerCase() === input.auditorName!.toLowerCase());
      if (!auditor) {
        next = createAuditor(next, { name: input.auditorName, layers: [input.layer], location: 'Principal' });
        auditor = next.auditors[next.auditors.length - 1];
        createdAuditors += 1;
      } else if (!auditor.layers.includes(input.layer)) {
        next = updateAuditor(next, auditor.id, { layers: [...auditor.layers, input.layer] });
        auditor = next.auditors.find((a) => a.id === auditor!.id)!;
      }
      auditorId = auditor.id;
    }

    const { state: withWeek } = ensureWeek(next, input.weekKey);
    next = withWeek;

    const dedupeKey = `${line.id}::${input.weekKey}::${input.layer}::${input.station ?? ''}`;
    if (existingKeys.has(dedupeKey)) {
      skippedDuplicates += 1;
      continue;
    }
    existingKeys.add(dedupeKey);

    const assignment: Assignment = {
      id: newId(),
      weekKey: input.weekKey,
      lineId: line.id,
      layer: input.layer,
      auditorId,
      folio: input.folio,
      status: 'cerrada',
      reason: 'normal',
      needsAttention: !auditorId,
      station: input.station || undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    next = { ...next, assignments: [...next.assignments, assignment] };
    createdAssignments += 1;
  }

  next = backfillLineAuditDates(next);

  return { state: next, createdLines, createdAuditors, createdAssignments, skippedDuplicates };
}

/**
 * Tras una carga masiva, recalcula lastL3Date (última L3 de cualquier tipo) y lastL2L3Date
 * (última semana en que una línea tuvo L2 Y L3 juntas) por línea, para que el ciclo trimestral
 * futuro arranque desde el punto correcto en vez de considerar todas las líneas "nunca auditadas".
 */
function backfillLineAuditDates(state: AppState): AppState {
  const byLine = new Map<string, Assignment[]>();
  for (const a of state.assignments) {
    if (!byLine.has(a.lineId)) byLine.set(a.lineId, []);
    byLine.get(a.lineId)!.push(a);
  }

  const lines = state.lines.map((line) => {
    const assignments = byLine.get(line.id) ?? [];

    let lastL3Date: string | null = null;
    const weeksWithL2 = new Set<string>();
    const weeksWithL3 = new Set<string>();

    for (const a of assignments) {
      const week = getWeek(state, a.weekKey) ?? buildWeekByKey(a.weekKey);
      if (a.layer === 'L3') {
        weeksWithL3.add(week.startDate);
        if (!lastL3Date || week.startDate > lastL3Date) lastL3Date = week.startDate;
      }
      if (a.layer === 'L2') weeksWithL2.add(week.startDate);
    }

    let lastL2L3Date: string | null = null;
    for (const date of weeksWithL3) {
      if (weeksWithL2.has(date) && (!lastL2L3Date || date > lastL2L3Date)) {
        lastL2L3Date = date;
      }
    }

    if (lastL3Date === line.lastL3Date && lastL2L3Date === line.lastL2L3Date) return line;
    return {
      ...line,
      lastL3Date: lastL3Date ?? line.lastL3Date,
      lastL2L3Date: lastL2L3Date ?? line.lastL2L3Date,
    };
  });

  return { ...state, lines };
}
