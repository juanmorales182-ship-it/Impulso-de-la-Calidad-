import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import type { Line, PlantLocation, Team } from '../../domain/types';

const LOCATIONS: PlantLocation[] = ['Principal', 'Ext.', 'Ambas'];

function LineForm({
  onSubmit,
  teams,
  onAddTeam,
  initial,
  submitLabel,
}: {
  onSubmit: (input: { name: string; team: Team; location: PlantLocation }) => void;
  teams: Team[];
  onAddTeam: (team: Team) => void;
  initial?: Partial<Line>;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [team, setTeam] = useState<Team>(initial?.team ?? teams[0] ?? 'MT1');
  const [location, setLocation] = useState<PlantLocation>(initial?.location ?? 'Principal');
  const [newTeam, setNewTeam] = useState('');

  return (
    <div>
      <div className="form-grid">
        <div className="field">
          <label>Nombre de línea</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. CX430" />
        </div>
        <div className="field">
          <label>Equipo / BU</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Ubicación</label>
          <select value={location} onChange={(e) => setLocation(e.target.value as PlantLocation)}>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-grid" style={{ alignItems: 'end' }}>
        <div className="field">
          <label>Agregar nuevo equipo/BU</label>
          <input
            type="text"
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            placeholder="p. ej. MT3"
          />
        </div>
        <div>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => {
              if (!newTeam.trim()) return;
              onAddTeam(newTeam.trim());
              setTeam(newTeam.trim());
              setNewTeam('');
            }}
          >
            + Agregar equipo
          </button>
        </div>
      </div>
      <button
        type="button"
        className="btn"
        disabled={!name.trim()}
        onClick={() => {
          onSubmit({ name: name.trim(), team, location });
          if (!initial) setName('');
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}

export default function LineasPage() {
  const lines = useStore((s) => s.data.lines);
  const teams = useStore((s) => s.data.teams);
  const addLine = useStore((s) => s.addLine);
  const updateLine = useStore((s) => s.updateLine);
  const setLineActive = useStore((s) => s.setLineActive);
  const addTeam = useStore((s) => s.addTeam);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const visible = useMemo(
    () => lines.filter((l) => showInactive || l.active).sort((a, b) => a.name.localeCompare(b.name)),
    [lines, showInactive],
  );

  return (
    <div>
      <div className="page-header">
        <h2>Líneas de producción</h2>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Agregar línea</h3>
        <LineForm teams={teams} onAddTeam={addTeam} onSubmit={addLine} submitLabel="Agregar línea" />
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Catálogo ({visible.length})</h3>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar
            inactivas
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="empty-state">Sin líneas registradas todavía.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Equipo</th>
                <th>Ubicación</th>
                <th>Última L2+L3</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((line) => (
                <tr key={line.id} className={!line.active ? 'inactive-row' : ''}>
                  {editingId === line.id ? (
                    <td colSpan={6}>
                      <LineForm
                        teams={teams}
                        onAddTeam={addTeam}
                        initial={line}
                        submitLabel="Guardar cambios"
                        onSubmit={(input) => {
                          updateLine(line.id, input);
                          setEditingId(null);
                        }}
                      />
                      <button type="button" className="btn secondary small" onClick={() => setEditingId(null)}>
                        Cancelar
                      </button>
                    </td>
                  ) : (
                    <>
                      <td>{line.name}</td>
                      <td>{line.team}</td>
                      <td>{line.location}</td>
                      <td>{line.lastL2L3Date ?? '—'}</td>
                      <td>
                        <span className={`badge ${line.active ? 'active-yes' : 'active-no'}`}>
                          {line.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="btn secondary small" onClick={() => setEditingId(line.id)}>
                          Editar
                        </button>{' '}
                        <button
                          type="button"
                          className={`btn small ${line.active ? 'danger' : 'secondary'}`}
                          onClick={() => setLineActive(line.id, !line.active)}
                        >
                          {line.active ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="hint" style={{ marginTop: 10 }}>
          Desactivar una línea la oculta de la planeación futura pero conserva su historial. Nunca se elimina.
        </p>
      </div>
    </div>
  );
}
