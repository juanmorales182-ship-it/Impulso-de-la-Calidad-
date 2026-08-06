import * as XLSX from 'xlsx';
import type { Layer, PlantLocation } from '../domain/types';
import type { AuditorInput, LineInput } from '../storage/repository';

export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array' });
}

export function listSheets(workbook: XLSX.WorkBook): string[] {
  return workbook.SheetNames;
}

function columnLetter(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/**
 * Matriz cruda de la hoja (fila -> columna -> texto), con filas totalmente vacías descartadas.
 * Es la única fuente de verdad: encabezados y datos se leen de la misma matriz para que
 * nunca queden desalineados (a diferencia del modo "objeto" de SheetJS, que puede usar una
 * fila distinta como encabezado si hay filas de título en blanco arriba de los datos).
 */
export function getSheetMatrix(workbook: XLSX.WorkBook, sheetName: string): string[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false });
  return rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : String(cell).trim())));
}

/** Primeras `count` filas de la hoja, para mostrar una vista previa y elegir bien la fila de encabezados. */
export function getPreviewRows(workbook: XLSX.WorkBook, sheetName: string, count = 6): string[][] {
  return getSheetMatrix(workbook, sheetName).slice(0, count);
}

export interface HeaderOption {
  columnIndex: number;
  label: string;
}

/**
 * Columnas disponibles en la fila de encabezados elegida, identificadas por índice de columna
 * (no por el texto del encabezado) para que headers duplicados o vacíos — comunes en Excels con
 * varios bloques de columnas — no se confundan entre sí.
 */
export function getHeaderOptions(workbook: XLSX.WorkBook, sheetName: string, headerRowIndex: number): HeaderOption[] {
  const matrix = getSheetMatrix(workbook, sheetName);
  const headerRow = matrix[headerRowIndex] ?? [];
  return headerRow.map((h, i) => ({
    columnIndex: i,
    label: `${columnLetter(i)}: ${h || '(sin título)'}`,
  }));
}

export function getDataRows(workbook: XLSX.WorkBook, sheetName: string, headerRowIndex: number): string[][] {
  return getSheetMatrix(workbook, sheetName).slice(headerRowIndex + 1);
}

function normalize(text: unknown): string {
  return String(text ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const LOCATION_ALIASES: Record<string, PlantLocation> = {
  principal: 'Principal',
  planta: 'Principal',
  'planta principal': 'Principal',
  ext: 'Ext.',
  'ext.': 'Ext.',
  externa: 'Ext.',
  extension: 'Ext.',
  ambas: 'Ambas',
  both: 'Ambas',
  'los dos': 'Ambas',
  todas: 'Ambas',
};

export function normalizeLocation(raw: unknown): { value: PlantLocation; recognized: boolean } {
  const key = normalize(raw);
  const value = LOCATION_ALIASES[key];
  if (value) return { value, recognized: true };
  return { value: 'Principal', recognized: false };
}

/**
 * Acepta tanto texto ("L1", "L1,L2,L3") como el número de nivel solo ("1", "2", "3"),
 * porque algunos catálogos reales (p. ej. una columna "Capa auditor" con valores 1/2/3)
 * usan el número desnudo en vez de "L1"/"L2"/"L3".
 */
export function parseLayers(raw: unknown): { layers: Layer[]; unknown: string[] } {
  const parts = String(raw ?? '')
    .split(/[,;/\s]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  const layers: Layer[] = [];
  const unknownParts: string[] = [];
  for (const part of parts) {
    const normalized = /^[123]$/.test(part) ? `L${part}` : part;
    if (normalized === 'L1' || normalized === 'L2' || normalized === 'L3') {
      if (!layers.includes(normalized)) layers.push(normalized);
    } else {
      unknownParts.push(part);
    }
  }
  return { layers, unknown: unknownParts };
}

export interface LineColumnMapping {
  sheetName: string;
  headerRowIndex: number;
  nameColumn: number;
  teamColumn: number;
  locationColumn?: number;
}

export interface AuditorColumnMapping {
  sheetName: string;
  headerRowIndex: number;
  nameColumn: number;
  layersColumn: number;
  locationColumn?: number;
}

export interface ImportResult<T> {
  items: T[];
  warnings: string[];
}

export function mapRowsToLines(workbook: XLSX.WorkBook, mapping: LineColumnMapping): ImportResult<LineInput> {
  const rows = getDataRows(workbook, mapping.sheetName, mapping.headerRowIndex);
  const warnings: string[] = [];
  const items: LineInput[] = [];

  rows.forEach((row, idx) => {
    const rowNum = mapping.headerRowIndex + idx + 2; // fila real en Excel (1-based)
    const name = (row[mapping.nameColumn] ?? '').trim();
    if (!name) {
      return;
    }
    const team = (row[mapping.teamColumn] ?? '').trim() || 'MT1';

    let location: PlantLocation = 'Principal';
    if (mapping.locationColumn !== undefined) {
      const rawValue = row[mapping.locationColumn];
      const result = normalizeLocation(rawValue);
      location = result.value;
      if (rawValue && !result.recognized) {
        warnings.push(
          `Fila ${rowNum} (${name}): ubicación "${rawValue}" no reconocida, se asignó "Principal" — revísala.`,
        );
      }
    }

    items.push({ name, team, location });
  });

  return { items, warnings };
}

export function mapRowsToAuditors(
  workbook: XLSX.WorkBook,
  mapping: AuditorColumnMapping,
): ImportResult<AuditorInput> {
  const rows = getDataRows(workbook, mapping.sheetName, mapping.headerRowIndex);
  const warnings: string[] = [];
  const items: AuditorInput[] = [];

  rows.forEach((row, idx) => {
    const rowNum = mapping.headerRowIndex + idx + 2;
    const name = (row[mapping.nameColumn] ?? '').trim();
    if (!name) {
      return;
    }

    const { layers, unknown } = parseLayers(row[mapping.layersColumn]);
    if (unknown.length > 0) {
      warnings.push(`Fila ${rowNum} (${name}): valores de capa no reconocidos: ${unknown.join(', ')}.`);
    }
    if (layers.length === 0) {
      warnings.push(`Fila ${rowNum} (${name}): sin capas válidas (L1/L2/L3), se omite.`);
      return;
    }

    let location: PlantLocation = 'Principal';
    if (mapping.locationColumn !== undefined) {
      const rawValue = row[mapping.locationColumn];
      const result = normalizeLocation(rawValue);
      location = result.value;
      if (rawValue && !result.recognized) {
        warnings.push(
          `Fila ${rowNum} (${name}): ubicación "${rawValue}" no reconocida, se asignó "Principal" — revísala.`,
        );
      }
    }

    items.push({ name, layers, location });
  });

  return { items, warnings };
}
