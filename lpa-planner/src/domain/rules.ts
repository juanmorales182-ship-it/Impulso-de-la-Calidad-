import type { Assignment, Auditor, Layer, Line, PlantLocation, Week } from './types';
import { QUARTER_DAYS } from './types';
import { daysBetween, previousWeek } from './weeks';

export function isFirewall(line: Line): boolean {
  return line.team === 'FIREWALL';
}

export function isGM(line: Line): boolean {
  return line.team === 'GM';
}

/**
 * Una línea "normal" (no GM, no Firewall) o GM cae en su ciclo trimestral cuando han pasado
 * >= 91 días desde su último L2+L3, o nunca ha tenido uno.
 */
export function isQuarterlyDue(line: Line, targetWeek: Week): boolean {
  if (!line.lastL2L3Date) return true;
  return daysBetween(line.lastL2L3Date, targetWeek.startDate) >= QUARTER_DAYS;
}

export function auditorCanAuditLayer(auditor: Auditor, layer: Layer): boolean {
  return auditor.layers.includes(layer);
}

/**
 * Compatibilidad de planta: 'Ambas' de cualquiera de los dos lados abre la compatibilidad;
 * si ninguno es 'Ambas', deben coincidir exactamente.
 */
export function locationCompatible(auditorLocation: PlantLocation, lineLocation: PlantLocation): boolean {
  if (auditorLocation === 'Ambas' || lineLocation === 'Ambas') return true;
  return auditorLocation === lineLocation;
}

export function auditorAvailable(auditor: Auditor, weekKey: string): boolean {
  return !auditor.unavailableWeeks.includes(weekKey);
}

/**
 * Auditores que ya auditaron esta línea (en cualquier capa) en la semana inmediata anterior.
 * Se usa para bloquear la repetición línea-auditor en semanas consecutivas.
 */
export function auditorsWhoAuditedLineLastWeek(
  history: Assignment[],
  lineId: string,
  targetWeek: Week,
): Set<string> {
  const prevKey = previousWeek(targetWeek).key;
  const result = new Set<string>();
  for (const a of history) {
    if (a.lineId === lineId && a.weekKey === prevKey && a.auditorId) {
      result.add(a.auditorId);
    }
  }
  return result;
}

export function isAuditorEligible(
  auditor: Auditor,
  line: Line,
  layer: Layer,
  targetWeek: Week,
  excludedAuditorIds: Set<string>,
): boolean {
  if (!auditor.active) return false;
  if (excludedAuditorIds.has(auditor.id)) return false;
  if (!auditorCanAuditLayer(auditor, layer)) return false;
  if (!locationCompatible(auditor.location, line.location)) return false;
  if (!auditorAvailable(auditor, targetWeek.key)) return false;
  return true;
}
