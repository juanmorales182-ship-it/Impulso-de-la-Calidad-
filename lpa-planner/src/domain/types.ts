// Modelo de datos del sistema de planeación de Auditorías por Capas (LPA).

export type Layer = 'L1' | 'L2' | 'L3';

export type PlantLocation = 'Principal' | 'Ext.' | 'Ambas';

/** Equipo/BU de una línea. Catálogo abierto: el usuario puede agregar más además de los conocidos. */
export type Team = string;

export const KNOWN_TEAMS = ['MT1', 'MT2', 'MT3', 'MT4', 'MT5', 'MT6', 'GM', 'FIREWALL'] as const;

/** Nombres de línea que pertenecen al equipo GM, usados para sembrar el catálogo inicial. */
export const GM_LINE_NAMES = ['DELTA', 'T1XX', '31XX', 'D2UX', 'C234', 'L234 Ext.'] as const;

export interface Line {
  id: string;
  name: string;
  team: Team;
  location: PlantLocation;
  active: boolean;
  /** Fecha (ISO) de la última vez que la línea cumplió su ciclo trimestral completo (L2 Y L3 juntas). Null si nunca. */
  lastL2L3Date: string | null;
  /** Fecha (ISO) de la última vez que la línea recibió CUALQUIER auditoría L3 (trimestral o forzada por la regla GM). Usado para rotar de forma justa qué línea GM recibe la L3 semanal. Null si nunca. */
  lastL3Date: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Auditor {
  id: string;
  name: string;
  layers: Layer[];
  location: PlantLocation;
  active: boolean;
  /** Semanas (weekKey) en las que el auditor NO está disponible. */
  unavailableWeeks: string[];
  createdAt: string;
  updatedAt: string;
}

/** weekKey con formato "GGGG-Www" (año ISO-semana), p.ej. "2026-W33". */
export type WeekKey = string;

export interface Week {
  key: WeekKey;
  weekNumber: number;
  year: number;
  /** Lunes de la semana (ISO date, yyyy-MM-dd). */
  startDate: string;
  /** Domingo de la semana (ISO date, yyyy-MM-dd). */
  endDate: string;
  /** Jueves de la semana: fecha de cierre. */
  closeDate: string;
}

export type AssignmentStatus = 'propuesta' | 'confirmada' | 'cerrada';

export interface Assignment {
  id: string;
  weekKey: WeekKey;
  lineId: string;
  layer: Layer;
  auditorId: string | null;
  folio: string;
  status: AssignmentStatus;
  /** Motivo por el que se generó (para trazabilidad/depuración): normal, quarterly, gm-l3, firewall. */
  reason: AssignmentReason;
  /** true si no se pudo encontrar auditor válido al generar (requiere atención manual). */
  needsAttention: boolean;
  /** Estación específica dentro de la línea (solo presente en registros migrados del histórico Excel; la app no la usa para las reglas de negocio, que operan a nivel línea). */
  station?: string;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentReason = 'normal' | 'quarterly' | 'gm-l3' | 'firewall';

export interface AppState {
  lines: Line[];
  auditors: Auditor[];
  weeks: Week[];
  assignments: Assignment[];
  /** Catálogo abierto de equipos/BU conocidos por el usuario. */
  teams: Team[];
  schemaVersion: number;
}

export const QUARTER_DAYS = 91;
