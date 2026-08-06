import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parsePlanHistory, type HistoryColumnMapping } from '../importHistory';

function excelSerial(isoDate: string): number {
  const epoch = Date.UTC(1899, 11, 30);
  return Math.round((new Date(isoDate + 'T00:00:00Z').getTime() - epoch) / 86_400_000);
}

function buildWorkbook(headerRow: unknown[], dataRows: unknown[][]): XLSX.WorkBook {
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'PLAN');
  return workbook;
}

const BASE_MAPPING: HistoryColumnMapping = {
  sheetName: 'PLAN',
  headerRowIndex: 0,
  teamColumn: 2,
  locationColumn: 3,
  lineColumn: 4,
  station1Column: 5,
  station2Column: 6,
  firstWeekColumn: 8,
};

describe('parsePlanHistory', () => {
  it('reads L1/L2/L3 from the date column and splits auditor+folio from the week-number column', () => {
    const headerRow = [
      '', '#', 'Production  Team', 'Principal/Ext.', 'Linea de Produccion', 'Estacion 1', 'Estacion 2', 'EP',
      19, excelSerial('2026-05-11'), // semana 19: (week#, date) pair
    ];
    const dataRow = [
      '', '', 'EQUIPO GM', 'Principal', 'DELTA', 'AFTERMARKET', '', 3,
      'SONIA RESENDIZ 1804257', 'L2',
    ];
    const wb = buildWorkbook(headerRow, [dataRow]);

    const { drafts, warnings } = parsePlanHistory(wb, BASE_MAPPING);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      lineName: 'DELTA',
      team: 'GM', // normalizado desde "EQUIPO GM"
      location: 'Principal',
      layer: 'L2',
      auditorName: 'SONIA RESENDIZ',
      folio: '1804257',
    });
    expect(warnings.some((w) => w.includes('formato antiguo'))).toBe(false);
  });

  it('assigns a real ISO week key derived from the header date column', () => {
    const headerRow = [
      '', '#', 'Team', 'Loc', 'Linea', 'E1', 'E2', 'EP',
      19, excelSerial('2026-05-11'),
    ];
    const dataRow = ['', '', 'MT1', 'Principal', 'P71A', '', '', 3, 'JUAN PEREZ 999', 'L1'];
    const wb = buildWorkbook(headerRow, [dataRow]);

    const { drafts } = parsePlanHistory(wb, BASE_MAPPING);
    expect(drafts[0].weekKey).toMatch(/^2026-W\d{2}$/);
  });

  it('treats a bare folio number with no explicit layer as an assumed L1, with no auditor', () => {
    const headerRow = [
      '', '#', 'Team', 'Loc', 'Linea', 'E1', 'E2', 'EP',
      5, excelSerial('2025-01-30'),
    ];
    const dataRow = ['', '', 'MT1', 'Principal', 'P71A', 'AFTERMARKET', '', 3, '1', '91286'];
    const wb = buildWorkbook(headerRow, [dataRow]);

    const { drafts, warnings } = parsePlanHistory(wb, BASE_MAPPING);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ layer: 'L1', folio: '91286', auditorName: null });
    expect(warnings.some((w) => w.includes('formato antiguo'))).toBe(true);
  });

  it('skips week-pair columns whose header date is not a plausible serial', () => {
    const headerRow = [
      '', '#', 'Team', 'Loc', 'Linea', 'E1', 'E2', 'EP',
      24, 'not-a-date',
      2, excelSerial('2026-05-11'),
    ];
    const dataRow = ['', '', 'MT1', 'Principal', 'P71A', '', '', 3, 'garbage', 'L1', 'NOMBRE 555', 'L2'];
    const wb = buildWorkbook(headerRow, [dataRow]);

    const { drafts, skippedWeekPairs } = parsePlanHistory(wb, BASE_MAPPING);
    expect(skippedWeekPairs).toBe(1);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].layer).toBe('L2');
  });

  it('skips rows with no line name', () => {
    const headerRow = ['', '#', 'Team', 'Loc', 'Linea', 'E1', 'E2', 'EP', 19, excelSerial('2026-05-11')];
    const dataRow = ['', '', 'MT1', 'Principal', '', '', '', 3, 'X', 'L1'];
    const wb = buildWorkbook(headerRow, [dataRow]);

    const { drafts } = parsePlanHistory(wb, BASE_MAPPING);
    expect(drafts).toHaveLength(0);
  });

  it('joins Estacion 1 + Estacion 2 into the station field', () => {
    const headerRow = ['', '#', 'Team', 'Loc', 'Linea', 'E1', 'E2', 'EP', 19, excelSerial('2026-05-11')];
    const dataRow = ['', '', 'MT1', 'Principal', 'P71A', '026-001 Remachadora', 'Zona B', 3, 'X', 'L1'];
    const wb = buildWorkbook(headerRow, [dataRow]);

    const { drafts } = parsePlanHistory(wb, BASE_MAPPING);
    expect(drafts[0].station).toBe('026-001 Remachadora - Zona B');
  });
});
