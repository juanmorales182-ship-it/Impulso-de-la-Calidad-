import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import type { Assignment, Line, Week } from '../../domain/types';
import { buildWeekByKey, currentWeek, isWeekLocked, nextWeek, shiftWeek } from '../../domain/weeks';

const WINDOW_SIZE = 14;
const DEFAULT_PAST_WEEKS = 6;

function defaultWindowStartKey(): string {
  return shiftWeek(currentWeek(), -DEFAULT_PAST_WEEKS).key;
}

function MatrixCell({
  assignments,
  auditorNameById,
  locked,
}: {
  assignments: Assignment[];
  auditorNameById: Map<string, string>;
  locked: boolean;
}) {
  return (
    <td className={locked ? 'matrix-week-locked' : ''}>
      {assignments.map((a) => {
        const auditorName = a.auditorId ? (auditorNameById.get(a.auditorId) ?? '?') : null;
        return (
          <span
            key={a.id}
            className={`layer-chip layer-${a.layer} ${a.needsAttention ? 'needs-attention' : ''}`}
            title={[
              a.layer,
              auditorName ?? 'Sin auditor asignado',
              a.folio ? `Folio ${a.folio}` : '',
              a.station ? `Estación: ${a.station}` : '',
              `Estado: ${a.status}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          >
            {a.layer}
            {auditorName ? ` ${auditorName}` : ''}
          </span>
        );
      })}
    </td>
  );
}

export default function MatrizPage({ onNavigateToWeek }: { onNavigateToWeek: (weekKey: string) => void }) {
  const data = useStore((s) => s.data);
  const generateProposalForWeek = useStore((s) => s.generateProposalForWeek);

  const [windowStartKey, setWindowStartKey] = useState(defaultWindowStartKey);
  const [showInactive, setShowInactive] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [teamFilter, setTeamFilter] = useState('');
  const [search, setSearch] = useState('');

  const weeks: Week[] = useMemo(() => {
    const start = buildWeekByKey(windowStartKey);
    const result: Week[] = [start];
    for (let i = 1; i < WINDOW_SIZE; i++) {
      result.push(shiftWeek(start, i));
    }
    return result;
  }, [windowStartKey]);

  const auditorNameById = useMemo(() => new Map(data.auditors.map((a) => [a.id, a.name])), [data.auditors]);

  const cellMap = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of data.assignments) {
      const key = `${a.lineId}::${a.weekKey}`;
      const arr = map.get(key);
      if (arr) arr.push(a);
      else map.set(key, [a]);
    }
    for (const arr of map.values()) {
      arr.sort((x, y) => x.layer.localeCompare(y.layer));
    }
    return map;
  }, [data.assignments]);

  const teams = useMemo(() => [...data.teams].sort(), [data.teams]);

  const lines: Line[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.lines
      .filter((l) => showInactive || l.active)
      .filter((l) => !teamFilter || l.team === teamFilter)
      .filter((l) => !q || l.name.toLowerCase().includes(q))
      .sort((a, b) => (a.team === b.team ? a.name.localeCompare(b.name) : a.team.localeCompare(b.team)));
  }, [data.lines, showInactive, teamFilter, search]);

  const visibleLines = useMemo(() => {
    if (!hideEmpty) return lines;
    return lines.filter((line) => weeks.some((w) => (cellMap.get(`${line.id}::${w.key}`)?.length ?? 0) > 0));
  }, [lines, weeks, cellMap, hideEmpty]);

  function shiftWindow(deltaWeeks: number) {
    setWindowStartKey(shiftWeek(buildWeekByKey(windowStartKey), deltaWeeks).key);
  }

  function handleGenerate() {
    const target = nextWeek(currentWeek());
    generateProposalForWeek(target.key);
    const visible = weeks.some((w) => w.key === target.key);
    if (!visible) setWindowStartKey(shiftWeek(target, -DEFAULT_PAST_WEEKS).key);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Vista Matriz (líneas × semanas)</h2>
        <button type="button" className="btn" onClick={handleGenerate}>
          Generar propuesta automática (semana siguiente)
        </button>
      </div>

      <p className="hint" style={{ marginBottom: 14 }}>
        Histórico y plan en una sola tabla continua, como en tu Excel: naranja = L1, azul = L2, verde = L3. Las
        columnas grises ya cerraron (histórico inmutable); haz clic en el encabezado de una semana para abrirla en
        "Propuesta semanal" y editarla ahí.
      </p>

      <div className="card">
        <div className="form-grid" style={{ marginBottom: 10 }}>
          <div className="field">
            <label>Buscar línea</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="p. ej. CX430" />
          </div>
          <div className="field">
            <label>Equipo</label>
            <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
              <option value="">Todos</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} /> Ocultar
            líneas sin auditorías en el rango visible
          </label>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />{' '}
            Mostrar líneas inactivas
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <button type="button" className="btn secondary small" onClick={() => shiftWindow(-WINDOW_SIZE)}>
            ← {WINDOW_SIZE} semanas
          </button>
          <button type="button" className="btn secondary small" onClick={() => setWindowStartKey(defaultWindowStartKey())}>
            Hoy
          </button>
          <button type="button" className="btn secondary small" onClick={() => shiftWindow(WINDOW_SIZE)}>
            {WINDOW_SIZE} semanas →
          </button>
          <span className="hint">
            {weeks[0].key} a {weeks[weeks.length - 1].key}
          </span>
        </div>

        {visibleLines.length === 0 ? (
          <p className="empty-state">Sin líneas que mostrar con estos filtros.</p>
        ) : (
          <div className="matrix-scroll">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="matrix-line-col">Línea</th>
                  {weeks.map((w) => {
                    const locked = isWeekLocked(w);
                    return (
                      <th
                        key={w.key}
                        className={locked ? 'matrix-week-locked' : ''}
                        onClick={() => onNavigateToWeek(w.key)}
                        title={`${w.startDate} a ${w.endDate} — clic para abrir en Propuesta semanal`}
                      >
                        S{w.weekNumber}
                        <br />
                        {w.startDate}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleLines.map((line) => (
                  <tr key={line.id} className={!line.active ? 'inactive-row' : ''}>
                    <td className="matrix-line-col">
                      <strong>{line.name}</strong>
                      <br />
                      <span className="hint">
                        {line.team} · {line.location}
                      </span>
                    </td>
                    {weeks.map((w) => (
                      <MatrixCell
                        key={w.key}
                        assignments={cellMap.get(`${line.id}::${w.key}`) ?? []}
                        auditorNameById={auditorNameById}
                        locked={isWeekLocked(w)}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
