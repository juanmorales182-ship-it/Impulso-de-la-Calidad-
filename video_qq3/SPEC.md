# SPEC — Tutorial «Cómo levantar una QQ3 en QIM»

GOAL:    Que cualquier persona de calidad en Brose pueda levantar una QQ3 sola, de la apertura de QIM a «In Process».
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps. Sin voz por ahora (la narración ElevenLabs se agrega después); los textos en pantalla cargan la explicación.
TIME:    ~200 s x 30 = ~6000 frames. 13 escenas.

LOOK:
  ground   #E8EDF4 (gris azulado claro) con una banda diagonal #DCE4EF al 6% — nunca fondo oscuro.
  ink      #0A2240 (azul noche) para todo texto de lectura.
  brand    #00539B (azul Brose) para capítulos (inundación de color) y la mascota.
  accent   #F5A800 (ámbar) SOLO en: el campo/botón que se toca, el número del paso, la antena de la mascota.
  ok/err   #2E9E4F verde de semáforo, #D0342C rojo de error (solo donde el sistema los muestra).
  type     Montserrat 800 para títulos (64–96 px, tracking -2%), Inter 400/700 para cuerpo (28–36 px).
  medium   UI real de SAP NetWeaver / QIM: capturas reales del usuario (1909 px) y pantallas QQ3 recreadas
           en HTML con el mismo sistema visual (gris #F2F2F2, encabezados #DDDDDD, links #0A6ED1, Arial 18px escalada).
           Datos de ejemplo genéricos: sin nombres reales, sin IDs reales, sin clientes.
  depth    ventana con sombra 0 24px 60px rgba(10,34,64,.18), radio 14 px.

OBJECTS:
  Ventana de QIM (marco de navegador con barra de título), cursor de Windows blanco con borde negro,
  la mascota «Quali» (robot redondo azul Brose, visor azul noche con ojos, antena con burbuja ámbar ✓,
  brazos articulados), la escalera 8D (D1…D8) como fichas, la cadena de 5 porqués como eslabones.

MOTION:
  enter  expo.out 0.6–0.9 s; move/camera power2.inOut 0.8–1.2 s; exit power3.in 0.3–0.4 s.
  mascota  resortes amortiguamiento 0.5 (back.out(1.6)), parpadeo cada ~3 s, respira (acting).
  stagger palabras 0.08 s, campos 0.06 s.
  cámara  punch-in sobre la ventana: scale 1 → 1.6–2.2 al campo que se explica.

TRANSITIONS (con causa):
  zoom a través del botón (New Issue, Save), iris desde el clic (doble clic QQ3),
  inundación de color azul (tarjetas de capítulo), whip horizontal (entre pestañas), blur swap.

BANNED: fondo oscuro con cosas flotando; glow/partículas; gradientes morados; tres tarjetas en fila;
  logo en esquina; todo entrando con fade+slide-up; títulos que siguen moviéndose; dibujar el logo de Brose.

QA: frame 0 no vacío; cada texto ≥ 28 px; cada instrucción visible ≥ 0.5 s + 0.3 s/palabra.
