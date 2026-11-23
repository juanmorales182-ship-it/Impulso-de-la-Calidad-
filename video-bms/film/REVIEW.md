# REVIEW — primera versión

Check: 0 errores. Solo queda un aviso informativo: la página de inicio sale del marco durante los zooms, y es intencional.
Revisión cuadro por cuadro (snapshots 0–97 s):

- El gancho está en pantalla desde el cuadro 0 y "proceso?" cambia a rojo en 0.9 s.
- El navegador sube a los 2.4 s y desde ahí todo pasa dentro de él. Solo se usan capturas reales (App Register, inicio del BMS, búsqueda, GR_00168_00, diagrama, íconos, Recientes y Knowledge Portal).
- Los globos de ayuda tienen 31 px y se quedan quietos mientras se leen, con 0.5 s + 0.3 s por palabra.
- Corregido tras la primera revisión: el cuadro 0 estaba vacío, había texto de 26 px, dos tramos de más de 3 s sin movimiento (ahora con `data-hold`, porque es tiempo de lectura), el globo de Start Signavio duraba muy poco y algunos globos tapaban lo que se señalaba.

Pendiente:
- No hay música de fondo: el catálogo de HyperFrames pide iniciar sesión.
- Los efectos de sonido se midieron, pero nadie los ha escuchado.
- No incluido por duración: vistas Published/Preview, idioma, Repository/Dictionary y variantes (partes 3–4 del kit).
