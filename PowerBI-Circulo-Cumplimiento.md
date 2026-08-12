# Círculo de cumplimiento (SVG) para la tabla "Lista de acciones"

Medida DAX que dibuja un círculo de progreso (anillo) cuyo relleno y color
cambian según el **porcentaje de cumplimiento** de cada fila. Se usa dentro de
un visual de **Tabla** de Power BI, junto a las columnas `Ingeniero`, `Acción`
y `Comentario` de la tabla `Lista de acciones`.

Vista previa (mockup interactivo): ver artefacto adjunto en la conversación.

## 1. Estructura esperada de la tabla `Lista de acciones`

| Columna | Tipo | Notas |
|---|---|---|
| `Ingeniero` | Texto | Responsable de la acción |
| `Acción` | Texto | Descripción de la acción correctiva/preventiva |
| `Porcentaje de cumplimiento` | Decimal (0–1) | Si está guardado como 0–100, ver nota en el paso 2 |
| `Comentario` | Texto | Observaciones libres |

> Si dos filas pueden tener exactamente el mismo `Ingeniero` + `Acción` +
> `Comentario`, agrega una columna `ID` oculta a la tabla y al visual para que
> cada fila tenga un contexto de filtro único (si no, `SELECTEDVALUE` puede
> devolver blanco).

## 2. Medida DAX

Crea esta medida en el modelo (clic derecho en la tabla `Lista de acciones` →
Nueva medida):

```dax
Círculo Cumplimiento =
VAR _valor = SELECTEDVALUE('Lista de acciones'[Porcentaje de cumplimiento])
-- Si el campo está guardado como 0-100 en vez de 0-1, usa esta línea en su lugar:
-- VAR _valor = SELECTEDVALUE('Lista de acciones'[Porcentaje de cumplimiento]) / 100
VAR _pct = COALESCE(_valor, 0)
VAR _color =
    SWITCH(
        TRUE(),
        _pct >= 0.85, "#0ca30c",   -- verde: cumplido
        _pct >= 0.50, "#fab219",   -- ámbar: en riesgo
        "#d03b3b"                  -- rojo: crítico
    )
VAR _radio = 40
VAR _circunferencia = 2 * PI() * _radio
VAR _avance = _pct * _circunferencia
VAR _restante = _circunferencia - _avance
VAR _texto = FORMAT(_pct, "0%")
VAR _svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 100 100'>" &
    "<circle cx='50' cy='50' r='" & _radio & "' fill='none' stroke='#e1e0d9' stroke-width='10' />" &
    "<circle cx='50' cy='50' r='" & _radio & "' fill='none' stroke='" & _color & "' stroke-width='10' " &
        "stroke-dasharray='" & _avance & " " & _restante & "' stroke-linecap='round' " &
        "transform='rotate(-90 50 50)' />" &
    "<text x='50' y='57' font-size='24' font-family='Segoe UI, Arial' font-weight='bold' " &
        "text-anchor='middle' fill='" & _color & "'>" & _texto & "</text>" &
    "</svg>"
RETURN
    "data:image/svg+xml;utf8," & _svg
```

Los umbrales (`0.85` / `0.50`) son ajustables — cámbialos por los que use tu
equipo de calidad.

## 3. Marca la medida como imagen

1. Selecciona la medida `Círculo Cumplimiento` en el panel de campos.
2. Ve a la pestaña **Modelado** → **Categoría de datos** → elige **URL de imagen**.
   (Power BI Desktop permite asignar categoría de datos a medidas, no solo a
   columnas.)

## 4. Construye la tabla

1. Inserta un visual de **Tabla**.
2. Agrega, en este orden, los campos de `Lista de acciones`:
   `Ingeniero`, `Acción`, `Círculo Cumplimiento`, `Comentario`.
3. En el panel **Formato** → **Valores de celda**, sube el tamaño de imagen
   (por ejemplo 40–48 px) y aumenta la **altura de fila** para que el
   círculo se vea completo.
4. Opcional: aplica formato condicional de texto sobre `Comentario` o agrega
   una leyenda fija (🟢 ≥85% · 🟠 50–84% · 🔴 <50%) como un cuadro de texto
   junto a la tabla, para que el color nunca sea la única señal.

## 5. Por qué funciona conectado a "Lista de acciones"

La medida usa `SELECTEDVALUE`, que se evalúa en el contexto de fila que crea
el propio visual de Tabla: cada fila de la tabla ya filtra el modelo a esa
combinación de `Ingeniero`/`Acción`/`Comentario`, así que la medida "sabe" a
qué fila pertenece sin necesitar relaciones adicionales — vive en la misma
tabla y se agrega como una columna más del visual.
