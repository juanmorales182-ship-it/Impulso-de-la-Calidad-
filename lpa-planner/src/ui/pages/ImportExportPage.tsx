import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import {
  getHeaderOptions,
  getPreviewRows,
  listSheets,
  mapRowsToAuditors,
  mapRowsToLines,
  readWorkbook,
  type AuditorColumnMapping,
  type LineColumnMapping,
} from '../../excel/importCatalog';
import type * as XLSX from 'xlsx';
import { exportStateAsJson, importStateFromJson } from '../../storage/db';
import { buildPlanWorkbook, downloadWorkbook } from '../../excel/exportPlan';

function emptyLineMapping(sheetName: string): LineColumnMapping {
  return { sheetName, headerRowIndex: 0, nameColumn: -1, teamColumn: -1, locationColumn: undefined };
}

function emptyAuditorMapping(sheetName: string): AuditorColumnMapping {
  return { sheetName, headerRowIndex: 0, nameColumn: -1, layersColumn: -1, locationColumn: undefined };
}

function ColumnSelect({
  value,
  onChange,
  options,
  optional,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  options: { columnIndex: number; label: string }[];
  optional?: boolean;
}) {
  return (
    <select
      value={value === undefined || value === -1 ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    >
      <option value="">{optional ? '(no importar / default Principal)' : '— Selecciona —'}</option>
      {options.map((o) => (
        <option key={o.columnIndex} value={o.columnIndex}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function SheetPreview({ rows, headerRowIndex }: { rows: string[][]; headerRowIndex: number }) {
  if (rows.length === 0) return null;
  return (
    <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table className="data-table" style={{ fontSize: 11 }}>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} style={rowIdx === headerRowIndex ? { background: 'var(--color-warning-bg)' } : undefined}>
              <td style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Fila {rowIdx + 1}
                {rowIdx === headerRowIndex ? ' (encabezados)' : ''}
              </td>
              {row.slice(0, 12).map((cell, cellIdx) => (
                <td key={cellIdx}>{cell || '·'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ImportExportPage() {
  const data = useStore((s) => s.data);
  const importLines = useStore((s) => s.importLines);
  const importAuditors = useStore((s) => s.importAuditors);
  const restoreFromBackup = useStore((s) => s.restoreFromBackup);

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState('');
  const [lineMapping, setLineMapping] = useState<LineColumnMapping>(emptyLineMapping(''));
  const [auditorMapping, setAuditorMapping] = useState<AuditorColumnMapping>(emptyAuditorMapping(''));
  const [lineWarnings, setLineWarnings] = useState<string[] | null>(null);
  const [auditorWarnings, setAuditorWarnings] = useState<string[] | null>(null);
  const [importedCount, setImportedCount] = useState<{ lines: number; auditors: number } | null>(null);

  const sheets = useMemo(() => (workbook ? listSheets(workbook) : []), [workbook]);

  const lineHeaderOptions = useMemo(
    () => (workbook && lineMapping.sheetName ? getHeaderOptions(workbook, lineMapping.sheetName, lineMapping.headerRowIndex) : []),
    [workbook, lineMapping.sheetName, lineMapping.headerRowIndex],
  );
  const linePreviewRows = useMemo(
    () => (workbook && lineMapping.sheetName ? getPreviewRows(workbook, lineMapping.sheetName, 6) : []),
    [workbook, lineMapping.sheetName],
  );

  const auditorHeaderOptions = useMemo(
    () =>
      workbook && auditorMapping.sheetName
        ? getHeaderOptions(workbook, auditorMapping.sheetName, auditorMapping.headerRowIndex)
        : [],
    [workbook, auditorMapping.sheetName, auditorMapping.headerRowIndex],
  );
  const auditorPreviewRows = useMemo(
    () => (workbook && auditorMapping.sheetName ? getPreviewRows(workbook, auditorMapping.sheetName, 6) : []),
    [workbook, auditorMapping.sheetName],
  );

  async function handleFile(file: File) {
    const wb = await readWorkbook(file);
    setWorkbook(wb);
    setFileName(file.name);
    const firstSheet = listSheets(wb)[0] ?? '';
    setLineMapping(emptyLineMapping(firstSheet));
    setAuditorMapping(emptyAuditorMapping(firstSheet));
    setImportedCount(null);
    setLineWarnings(null);
    setAuditorWarnings(null);
  }

  function handleImportLines() {
    if (!workbook || lineMapping.nameColumn < 0 || lineMapping.teamColumn < 0) return;
    const { items, warnings } = mapRowsToLines(workbook, lineMapping);
    const count = importLines(items);
    setLineWarnings(warnings);
    setImportedCount((prev) => ({ lines: count, auditors: prev?.auditors ?? 0 }));
  }

  function handleImportAuditors() {
    if (!workbook || auditorMapping.nameColumn < 0 || auditorMapping.layersColumn < 0) return;
    const { items, warnings } = mapRowsToAuditors(workbook, auditorMapping);
    const count = importAuditors(items);
    setAuditorWarnings(warnings);
    setImportedCount((prev) => ({ lines: prev?.lines ?? 0, auditors: count }));
  }

  function handleBackupDownload() {
    const json = exportStateAsJson(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lpa-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBackupUpload(file: File) {
    const text = await file.text();
    const state = importStateFromJson(text);
    restoreFromBackup(state);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Importar / Exportar</h2>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>1. Cargar archivo Excel</h3>
        <p className="hint">
          Sube tu Excel actual. Después eliges la hoja, la fila donde están los encabezados reales (muchos Excels
          tienen una fila de título arriba) y qué columna corresponde a cada campo.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {fileName && <p className="hint">Archivo cargado: {fileName}</p>}
      </div>

      {workbook && (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>2. Mapeo de columnas — Líneas</h3>
            <div className="mapping-row">
              <label>Hoja</label>
              <select
                value={lineMapping.sheetName}
                onChange={(e) => setLineMapping(emptyLineMapping(e.target.value))}
              >
                {sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label>Fila de encabezados</label>
              <input
                type="number"
                min={1}
                value={lineMapping.headerRowIndex + 1}
                onChange={(e) =>
                  setLineMapping((m) => ({ ...m, headerRowIndex: Math.max(0, Number(e.target.value) - 1), nameColumn: -1, teamColumn: -1, locationColumn: undefined }))
                }
                style={{ width: 80 }}
              />
            </div>
            <SheetPreview rows={linePreviewRows} headerRowIndex={lineMapping.headerRowIndex} />
            <div className="mapping-row">
              <label>Columna: Nombre de línea *</label>
              <ColumnSelect
                value={lineMapping.nameColumn}
                onChange={(v) => setLineMapping((m) => ({ ...m, nameColumn: v ?? -1 }))}
                options={lineHeaderOptions}
              />
            </div>
            <div className="mapping-row">
              <label>Columna: Equipo/BU *</label>
              <ColumnSelect
                value={lineMapping.teamColumn}
                onChange={(v) => setLineMapping((m) => ({ ...m, teamColumn: v ?? -1 }))}
                options={lineHeaderOptions}
              />
            </div>
            <div className="mapping-row">
              <label>Columna: Ubicación</label>
              <ColumnSelect
                value={lineMapping.locationColumn}
                onChange={(v) => setLineMapping((m) => ({ ...m, locationColumn: v }))}
                options={lineHeaderOptions}
                optional
              />
            </div>
            <button
              type="button"
              className="btn"
              disabled={lineMapping.nameColumn < 0 || lineMapping.teamColumn < 0}
              onClick={handleImportLines}
            >
              Importar líneas
            </button>
            {lineWarnings && (
              <div className="warning-box" style={{ marginTop: 12 }}>
                <strong>Avisos ({lineWarnings.length}):</strong>
                {lineWarnings.length === 0 ? (
                  <p style={{ margin: '6px 0 0' }}>Sin observaciones.</p>
                ) : (
                  <ul>
                    {lineWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>3. Mapeo de columnas — Auditores</h3>
            <p className="hint">
              Si tu catálogo de auditores está partido en varios bloques de columnas (p. ej. "Auditores de LPA's" y
              "Auditores de Producto" lado a lado), repite este paso una vez por bloque — los nombres se emparejan
              autom&aacute;ticamente, no se duplican.
            </p>
            <div className="mapping-row">
              <label>Hoja</label>
              <select
                value={auditorMapping.sheetName}
                onChange={(e) => setAuditorMapping(emptyAuditorMapping(e.target.value))}
              >
                {sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label>Fila de encabezados</label>
              <input
                type="number"
                min={1}
                value={auditorMapping.headerRowIndex + 1}
                onChange={(e) =>
                  setAuditorMapping((m) => ({ ...m, headerRowIndex: Math.max(0, Number(e.target.value) - 1), nameColumn: -1, layersColumn: -1, locationColumn: undefined }))
                }
                style={{ width: 80 }}
              />
            </div>
            <SheetPreview rows={auditorPreviewRows} headerRowIndex={auditorMapping.headerRowIndex} />
            <div className="mapping-row">
              <label>Columna: Nombre de auditor *</label>
              <ColumnSelect
                value={auditorMapping.nameColumn}
                onChange={(v) => setAuditorMapping((m) => ({ ...m, nameColumn: v ?? -1 }))}
                options={auditorHeaderOptions}
              />
            </div>
            <div className="mapping-row">
              <label>Columna: Capas (L1/L2/L3 o 1/2/3) *</label>
              <ColumnSelect
                value={auditorMapping.layersColumn}
                onChange={(v) => setAuditorMapping((m) => ({ ...m, layersColumn: v ?? -1 }))}
                options={auditorHeaderOptions}
              />
            </div>
            <div className="mapping-row">
              <label>Columna: Ubicación</label>
              <ColumnSelect
                value={auditorMapping.locationColumn}
                onChange={(v) => setAuditorMapping((m) => ({ ...m, locationColumn: v }))}
                options={auditorHeaderOptions}
                optional
              />
            </div>
            <button
              type="button"
              className="btn"
              disabled={auditorMapping.nameColumn < 0 || auditorMapping.layersColumn < 0}
              onClick={handleImportAuditors}
            >
              Importar auditores
            </button>
            {auditorWarnings && (
              <div className="warning-box" style={{ marginTop: 12 }}>
                <strong>Avisos ({auditorWarnings.length}):</strong>
                {auditorWarnings.length === 0 ? (
                  <p style={{ margin: '6px 0 0' }}>Sin observaciones.</p>
                ) : (
                  <ul>
                    {auditorWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {importedCount && (
            <div className="warning-box" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
              Importación completa: {importedCount.lines} línea(s), {importedCount.auditors} auditor(es) creados o
              actualizados (se emparejan por nombre).
            </div>
          )}
        </>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Exportar histórico completo a Excel</h3>
        <button
          type="button"
          className="btn secondary"
          disabled={data.assignments.length === 0}
          onClick={() => downloadWorkbook(buildPlanWorkbook(data, data.weeks.map((w) => w.key)), 'LPA_plan_completo.xlsx')}
        >
          Exportar todas las semanas
        </button>
        <p className="hint">Para exportar solo una semana usa el botón en la pantalla de "Propuesta semanal".</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Respaldo completo (JSON)</h3>
        <p className="hint">
          Guarda o restaura todos los datos de la app (líneas, auditores, semanas, asignaciones) como un solo archivo.
          Útil como respaldo adicional al Excel.
        </p>
        <button type="button" className="btn secondary" onClick={handleBackupDownload}>
          Descargar respaldo (.json)
        </button>{' '}
        <label className="btn secondary" style={{ display: 'inline-block' }}>
          Restaurar desde respaldo
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBackupUpload(file);
            }}
          />
        </label>
      </div>
    </div>
  );
}
