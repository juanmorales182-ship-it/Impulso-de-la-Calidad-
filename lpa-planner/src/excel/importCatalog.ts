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

export function getSheetHeaders(workbook: XLSX.WorkBook, sheetName: string): string[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, blankrows: false });
  return (rows[0] ?? []).map((h) => String(h ?? '').trim());
}

export function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
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

export function parseLayers(raw: unknown): { layers: Layer[]; unknown: string[] } {
  const parts = String(raw ?? '')
    .split(/[,;/\s]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  const layers: Layer[] = [];
  const unknownParts: string[] = [];
  for (const part of parts) {
    if (part === 'L1' || part === 'L2' || part === 'L3') {
      if (!layers.includes(part)) layers.push(part);
    } else {
      unknownParts.push(part);
    }
  }
  return { layers, unknown: unknownParts };
}

export interface LineColumnMapping {
  sheetName: string;
  name: string;
  team: string;
  location?: string;
  active?: string;
}

export interface AuditorColumnMapping {
  sheetName: string;
  name: string;
  layers: string;
  location?: string;
}

export interface ImportResult<T> {
  items: T[];
  warnings: string[];
}

export function mapRowsToLines(workbook: XLSX.WorkBook, mapping: LineColumnMapping): ImportResult<LineInput> {
  const rows = getSheetRows(workbook, mapping.sheetName);
  const warnings: string[] = [];
  const items: LineInput[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 por encabezado, +1 por índice base 1
    const name = String(row[mapping.name] ?? '').trim();
    if (!name) {
      warnings.push(`Fila ${rowNum}: sin nombre de línea, se omite.`);
      return;
    }
    const team = String(row[mapping.team] ?? '').trim() || 'MT1';

    let location: PlantLocation = 'Principal';
    if (mapping.location) {
      const result = normalizeLocation(row[mapping.location]);
      location = result.value;
      if (!result.recognized) {
        warnings.push(
          `Fila ${rowNum} (${name}): ubicación "${row[mapping.location]}" no reconocida, se asignó "Principal" — revísala.`,
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
  const rows = getSheetRows(workbook, mapping.sheetName);
  const warnings: string[] = [];
  const items: AuditorInput[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const name = String(row[mapping.name] ?? '').trim();
    if (!name) {
      warnings.push(`Fila ${rowNum}: sin nombre de auditor, se omite.`);
      return;
    }

    const { layers, unknown } = parseLayers(row[mapping.layers]);
    if (unknown.length > 0) {
      warnings.push(`Fila ${rowNum} (${name}): valores de capa no reconocidos: ${unknown.join(', ')}.`);
    }
    if (layers.length === 0) {
      warnings.push(`Fila ${rowNum} (${name}): sin capas válidas (L1/L2/L3), se omite.`);
      return;
    }

    let location: PlantLocation = 'Principal';
    if (mapping.location) {
      const result = normalizeLocation(row[mapping.location]);
      location = result.value;
      if (!result.recognized) {
        warnings.push(
          `Fila ${rowNum} (${name}): ubicación "${row[mapping.location]}" no reconocida, se asignó "Principal" — revísala.`,
        );
      }
    }

    items.push({ name, layers, location });
  });

  return { items, warnings };
}
