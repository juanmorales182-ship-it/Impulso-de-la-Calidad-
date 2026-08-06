import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import {
  getSheetHeaders,
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

const EMPTY_LINE_MAPPING: LineColumnMapping = { sheetName: '', name: '', team: '', location: '' };
const EMPTY_AUDITOR_MAPPING: AuditorColumnMapping = { sheetName: '', name: '', layers: '', location: '' };

export default function ImportExportPage() {
  const data = useStore((s) => s.data);
  const importLines = useStore((s) => s.importLines);
  const importAuditors = useStore((s) => s.importAuditors);
  const restoreFromBackup = useStore((s) => s.restoreFromBackup);

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState('');
  const [lineMapping, setLineMapping] = useState<LineColumnMapping>(EMPTY_LINE_MAPPING);
  const [auditorMapping, setAuditorMapping] = useState<AuditorColumnMapping>(EMPTY_AUDITOR_MAPPING);
  const [lineWarnings, setLineWarnings] = useState<string[] | null>(null);
  const [auditorWarnings, setAuditorWarnings] = useState<string[] | null>(null);
  const [importedCount, setImportedCount] = useState<{ lines: number; auditors: number } | null>(null);

  const sheets = useMemo(() => (workbook ? listSheets(workbook) : []), [workbook]);
  const lineSheetHeaders = useMemo(
    () => (workbook && lineMapping.sheetName ? getSheetHeaders(workbook, lineMapping.sheetName) : []),
    [workbook, lineMapping.sheetName],
  );
  const auditorSheetHeaders = useMemo(
    () => (workbook && auditorMapping.sheetName ? getSheetHeaders(workbook, auditorMapping.sheetName) : []),
    [workbook, auditorMapping.sheetName],
  );

  async function handleFile(file: File) {
    const wb = await readWorkbook(file);
    setWorkbook(wb);
    setFileName(file.name);
    const firstSheet = listSheets(wb)[0] ?? '';
    setLineMapping({ sheetName: firstSheet, name: '', team: '', location: '' });
    setAuditorMapping({ sheetName: firstSheet, name: '', layers: '', location: '' });
    setImportedCount(null);
    setLineWarnings(null);
    setAuditorWarnings(null);
  }

  function handleImportLines() {
    if (!workbook || !lineMapping.name || !lineMapping.team) return;
    const { items, warnings } = mapRowsToLines(workbook, lineMapping);
    const count = importLines(items);
    setLineWarnings(warnings);
    setImportedCount((prev) => ({ lines: count, auditors: prev?.auditors ?? 0 }));
  }

  function handleImportAuditors() {
    if (!workbook || !auditorMapping.name || !auditorMapping.layers) return;
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
          Sube tu Excel actual. Después eliges qué columna corresponde a cada campo — funciona con el formato que ya
          tengas, no hace falta que coincida con nombres específicos.
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
                onChange={(e) => setLineMapping((m) => ({ ...m, sheetName: e.target.value }))}
              >
                {sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label>Columna: Nombre de línea *</label>
              <select value={lineMapping.name} onChange={(e) => setLineMapping((m) => ({ ...m, name: e.target.value }))}>
                <option value="">— Selecciona —</option>
                {lineSheetHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label>Columna: Equipo/BU *</label>
              <select value={lineMapping.team} onChange={(e) => setLineMapping((m) => ({ ...m, team: e.target.value }))}>
                <option value="">— Selecciona —</option>
                {lineSheetHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label>Columna: Ubicación</label>
              <select
                value={lineMapping.location}
                onChange={(e) => setLineMapping((m) => ({ ...m, location: e.target.value }))}
              >
                <option value="">(no importar / default Principal)</option>
                {lineSheetHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn" disabled={!lineMapping.name || !lineMapping.team} onClick={handleImportLines}>
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
            <div className="mapping-row">
              <label>Hoja</label>
              <select
                value={auditorMapping.sheetName}
                onChange={(e) => setAuditorMapping((m) => ({ ...m, sheetName: e.target.value }))}
              >
                {sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label>Columna: Nombre de auditor *</label>
              <select
                value={auditorMapping.name}
                onChange={(e) => setAuditorMapping((m) => ({ ...m, name: e.target.value }))}
              >
                <option value="">— Selecciona —</option>
                {auditorSheetHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label>Columna: Capas (L1/L2/L3) *</label>
              <select
                value={auditorMapping.layers}
                onChange={(e) => setAuditorMapping((m) => ({ ...m, layers: e.target.value }))}
              >
                <option value="">— Selecciona —</option>
                {auditorSheetHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="mapping-row">
              <label>Columna: Ubicación</label>
              <select
                value={auditorMapping.location}
                onChange={(e) => setAuditorMapping((m) => ({ ...m, location: e.target.value }))}
              >
                <option value="">(no importar / default Principal)</option>
                {auditorSheetHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn"
              disabled={!auditorMapping.name || !auditorMapping.layers}
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
