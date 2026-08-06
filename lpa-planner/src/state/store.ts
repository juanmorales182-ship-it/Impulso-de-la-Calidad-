import { create } from 'zustand';
import type { AppState, Assignment, Layer, PlantLocation, Team } from '../domain/types';
import { loadState, saveState } from '../storage/db';
import * as repo from '../storage/repository';
import type {
  AssignmentPatch,
  AuditorInput,
  HistoricalAssignmentInput,
  ImportHistoricalResult,
  LineInput,
} from '../storage/repository';

interface StoreState {
  data: AppState;
  lastWarnings: string[];
  error: string | null;

  addLine: (input: LineInput) => void;
  updateLine: (id: string, patch: Partial<LineInput>) => void;
  setLineActive: (id: string, active: boolean) => void;

  addAuditor: (input: AuditorInput) => void;
  updateAuditor: (id: string, patch: Partial<AuditorInput>) => void;
  setAuditorActive: (id: string, active: boolean) => void;
  setAuditorAvailability: (id: string, weekKey: string, available: boolean) => void;

  addTeam: (team: Team) => void;

  generateProposalForWeek: (weekKey: string) => void;
  updateAssignment: (id: string, patch: AssignmentPatch) => void;
  deleteAssignment: (id: string) => void;
  addManualAssignment: (weekKey: string, lineId: string, layer: Layer) => void;

  importLines: (items: LineInput[]) => number;
  importAuditors: (items: AuditorInput[]) => number;
  importHistory: (inputs: HistoricalAssignmentInput[]) => ImportHistoricalResult;

  restoreFromBackup: (state: AppState) => void;
  clearError: () => void;
}

function persist(state: AppState): void {
  saveState(state);
}

function withErrorHandling(set: (fn: (s: StoreState) => Partial<StoreState>) => void, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    set(() => ({ error: err instanceof Error ? err.message : String(err) }));
  }
}

export const useStore = create<StoreState>((set, get) => ({
  data: loadState(),
  lastWarnings: [],
  error: null,

  addLine: (input) =>
    set((s) => {
      const data = repo.createLine(s.data, input);
      persist(data);
      return { data };
    }),

  updateLine: (id, patch) =>
    set((s) => {
      const data = repo.updateLine(s.data, id, patch);
      persist(data);
      return { data };
    }),

  setLineActive: (id, active) =>
    set((s) => {
      const data = repo.setLineActive(s.data, id, active);
      persist(data);
      return { data };
    }),

  addAuditor: (input) =>
    set((s) => {
      const data = repo.createAuditor(s.data, input);
      persist(data);
      return { data };
    }),

  updateAuditor: (id, patch) =>
    set((s) => {
      const data = repo.updateAuditor(s.data, id, patch);
      persist(data);
      return { data };
    }),

  setAuditorActive: (id, active) =>
    set((s) => {
      const data = repo.setAuditorActive(s.data, id, active);
      persist(data);
      return { data };
    }),

  setAuditorAvailability: (id, weekKey, available) =>
    set((s) => {
      const data = repo.setAuditorAvailability(s.data, id, weekKey, available);
      persist(data);
      return { data };
    }),

  addTeam: (team) =>
    set((s) => {
      const data = repo.addTeam(s.data, team);
      persist(data);
      return { data };
    }),

  generateProposalForWeek: (weekKey) =>
    withErrorHandling(set, () => {
      const s = get();
      const { state: data, warnings } = repo.generateProposalForWeek(s.data, weekKey);
      persist(data);
      set(() => ({ data, lastWarnings: warnings, error: null }));
    }),

  updateAssignment: (id, patch) =>
    withErrorHandling(set, () => {
      const s = get();
      const data = repo.updateAssignment(s.data, id, patch);
      persist(data);
      set(() => ({ data, error: null }));
    }),

  deleteAssignment: (id) =>
    withErrorHandling(set, () => {
      const s = get();
      const data = repo.deleteAssignment(s.data, id);
      persist(data);
      set(() => ({ data, error: null }));
    }),

  addManualAssignment: (weekKey, lineId, layer) =>
    withErrorHandling(set, () => {
      const s = get();
      const data = repo.addManualAssignment(s.data, weekKey, lineId, layer);
      persist(data);
      set(() => ({ data, error: null }));
    }),

  importLines: (items) => {
    const s = get();
    let data = s.data;
    let count = 0;
    for (const item of items) {
      const existing = data.lines.find((l) => l.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        data = repo.updateLine(data, existing.id, item);
      } else {
        data = repo.createLine(data, item);
      }
      if (!data.teams.includes(item.team)) {
        data = repo.addTeam(data, item.team);
      }
      count += 1;
    }
    persist(data);
    set(() => ({ data }));
    return count;
  },

  importAuditors: (items) => {
    const s = get();
    let data = s.data;
    let count = 0;
    for (const item of items) {
      const existing = data.auditors.find((a) => a.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        data = repo.updateAuditor(data, existing.id, item);
      } else {
        data = repo.createAuditor(data, item);
      }
      count += 1;
    }
    persist(data);
    set(() => ({ data }));
    return count;
  },

  importHistory: (inputs) => {
    const s = get();
    const result = repo.importHistoricalAssignments(s.data, inputs);
    persist(result.state);
    set(() => ({ data: result.state }));
    return result;
  },

  restoreFromBackup: (state) =>
    set(() => {
      persist(state);
      return { data: state };
    }),

  clearError: () => set(() => ({ error: null })),
}));

export type { PlantLocation, Assignment };
