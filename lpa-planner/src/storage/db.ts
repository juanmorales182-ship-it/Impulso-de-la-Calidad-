import type { AppState } from '../domain/types';
import { KNOWN_TEAMS } from '../domain/types';

const STORAGE_KEY = 'lpa-planner-state-v1';
const CURRENT_SCHEMA_VERSION = 1;

function emptyState(): AppState {
  return {
    lines: [],
    auditors: [],
    weeks: [],
    assignments: [],
    teams: [...KNOWN_TEAMS],
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    // Migraciones futuras de schemaVersion irían aquí.
    if (!parsed.teams || parsed.teams.length === 0) {
      parsed.teams = [...KNOWN_TEAMS];
    }
    return parsed;
  } catch (err) {
    console.error('No se pudo leer el estado guardado, se usa uno vacío.', err);
    return emptyState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportStateAsJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateFromJson(json: string): AppState {
  const parsed = JSON.parse(json) as AppState;
  if (!parsed.lines || !parsed.auditors || !parsed.weeks || !parsed.assignments) {
    throw new Error('El archivo de respaldo no tiene el formato esperado.');
  }
  return parsed;
}
