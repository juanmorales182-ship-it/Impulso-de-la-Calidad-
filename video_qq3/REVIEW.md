# Revisión — Tutorial QQ3

## Estructura (236.7 s, 1920×1080, 30 fps)
| # | Escena | Archivo fuente | Duración |
|---|---|---|---|
| s01 | Intro con Quali | src/s01-intro.html | 9 s |
| s02 | Qué es una QQ3 + escalera 8D | src/s02-que-es.html | 13 s |
| s03 | Paso 1 · Entrar a QIM (captura real) | src/s03-entrar.html | 11 s |
| s04 | Paso 2 · Elegir QQ3 (captura real) | src/s04-tipo.html | 7.2 s |
| s05 | Paso 3 · Descripción, reportó, responsable | src/s05-describe.html | 15 s |
| s06 | Paso 4 · Equipo 8D y matriz de riesgo | src/s06-riesgo.html | 19 s |
| s07 | Paso 5 · Save → Issue ID | src/s07-guardar.html | 9.4 s |
| s08 | Paso 6 · Planta, material, estatus, cantidades | src/s08-pieza.html | 19 s |
| s09 | Paso 7 · Fechas D3–D8 | src/s09-fechas.html | 13.1 s |
| s10 | Paso 8 · 5 porqués (concepto) | src/s10-porques.html | 20 s |
| s11 | Paso 8 · Pestaña 5-WHY | src/s11-why.html | 15 s |
| s12 | Paso 9 · One Pager | src/s12-onepager.html | 15 s |
| s13 | Paso 10 · Evidencias (SAP GUI) | src/s13-evidencias.html | 14 s |
| s14 | Paso 11 · Errores y códigos | src/s14-codigos.html | 18 s |
| s14b | Paso 11 · Cause Code | src/s14b-causes.html | 10 s |
| s15 | Paso 12 · Set in Process | src/s15-inprocess.html | 13 s |
| s16 | Resumen y cierre | src/s16-cierre.html | 16 s |

## Cómo se edita
- Las escenas se escriben en `src/` y se generan con `python3 build.py` (inserta la mascota y las pantallas de `forms.py`) y `python3 gen_index.py` (arma `index.html` desde `scenes.json`).
- Pantallas QIM recreadas en `forms.py` con datos de ejemplo genéricos (sin nombres, IDs ni clientes reales).
- Mascota «Quali»: `src/quali.svg.html`; animaciones en `assets/js/kit.js` (`QK.quali`).

## Decisiones
- Pasos 1 y 2 usan las capturas reales del usuario; el resto son pantallas recreadas en HTML con la descripción detallada del video original (más nítidas que fotogramas de 760×480).
- Sin narración ni música: la voz se agregará con ElevenLabs. Los textos en pantalla cargan la explicación; los tiempos dejan espacio para la voz.
- Transiciones: zoom a través de botón/pestaña, iris desde el clic, inundación de color (capítulos), whip horizontal entre pestañas, blur swap.

## Lo que revisé y lo que no
- Revisado con contact sheets en cada escena y en cada corte entre escenas.
- `check` marca `content_overlap`/`text_occluded`: son superposiciones intencionales (tarjeta de instrucción, globos de Quali, menús y tarjetas de capítulo encima de la pantalla).
- `text_below_floor`: el texto de la UI a escala 1 es pequeño; cada paso hace zoom (1.4–2.2×) al campo que se explica.
- Sonido: no hay (pendiente narración).

## Lo más débil / siguiente paso
- Cuando llegue la narración: ajustar duraciones de cada escena a la voz (cambiar `scenes.json` y los tiempos internos).
- Opciones del desplegable «Acceptance» no se vieron en el video original; solo se muestra el valor final.
