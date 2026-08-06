import { useMemo, useState } from 'react';
import { useStore } from '../../state/store';
import type { Auditor, Layer, PlantLocation } from '../../domain/types';
import { currentWeek } from '../../domain/weeks';

const LOCATIONS: PlantLocation[] = ['Principal', 'Ext.', 'Ambas'];
const LAYERS: Layer[] = ['L1', 'L2', 'L3'];

function AuditorForm({
  onSubmit,
  initial,
  submitLabel,
}: {
  onSubmit: (input: { name: string; layers: Layer[]; location: PlantLocation }) => void;
  initial?: Partial<Auditor>;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [layers, setLayers] = useState<Layer[]>(initial?.layers ?? ['L1']);
  const [location, setLocation] = useState<PlantLocation>(initial?.location ?? 'Principal');

  const toggleLayer = (l: Layer) => {
    setLayers((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  };

  return (
    <div>
      <div className="form-grid">
        <div className="field">
          <label>Nombre</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Juanito Pérez" />
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
        <div className="field">
          <label>Capas que puede auditar</label>
          <div className="checkbox-group">
            {LAYERS.map((l) => (
              <label key={l}>
                <input type="checkbox" checked={layers.includes(l)} onChange={() => toggleLayer(l)} />
                {l}
              </label>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="btn"
        disabled={!name.trim() || layers.length === 0}
        onClick={() => {
          onSubmit({ name: name.trim(), layers, location });
          if (!initial) {
            setName('');
            setLayers(['L1']);
          }
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}

export default function AuditoresPage() {
  const auditors = useStore((s) => s.data.auditors);
  const addAuditor = useStore((s) => s.addAuditor);
  const updateAuditor = useStore((s) => s.updateAuditor);
  const setAuditorActive = useStore((s) => s.setAuditorActive);
  const setAuditorAvailability = useStore((s) => s.setAuditorAvailability);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [weekInput, setWeekInput] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const thisWeekKey = useMemo(() => currentWeek().key, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditors
      .filter((a) => showInactive || a.active)
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [auditors, showInactive, search]);

  return (
    <div>
      <div className="page-header">
        <h2>Auditores</h2>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Agregar auditor</h3>
        <AuditorForm onSubmit={addAuditor} submitLabel="Agregar auditor" />
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Catálogo ({visible.length})</h3>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 6, width: 200 }}
            />
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />{' '}
              Mostrar inactivos
            </label>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="empty-state">
            {search ? `Sin auditores que coincidan con "${search}".` : 'Sin auditores registrados todavía.'}
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Capas</th>
                <th>Ubicación</th>
                <th>No disponible semana actual ({thisWeekKey})</th>
                <th>Otras semanas no disponibles</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.id} className={!a.active ? 'inactive-row' : ''}>
                  {editingId === a.id ? (
                    <td colSpan={7}>
                      <AuditorForm
                        initial={a}
                        submitLabel="Guardar cambios"
                        onSubmit={(input) => {
                          updateAuditor(a.id, input);
                          setEditingId(null);
                        }}
                      />
                      <button type="button" className="btn secondary small" onClick={() => setEditingId(null)}>
                        Cancelar
                      </button>
                    </td>
                  ) : (
                    <>
                      <td>{a.name}</td>
                      <td>{a.layers.join(', ')}</td>
                      <td>{a.location}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={a.unavailableWeeks.includes(thisWeekKey)}
                          onChange={(e) => setAuditorAvailability(a.id, thisWeekKey, !e.target.checked)}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {a.unavailableWeeks
                            .filter((w) => w !== thisWeekKey)
                            .map((w) => (
                              <span key={w} className="badge active-no">
                                {w}{' '}
                                <button
                                  type="button"
                                  onClick={() => setAuditorAvailability(a.id, w, true)}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b3261e' }}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          <input
                            type="text"
                            placeholder="2026-W35"
                            value={weekInput[a.id] ?? ''}
                            onChange={(e) => setWeekInput((prev) => ({ ...prev, [a.id]: e.target.value }))}
                            style={{ width: 90, padding: '3px 6px', fontSize: 12 }}
                          />
                          <button
                            type="button"
                            className="btn secondary small"
                            onClick={() => {
                              const key = (weekInput[a.id] ?? '').trim();
                              if (!key) return;
                              setAuditorAvailability(a.id, key, false);
                              setWeekInput((prev) => ({ ...prev, [a.id]: '' }));
                            }}
                          >
                            + Agregar
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${a.active ? 'active-yes' : 'active-no'}`}>
                          {a.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="btn secondary small" onClick={() => setEditingId(a.id)}>
                          Editar
                        </button>{' '}
                        <button
                          type="button"
                          className={`btn small ${a.active ? 'danger' : 'secondary'}`}
                          onClick={() => setAuditorActive(a.id, !a.active)}
                        >
                          {a.active ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
