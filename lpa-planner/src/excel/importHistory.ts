import * as XLSX from 'xlsx';
import type { Layer } from '../domain/types';
import { buildWeek } from '../domain/weeks';
import { getSheetMatrix, normalizeLocation, normalizeTeam } from './importCatalog';

/**
 * Migra el histórico de la hoja tipo "PLAN": una cuadrícula semana-por-semana donde cada
 * semana ocupa DOS columnas contiguas (confirmado con el usuario sobre su archivo real):
 *  - Columna "número de semana": auditor + folio, como texto libre (p. ej. "SONIA RESENDIZ 1804257").
 *  - Columna "fecha de esa semana" (la siguiente): solo "L1"/"L2"/"L3" (con color, ignorado aquí).
 * La columna de fecha trae la fecha real de esa semana en el renglón de encabezados, que es
 * lo que se usa para calcular a qué semana ISO pertenece el registro.
 */

const MIN_SERIAL = 20000; // ~1954, cota inferior razonable para descartar basura de encabezado
const MAX_SERIAL = 60000; // ~2064

function excelSerialToDate(serial: number): Date {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86_400_000);
}

function isPlausibleDateSerial(value: unknown): value is number {
  return typeof value === 'number' && value >= MIN_SERIAL && value <= MAX_SERIAL;
}

export interface HistoryColumnMapping {
  sheetName: string;
  headerRowIndex: number;
  teamColumn: number;
  locationColumn: number;
  lineColumn: number;
  station1Column: number;
  station2Column: number;
  firstWeekColumn: number;
}

export interface HistoryAssignmentDraft {
  weekKey: string;
  lineName: string;
  team: string;
  location: 'Principal' | 'Ext.' | 'Ambas';
  station: string;
  layer: Layer;
  auditorName: string | null;
  folio: string;
}

export interface HistoryParseResult {
  drafts: HistoryAssignmentDraft[];
  warnings: string[];
  skippedWeekPairs: number;
}

/** Separa "SONIA RESENDIZ 1804257" en { name: "SONIA RESENDIZ", folio: "1804257" }. */
function splitAuditorAndFolio(raw: string): { name: string | null; folio: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { name: null, folio: '' };
  const match = trimmed.match(/^(.*?)[\s-]*(\d{4,})\s*$/);
  if (match && match[1].trim()) {
    return { name: match[1].trim(), folio: match[2] };
  }
  if (/^\d{4,}$/.test(trimmed)) {
    return { name: null, folio: trimmed };
  }
  return { name: trimmed, folio: '' };
}

export function parsePlanHistory(workbook: XLSX.WorkBook, mapping: HistoryColumnMapping): HistoryParseResult {
  const matrix = getSheetMatrix(workbook, mapping.sheetName);
  const headerRow = matrix[mapping.headerRowIndex] ?? [];
  const dataRows = matrix.slice(mapping.headerRowIndex + 1);
  const warnings: string[] = [];
  const drafts: HistoryAssignmentDraft[] = [];

  // Precalcula la weekKey válida de cada columna de fecha del encabezado; ignora pares
  // cuya fecha no sea plausible (huecos/inconsistencias reales encontradas en el archivo).
  const weekKeyByDateColumn = new Map<number, string>();
  let skippedWeekPairs = 0;
  for (let col = mapping.firstWeekColumn; col + 1 < headerRow.length; col += 2) {
    const dateCol = col + 1;
    const serial = Number(headerRow[dateCol]);
    if (isPlausibleDateSerial(serial)) {
      weekKeyByDateColumn.set(dateCol, buildWeek(excelSerialToDate(serial)).key);
    } else {
      skippedWeekPairs += 1;
    }
  }

  dataRows.forEach((row) => {
    const lineName = (row[mapping.lineColumn] ?? '').trim();
    if (!lineName) return;

    const team = normalizeTeam(row[mapping.teamColumn]) || 'MT1';
    const { value: location } = normalizeLocation(row[mapping.locationColumn]);
    const station = [row[mapping.station1Column], row[mapping.station2Column]]
      .map((s) => (s ?? '').trim())
      .filter(Boolean)
      .join(' - ');

    for (const [dateCol, weekKey] of weekKeyByDateColumn) {
      const weekNumCol = dateCol - 1;
      const layerCell = (row[dateCol] ?? '').trim().toUpperCase();
      const auditorCell = row[weekNumCol] ?? '';

      let layer: Layer | null = null;
      let auditorName: string | null = null;
      let folio = '';

      if (layerCell === 'L1' || layerCell === 'L2' || layerCell === 'L3') {
        layer = layerCell;
        const split = splitAuditorAndFolio(auditorCell);
        auditorName = split.name;
        folio = split.folio;
      } else if (/^\d{4,}$/.test(layerCell)) {
        // Formato antiguo detectado en 2025: solo un folio suelto en la columna de fecha,
        // sin L1/L2/L3 explícita. Se asume L1 (la cadencia semanal base) — supuesto marcado
        // para que se revise, no una regla confirmada.
        layer = 'L1';
        folio = layerCell;
        auditorName = null;
      } else {
        continue;
      }

      drafts.push({ weekKey, lineName, team, location, station, layer, auditorName, folio });
    }
  });

  if (skippedWeekPairs > 0) {
    warnings.push(
      `${skippedWeekPairs} columna(s) de semana se ignoraron por tener una fecha de encabezado inválida o fuera de rango.`,
    );
  }

  const assumedL1Count = drafts.filter((d) => d.folio && !d.auditorName && d.layer === 'L1').length;
  if (assumedL1Count > 0) {
    warnings.push(
      `${assumedL1Count} registro(s) se migraron como L1 asumido (solo tenían un folio suelto, sin "L1/L2/L3" explícita ni auditor) — formato antiguo detectado en las semanas de 2025. Revísalos si algo no cuadra.`,
    );
  }

  return { drafts, warnings, skippedWeekPairs };
}
