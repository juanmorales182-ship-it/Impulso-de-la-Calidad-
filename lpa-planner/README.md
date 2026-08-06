# Planeación de Auditorías LPA (Layered Process Audit)

App web para armar la planeación semanal de Auditorías por Capas (LPA): qué línea se
audita, con qué capa (L1/L2/L3) y qué auditor la hace — aplicando automáticamente las
reglas de negocio de la planta y dejando el histórico bloqueado para auditoría.

## Por qué este stack

- **100% cliente, sin backend.** Todo corre en el navegador. No hay servidor que
  mantener ni permisos de red que pedir en un entorno corporativo restringido.
- **Un solo archivo `dist/index.html`.** El build empaqueta JS y CSS inline en un único
  HTML autocontenido: se puede abrir con doble clic (`file://`) o subir tal cual a una
  biblioteca de documentos de SharePoint. No hace falta instalar nada para *usar* la app,
  solo para *desarrollarla*.
- **Datos en el navegador (localStorage).** Persisten entre sesiones sin depender de
  ninguna base de datos externa. Hay además un respaldo/restauración manual en JSON por
  si se necesita mover los datos entre equipos o como copia de seguridad.
- **Motor de reglas separado de la interfaz** (`src/domain/`), puro y con pruebas
  unitarias (Vitest). Si cambia una regla de negocio, se ajusta ahí sin tocar la UI.

## Estructura

```
src/
  domain/         Modelo de datos y motor de reglas (puro, testeado, sin dependencias de UI)
    types.ts        Line, Auditor, Week, Assignment, etc.
    weeks.ts         Semana ISO, jueves de cierre, bloqueo por fecha
    rules.ts         Predicados de las reglas de negocio
    generator.ts     Genera la propuesta semanal completa
    validators.ts    Valida una asignación editada a mano
    __tests__/       Pruebas unitarias de todo lo anterior
  storage/        Persistencia (localStorage) y operaciones de alto nivel (CRUD, generar, confirmar)
  excel/          Import (mapeo de columnas configurable) y export a .xlsx (SheetJS)
  state/          Store (zustand) que conecta el dominio con la UI
  ui/             Pantallas: Propuesta semanal, Líneas, Auditores, Histórico, Importar/Exportar
```

## Reglas de negocio implementadas

1. **FIREWALL**: cada semana, sin excepción, recibe L2 y L3.
2. **GM** (DELTA, T1XX, 31XX, D2UX, C234, L234 Ext.): sigue la cadencia normal (L1
   semanal, L2+L3 trimestral), pero además, cada semana, al menos una línea GM debe
   tener L3 asignada. Si ninguna cae en su ciclo trimestral esa semana, el sistema elige
   una (rotando hacia la que lleva más tiempo sin L3) y le asigna L3 en vez de su L1
   normal.
3. **Líneas normales**: L1 cada semana; cada ~3 meses (91 días desde su último L2+L3),
   esa semana se reemplaza por L2+L3.
4. **No repetición consecutiva**: un auditor no puede auditar la misma línea en dos
   semanas seguidas (si auditó la línea la semana pasada, queda excluido esta semana).
5. **Ubicación**: `Principal` solo se audita en Principal, `Ext.` solo en Ext., `Ambas`
   acepta auditores de cualquier ubicación.
6. **Líneas inactivas**: no entran en la generación de propuestas nuevas, pero su
   historial se conserva intacto (nunca se borran, solo se desactivan).
7. **Histórico inmutable**: una semana queda bloqueada automáticamente al pasar su
   jueves de cierre. Después de eso los registros se pueden consultar pero no editar ni
   borrar — ni siquiera regenerando la propuesta.

Todo esto vive en `src/domain/` y está cubierto por pruebas en
`src/domain/__tests__/` y `src/storage/__tests__/`.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo con recarga en caliente
npm test         # pruebas unitarias del motor de reglas (Vitest)
npm run build    # genera dist/index.html (único archivo, listo para distribuir)
```

## Cómo usar el archivo generado

1. `npm run build` genera `dist/index.html`.
2. Distribúyelo como prefieras:
   - Ábrelo localmente con doble clic (funciona sin internet, sin servidor).
   - Súbelo a una biblioteca de documentos de SharePoint y ábrelo desde ahí.
   - Colócalo en cualquier hosting estático interno.
3. La primera vez, ve a **Importar / Exportar** para cargar tu Excel actual (líneas y
   auditores) usando el mapeo de columnas configurable, o da de alta el catálogo a mano
   en **Líneas** y **Auditores**.
4. Cada semana: **Propuesta semanal** → *Generar propuesta automática* → ajusta a mano lo
   que haga falta → captura el folio de seguimiento conforme lo vayas obteniendo del otro
   sistema → marca como *confirmada* / *cerrada*.
5. Exporta a Excel la semana actual, un rango, o todo el histórico desde **Propuesta
   semanal** / **Histórico** / **Importar y Exportar**.

## Notas

- Los datos viven en el `localStorage` del navegador donde se use la app. Si se abre
  desde rutas o navegadores distintos, no comparten datos automáticamente — usa el
  respaldo en JSON (sección "Respaldo completo" en Importar/Exportar) para moverlos.
- El mapeo de columnas de Excel es genérico a propósito: no depende de nombres de
  columna específicos, así que funciona con el formato del Excel actual sin
  modificarlo.
