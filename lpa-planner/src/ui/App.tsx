import { useState } from 'react';
import { useStore } from '../state/store';
import MatrizPage from './pages/MatrizPage';
import PropuestaPage from './pages/PropuestaPage';
import LineasPage from './pages/LineasPage';
import AuditoresPage from './pages/AuditoresPage';
import HistorialPage from './pages/HistorialPage';
import ImportExportPage from './pages/ImportExportPage';

type Tab = 'matriz' | 'propuesta' | 'lineas' | 'auditores' | 'historial' | 'importar';

const TABS: { id: Tab; label: string }[] = [
  { id: 'matriz', label: 'Vista Matriz' },
  { id: 'propuesta', label: 'Propuesta semanal' },
  { id: 'lineas', label: 'Líneas' },
  { id: 'auditores', label: 'Auditores' },
  { id: 'historial', label: 'Histórico' },
  { id: 'importar', label: 'Importar / Exportar' },
];

export default function AppShell() {
  const [tab, setTab] = useState<Tab>('matriz');
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);
  const setUiWeekKey = useStore((s) => s.setUiWeekKey);

  function navigateToWeek(weekKey: string) {
    setUiWeekKey(weekKey);
    setTab('propuesta');
  }

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <h1>Planeación LPA — Auditorías por Capas</h1>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`nav-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="main-content">
        {error && (
          <div className="error-box">
            {error}{' '}
            <button type="button" className="btn small secondary" onClick={clearError} style={{ marginLeft: 10 }}>
              Cerrar
            </button>
          </div>
        )}
        {tab === 'matriz' && <MatrizPage onNavigateToWeek={navigateToWeek} />}
        {tab === 'propuesta' && <PropuestaPage />}
        {tab === 'lineas' && <LineasPage />}
        {tab === 'auditores' && <AuditoresPage />}
        {tab === 'historial' && <HistorialPage />}
        {tab === 'importar' && <ImportExportPage />}
      </main>
    </div>
  );
}
