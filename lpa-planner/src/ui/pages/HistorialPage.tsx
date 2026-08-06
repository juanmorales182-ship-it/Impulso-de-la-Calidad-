import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import { getHistoryAssignments } from '../../storage/repository';
import { buildHistoryWorkbook, downloadWorkbook } from '../../excel/exportPlan';

export default function HistorialPage() {
  const data = useStore((s) => s.data);
  const [search, setSearch] = useState('');

  const history = useMemo(() => getHistoryAssignments(data).sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1)), [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.trim().toLowerCase();
    return history.filter((a) => {
      const line = data.lines.find((l) => l.id === a.lineId);
      const auditor = data.auditors.find((au) => au.id === a.auditorId);
      return (
        a.weekKey.toLowerCase().includes(q) ||
        line?.name.toLowerCase().includes(q) ||
        auditor?.name.toLowerCase().includes(q) ||
        a.folio.toLowerCase().includes(q)
      );
    });
  }, [history, search, data.lines, data.auditors]);

  return (
    <div>
      <div className="page-header">
        <h2>Histórico (semanas cerradas)</h2>
        <button
          type="button"
          className="btn secondary"
          disabled={filtered.length === 0}
          onClick={() => downloadWorkbook(buildHistoryWorkbook(data, filtered), 'LPA_historico.xlsx')}
        >
          Exportar histórico visible a Excel
        </button>
      </div>

      <div className="warning-box">
        Estos registros quedaron bloqueados automáticamente al pasar su fecha de cierre (jueves). Se pueden consultar pero
        no editarse ni borrarse.
      </div>

      <div className="card">
        <input
          type="text"
          placeholder="Buscar por semana, línea, auditor o folio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', marginBottom: 14, border: '1px solid var(--color-border)', borderRadius: 6 }}
        />

        {filtered.length === 0 ? (
          <p className="empty-state">Sin registros históricos todavía.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Línea</th>
                <th>Equipo</th>
                <th>Ubicación</th>
                <th>Capa</th>
                <th>Auditor</th>
                <th>Folio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const line = data.lines.find((l) => l.id === a.lineId);
                const auditor = data.auditors.find((au) => au.id === a.auditorId);
                return (
                  <tr key={a.id} className="locked-row">
                    <td>{a.weekKey}</td>
                    <td>{line?.name ?? '(línea eliminada)'}</td>
                    <td>{line?.team ?? ''}</td>
                    <td>{line?.location ?? ''}</td>
                    <td>{a.layer}</td>
                    <td>{auditor?.name ?? 'SIN ASIGNAR'}</td>
                    <td>{a.folio || '—'}</td>
                    <td>
                      <span className={`badge ${a.status}`}>{a.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
