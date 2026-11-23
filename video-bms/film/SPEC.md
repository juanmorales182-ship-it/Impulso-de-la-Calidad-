# SPEC — "Un clic a la vez" (BMS / Signavio)

GOAL:    un empleado de planta sabe entrar al BMS, leer el mapa de 14 procesos, buscar y abrir su proceso, y guardarlo en favoritos.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps. Sin voz; solo textos en pantalla + música (pendiente) y efectos.
TIME:    ~90.5 s x 30 = 2715 frames.

LOOK:
- Fondo #E9ECF1 plano, sin textura. Tinta #1E2833. Acento rojo Brose #CE003A, solo en: recuadros de "aquí se hace clic", la palabra clave del gancho y del cierre, el logo.
- Medio: una ventana de navegador real (radio 18 px, sombra 0 30px 80px rgba(20,30,45,.18)), barra de 60 px con flechas, recarga y URL que cambia por pantalla. Dentro, solo capturas reales del BMS / BBC.
- Tipo: Outfit 700 para títulos (120 px gancho, 112 px cierre), Outfit 500 30 px en globos de ayuda.
- Globos de ayuda: fondo #1E2833, texto blanco, radio 20 px, padding 22/28, palabra clave en negrita con subrayado rojo 4 px.
- Cursor: flecha blanca con borde oscuro, 40 px.

MOTION:
- Llegadas expo.out / power4.out; cámara power2.inOut 0.8–1.0 s; zoom-through power3.in 0.45 s.
- Recuadro rojo: aparece con escala 1.06→1 y opacidad, 0.3 s expo.out.
- Globo: blur 8→0 + escala 0.96→1, 0.25 s; sale con blur en 0.15 s.
- Clic: cursor escala 1→0.82→1 en 0.18 s + sonido de clic 1 frame después.
- Texto que se lee se queda quieto: 0.5 s + 0.3 s por palabra.

SHOTS (global):
- 0.0–12.9  Gancho "¿Dónde encuentro mi proceso?" → el navegador sube; App Register, se escribe SIGNAVIO, clic; estrella en BMS; clic en Start Signavio → zoom a través del enlace.
- 12.9–36.3 Inicio del BMS: cargando → mapa; Gestión / Realización / Soporte; "14 procesos principales"; accesos rápidos; vistas específicas; búsqueda GR_00168.
- 36.3–41.2 Resultados: se resalta GR_00168_00, clic.
- 41.2–56.6 Proceso: ruta, GR = proceso de grupo, nombre no cambia, descripción; scroll.
- 56.6–64.9 Diagrama → íconos de tareas.
- 64.9–75.1 Estrella → Favoritos; Recientes.
- 75.1–81.9 BMS Knowledge Portal.
- 81.9–90.5 La ventana se va; "Tu proceso, a un clic."; logo Brose.

BANNED: fondo oscuro, brillos/partículas, tarjetas en fila, todo centrado, todo entrando igual, logo pegado en una esquina, anillos de clic, textos que se mueven mientras se leen, pantallas dibujadas (solo capturas reales).

QA: 1.0 (gancho), 3.5 (navegador asentado), 8.8 (estrella), 20 (grupos), 25 (14), 34 (búsqueda), 38.5, 45, 52, 60, 68, 72, 78, 84, 89.
