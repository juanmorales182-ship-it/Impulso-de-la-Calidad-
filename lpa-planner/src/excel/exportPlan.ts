import * as XLSX from 'xlsx';
import type { Assignment, AppState } from '../domain/types';

function assignmentRow(state: AppState, a: Assignment) {
  const week = state.weeks.find((w) => w.key === a.weekKey);
  const line = state.lines.find((l) => l.id === a.lineId);
  const auditor = state.auditors.find((au) => au.id === a.auditorId);
  return {
    Semana: a.weekKey,
    'Fecha inicio': week?.startDate ?? '',
    'Fecha cierre (jueves)': week?.closeDate ?? '',
    Línea: line?.name ?? '(línea eliminada)',
    Equipo: line?.team ?? '',
    Ubicación: line?.location ?? '',
    Capa: a.layer,
    Auditor: auditor?.name ?? (a.auditorId ? '(auditor eliminado)' : 'SIN ASIGNAR'),
    Folio: a.folio,
    Estado: a.status,
    Motivo: a.reason,
    'Requiere atención': a.needsAttention ? 'Sí' : '',
  };
}

export function buildPlanWorkbook(state: AppState, weekKeys: string[]): XLSX.WorkBook {
  const keySet = new Set(weekKeys);
  const rows = state.assignments
    .filter((a) => keySet.has(a.weekKey))
    .sort((a, b) => (a.weekKey === b.weekKey ? a.layer.localeCompare(b.layer) : a.weekKey.localeCompare(b.weekKey)))
    .map((a) => assignmentRow(state, a));

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Plan LPA');
  return workbook;
}

export function buildHistoryWorkbook(state: AppState, assignments: Assignment[]): XLSX.WorkBook {
  const rows = [...assignments]
    .sort((a, b) => (a.weekKey === b.weekKey ? a.layer.localeCompare(b.layer) : a.weekKey.localeCompare(b.weekKey)))
    .map((a) => assignmentRow(state, a));

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Histórico LPA');
  return workbook;
}

export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(workbook, filename);
}
