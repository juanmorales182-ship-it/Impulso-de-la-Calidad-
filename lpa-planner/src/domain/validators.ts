import type { Assignment, Auditor, Line, Week } from './types';
import { auditorCanAuditLayer, auditorsWhoAuditedLineLastWeek, auditorAvailable, locationCompatible } from './rules';

/**
 * Valida una asignación (típicamente tras una edición manual) contra las reglas de negocio.
 * Devuelve advertencias en vez de bloquear: la edición manual siempre puede forzarse,
 * pero el usuario debe ver por qué rompe una regla.
 */
export function validateAssignment(
  assignment: Pick<Assignment, 'lineId' | 'layer' | 'auditorId' | 'weekKey'>,
  line: Line | undefined,
  auditor: Auditor | undefined,
  targetWeek: Week,
  history: Assignment[],
): string[] {
  const issues: string[] = [];

  if (!line) {
    issues.push('La línea seleccionada no existe.');
    return issues;
  }
  if (!line.active) {
    issues.push(`La línea "${line.name}" está inactiva.`);
  }

  if (!assignment.auditorId) {
    return issues;
  }

  if (!auditor) {
    issues.push('El auditor seleccionado no existe.');
    return issues;
  }
  if (!auditor.active) {
    issues.push(`El auditor "${auditor.name}" está inactivo.`);
  }
  if (!auditorCanAuditLayer(auditor, assignment.layer)) {
    issues.push(`"${auditor.name}" no está habilitado para auditar ${assignment.layer}.`);
  }
  if (!locationCompatible(auditor.location, line.location)) {
    issues.push(`"${auditor.name}" (${auditor.location}) no es compatible con la ubicación de "${line.name}" (${line.location}).`);
  }
  if (!auditorAvailable(auditor, targetWeek.key)) {
    issues.push(`"${auditor.name}" marcó no disponible en la semana ${targetWeek.key}.`);
  }
  const excluded = auditorsWhoAuditedLineLastWeek(history, assignment.lineId, targetWeek);
  if (excluded.has(auditor.id)) {
    issues.push(`"${auditor.name}" ya auditó "${line.name}" la semana anterior (no puede repetirse en semanas consecutivas).`);
  }

  return issues;
}
