import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import type { Assignment, AssignmentStatus, Layer } from '../../domain/types';
import { buildWeekByKey, currentWeek, isWeekLocked, nextWeek, previousWeek } from '../../domain/weeks';
import { validateAssignment } from '../../domain/validators';
import { buildPlanWorkbook, downloadWorkbook } from '../../excel/exportPlan';

const LAYERS: Layer[] = ['L1', 'L2', 'L3'];
const STATUSES: AssignmentStatus[] = ['propuesta', 'confirmada', 'cerrada'];

const REASON_LABEL: Record<Assignment['reason'], string> = {
  normal: 'Cadencia normal',
  quarterly: 'Trimestral (L2+L3)',
  'gm-l3': 'Mínimo semanal GM',
  firewall: 'Firewall (siempre L2+L3)',
};

export default function PropuestaPage() {
  const data = useStore((s) => s.data);
  const generateProposalForWeek = useStore((s) => s.generateProposalForWeek);
  const updateAssignment = useStore((s) => s.updateAssignment);
  const deleteAssignment = useStore((s) => s.deleteAssignment);
  const addManualAssignment = useStore((s) => s.addManualAssignment);
  const lastWarnings = useStore((s) => s.lastWarnings);
  const uiWeekKey = useStore((s) => s.uiWeekKey);
  const setUiWeekKey = useStore((s) => s.setUiWeekKey);

  const weekKey = uiWeekKey ?? nextWeek(currentWeek()).key;
  const setWeekKey = setUiWeekKey;
  const [addLineId, setAddLineId] = useState('');
  const [addLayer, setAddLayer] = useState<Layer>('L1');

  const week = useMemo(() => buildWeekByKey(weekKey), [weekKey]);
  const locked = useMemo(() => isWeekLocked(week), [week]);

  const assignments = useMemo(
    () => data.assignments.filter((a) => a.weekKey === weekKey).sort((a, b) => {
      const lineA = data.lines.find((l) => l.id === a.lineId)?.name ?? '';
      const lineB = data.lines.find((l) => l.id === b.lineId)?.name ?? '';
      return lineA === lineB ? a.layer.localeCompare(b.layer) : lineA.localeCompare(lineB);
    }),
    [data.assignments, data.lines, weekKey],
  );

  const activeLines = useMemo(() => data.lines.filter((l) => l.active).sort((a, b) => a.name.localeCompare(b.name)), [data.lines]);
  const activeAuditors = useMemo(() => data.auditors.filter((a) => a.active).sort((a, b) => a.name.localeCompare(b.name)), [data.auditors]);

  return (
    <div>
      <div className="page-header">
        <h2>Propuesta semanal</h2>
        <div className="week-nav">
          <button type="button" className="btn secondary small" onClick={() => setWeekKey(previousWeek(week).key)}>
            ← Semana anterior
          </button>
          <strong>
            {week.key} · {week.startDate} a {week.endDate} · cierre {week.closeDate}
          </strong>
          <button type="button" className="btn secondary small" onClick={() => setWeekKey(nextWeek(week).key)}>
            Semana siguiente →
          </button>
        </div>
      </div>

      {locked && (
        <div className="warning-box">
          Esta semana ya cerró (pasó su jueves de cierre el {week.closeDate}). Es histórico inmutable: puedes verlo pero no
          editarlo.
        </div>
      )}

      {lastWarnings.length > 0 && !locked && (
        <div className="warning-box">
          <strong>Avisos de la última generación:</strong>
          <ul>
            {lastWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <button
            type="button"
            className="btn"
            disabled={locked}
            onClick={() => generateProposalForWeek(weekKey)}
          >
            Generar propuesta automática
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={assignments.length === 0}
            onClick={() => downloadWorkbook(buildPlanWorkbook(data, [weekKey]), `LPA_${weekKey}.xlsx`)}
          >
            Exportar esta semana a Excel
          </button>
        </div>

        {assignments.length === 0 ? (
          <p className="empty-state">Sin asignaciones para esta semana. Genera la propuesta o agrega una manualmente.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Línea</th>
                <th>Equipo</th>
                <th>Ubicación</th>
                <th>Capa</th>
                <th>Auditor</th>
                <th>Folio</th>
                <th>Estado</th>
                <th>Motivo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const line = data.lines.find((l) => l.id === a.lineId);
                const auditor = data.auditors.find((au) => au.id === a.auditorId);
                const issues = validateAssignment(a, line, auditor, week, data.assignments.filter((x) => x.id !== a.id));
                return (
                  <tr key={a.id} className={locked ? 'locked-row' : ''}>
                    <td>{line?.name ?? '(línea eliminada)'}</td>
                    <td>{line?.team ?? ''}</td>
                    <td>{line?.location ?? ''}</td>
                    <td>
                      <select
                        value={a.layer}
                        disabled={locked}
                        onChange={(e) => updateAssignment(a.id, { layer: e.target.value as Layer })}
                      >
                        {LAYERS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={a.auditorId ?? ''}
                        disabled={locked}
                        onChange={(e) => updateAssignment(a.id, { auditorId: e.target.value || null })}
                      >
                        <option value="">Sin asignar</option>
                        {activeAuditors.map((au) => (
                          <option key={au.id} value={au.id}>
                            {au.name}
                          </option>
                        ))}
                      </select>
                      {issues.length > 0 && (
                        <div className="lock-note" style={{ color: '#b3261e', fontStyle: 'normal' }}>
                          {issues.join(' ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={a.folio}
                        disabled={locked}
                        placeholder="Folio de seguimiento"
                        style={{ width: 120, padding: '5px 8px' }}
                        onChange={(e) => updateAssignment(a.id, { folio: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={a.status}
                        disabled={locked}
                        onChange={(e) => updateAssignment(a.id, { status: e.target.value as AssignmentStatus })}
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className="hint">{REASON_LABEL[a.reason]}</span>
                    </td>
                    <td>
                      {!locked && (
                        <button type="button" className="btn danger small" onClick={() => deleteAssignment(a.id)}>
                          Quitar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!locked && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Agregar asignación manual</h3>
          <div className="form-grid">
            <div className="field">
              <label>Línea</label>
              <select value={addLineId} onChange={(e) => setAddLineId(e.target.value)}>
                <option value="">Selecciona una línea</option>
                {activeLines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Capa</label>
              <select value={addLayer} onChange={(e) => setAddLayer(e.target.value as Layer)}>
                {LAYERS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="btn secondary"
            disabled={!addLineId}
            onClick={() => {
              addManualAssignment(weekKey, addLineId, addLayer);
              setAddLineId('');
            }}
          >
            + Agregar renglón
          </button>
        </div>
      )}
    </div>
  );
}
