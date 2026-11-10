"""Add signage / PPE / evacuation layers to the user's plant DXF.
usage: python3 dxfedit.py <in.dxf> <out_full.dxf> <out_only_layers.dxf>
"""
import sys, math, numpy as np, ezdxf
from ezdxf.enums import TextEntityAlignment
from ezdxf import colors

IN, OUT_FULL, OUT_LAYERS = sys.argv[1:4]
AFF = np.array([[9.61930509e-02, 2.90413940e-04],
                [-6.85976048e-05, -9.63294995e-02],
                [1.24289885e+02, 2.49134654e+02]])

def T(x, y):  # PDF point -> DXF metres
    v = np.array([x, y, 1.0]) @ AFF
    return float(v[0]), float(v[1])

GAP = 9.5      # pdf pt between symbols in a row (~0.91 m)
SZ = 0.70      # symbol size in metres

# ------------------------------------------------------------------ data
DESC = {
 "O1": ("Uso obligatorio de EPP (lentes + calzado)", "NOM-017-STPS-2008"),
 "O2": ("Uso obligatorio de proteccion auditiva", "NOM-011-STPS-2001"),
 "O3": ("Uso obligatorio de lentes y careta", "NOM-004-STPS-1999 / NOM-017"),
 "O4": ("Uso obligatorio de pulsera y bata ESD", "NOM-022-STPS-2015"),
 "O5": ("Uso obligatorio de chaleco alta visibilidad", "NOM-006-STPS-2014"),
 "O6": ("Uso obligatorio de guantes de nitrilo", "NOM-017-STPS-2008"),
 "A1": ("Precaucion: transito de montacargas", "NOM-006-STPS-2014"),
 "A2": ("Riesgo de atrapamiento de manos", "NOM-004-STPS-1999"),
 "A4": ("Precaucion: equipo a presion", "NOM-020-STPS-2011"),
 "A5": ("Riesgo de proyeccion de particulas", "NOM-004-STPS-1999"),
 "A6": ("Sustancias quimicas (pictograma SGA + HDS)", "NOM-005-STPS-1998 / NOM-018-STPS-2015"),
 "A7": ("Precaucion: desnivel en anden", "NOM-006-STPS-2014"),
 "A8": ("Dispositivo sensible a descarga electrostatica", "NOM-022-STPS-2015"),
 "A9": ("Precaucion: riesgo de corte", "NOM-026-STPS-2008"),
 "P1": ("Prohibido el paso a personal no autorizado", "NOM-026-STPS-2008"),
 "P2": ("Prohibido fumar / flama abierta", "NOM-002-STPS-2010"),
 "P3": ("No obstruir salida (franja en piso)", "NOM-002-STPS-2010 / NOM-001-STPS-2008"),
 "P4": ("Prohibido subir o cruzar la banda", "NOM-004-STPS-1999"),
 "P5": ("Material retenido - No usar", "NOM-026-STPS-2008 / ISO 9001 8.7"),
 "E4": ("Botiquin de primeros auxilios", "NOM-030-STPS-2009 / NOM-003-SEGOB-2011"),
 "E5": ("Regadera / lavaojos de emergencia", "NOM-005-STPS-1998"),
 "F1": ("Extintor PQS ABC (adicional)", "NOM-002-STPS-2010"),
 "F2": ("Extintor CO2", "NOM-002-STPS-2010"),
 "F4": ("Lampara de emergencia con bateria", "NOM-002-STPS-2010"),
 "F5": ("Extintor clase K (cocina)", "NOM-002-STPS-2010"),
}
KIND = {"O": "OBLIGACION", "A": "ADVERTENCIA", "P": "PROHIBICION", "E": "EVACUACION", "F": "INCENDIO"}

# rows: (pdf x, pdf y, [codes...])  -- same positions as the reviewed PDF overlay
ROWS = [
 (470, 292, ["O5", "A7"]), (560, 292, ["A1"]), (520, 342, ["A1"]),
 (387, 312, ["P5"]), (398, 312, ["P1"]),
 (672, 328, ["A6", "E5", "E4"]),
 (415, 370, ["A1"]), (700, 370, ["A1"]), (610, 532, ["A1"]), (420, 532, ["A1"]),
 (414, 400, ["O1", "O2"]),
 (452, 432, ["A2"]), (494, 432, ["A2"]), (583, 432, ["A2"]), (625, 432, ["A2"]),
 (560, 395, ["P4"]),
 (538, 432, ["O4", "A8", "F2"]),
 (645, 505, ["E4", "F1"]),
 (720, 412, ["A9"]),
 (760, 532, ["O5", "A7", "E4"]),
 (333, 470, ["P1", "P2"]), (333, 481, ["A6", "O6"]),
 (400, 552, ["F5"]),
]
ROWS_DXF = [  # placed directly in metres (avoid existing symbols)
 (188.8, 221.15, ["O3", "A5"]),
 (195.4, 218.9, ["O2", "A4"]),
 (193.0, 214.85, ["P1", "P2"]),
]
GAP_M = 0.91
EXITS = {  # name: (pdf x,y of exit, assembly point, tag pdf pos)
 "SE-1": (369, 361, "PR-1", (333, 345)), "SE-2": (371, 530, "PR-1", (333, 514)),
 "SE-3": (371, 609, "PR-2", (345, 620)), "SE-4": (674, 620, "PR-2", (650, 632)),
 "SE-5": (815, 289, "PR-3", (828, 282)), "SE-6": (815, 395, "PR-3", (828, 388)),
}
ROUTES = [
 [(360, 361), (330, 380)],
 [(360, 528), (318, 500), (306, 412)],
 [(360, 609), (350, 645), (330, 662)],
 [(674, 632), (674, 650), (420, 650), (380, 690), (345, 690)],
 [(826, 296), (870, 340), (870, 420)],
 [(826, 400), (860, 425)],
]
ESD = (517, 414, 566, 503)
PR3 = (845, 425, 897, 477)

# ------------------------------------------------------------------ helpers
LAYERS = {
 "SEÑ-OBLIGACION": 5, "SEÑ-ADVERTENCIA": 2, "SEÑ-PROHIBICION": 1, "SEÑ-EVACUACION": 3,
 "SEÑ-INCENDIO": 1, "SEÑ-RUTA-EVACUACION": 3, "SEÑ-ZONA-ESD": 6, "SEÑ-ETIQUETAS": 6, "SEÑ-TABLA": 7,
}
LAYER_OF = {"O": "SEÑ-OBLIGACION", "A": "SEÑ-ADVERTENCIA", "P": "SEÑ-PROHIBICION",
            "E": "SEÑ-EVACUACION", "F": "SEÑ-INCENDIO"}
RGB = {"O": (0, 77, 166), "A": (255, 209, 0), "P": (217, 0, 0), "E": (0, 140, 64), "F": (217, 0, 0)}
TXT = {"O": 7, "A": 250, "P": 250, "E": 7, "F": 7}


def setup(doc):
    if "DASHED" not in doc.linetypes:
        doc.linetypes.add("DASHED", pattern=[0.75, 0.5, -0.25], description="Dashed __ __ __")
    for name, col in LAYERS.items():
        if name not in doc.layers:
            doc.layers.add(name, color=col)
    doc.layers.get("SEÑ-RUTA-EVACUACION").dxf.linetype = "DASHED"
    doc.layers.get("SEÑ-ZONA-ESD").dxf.linetype = "DASHED"
    st = "SEN-ARIAL"
    if st not in doc.styles:
        doc.styles.add(st, font="arial.ttf")
    r = SZ / 2
    for k, kind in KIND.items():
        bname = "SEÑ_" + kind
        if bname in doc.blocks:
            continue
        b = doc.blocks.new(bname)
        att = {"layer": "0"}
        if k == "O":
            h = b.add_hatch(color=5); h.rgb = RGB[k]; h.paths.add_edge_path().add_arc((0, 0), r, 0, 360)
            b.add_circle((0, 0), r, dxfattribs={"color": 7})
        elif k == "A":
            pts = [(0, r * 1.05), (r * 1.15, -r * .85), (-r * 1.15, -r * .85)]
            h = b.add_hatch(color=2); h.rgb = RGB[k]; h.paths.add_polyline_path(pts, is_closed=True)
            b.add_lwpolyline(pts, close=True, dxfattribs={"color": 250, "const_width": .04})
        elif k == "P":
            h = b.add_hatch(color=7); h.rgb = (250, 250, 250); h.paths.add_edge_path().add_arc((0, 0), r, 0, 360)
            b.add_circle((0, 0), r, dxfattribs={"color": 1})
            b.add_circle((0, 0), r * .85, dxfattribs={"color": 1})
            b.add_line((-r * .6, r * .6), (r * .6, -r * .6), dxfattribs={"color": 1})
        else:  # E / F squares
            pts = [(-r, -r), (r, -r), (r, r), (-r, r)]
            h = b.add_hatch(color=3 if k == "E" else 1); h.rgb = RGB[k]
            h.paths.add_polyline_path(pts, is_closed=True)
            b.add_lwpolyline(pts, close=True, dxfattribs={"color": 7})
        ty = -r * .25 if k == "A" else 0
        a = b.add_attdef("CODIGO", (0, ty), dxfattribs={"height": SZ * .32, "color": TXT[k], "style": st})
        a.set_placement((0, ty), align=TextEntityAlignment.MIDDLE_CENTER)
        for i, tagname in enumerate(("DESCRIPCION", "NOM")):
            d = b.add_attdef(tagname, (0, -r - .2 - i * .2), dxfattribs={"height": .1, "style": st})
            d.is_invisible = True


def place(msp, code, x, y):
    k = code[0]
    ins = msp.add_blockref("SEÑ_" + KIND[k], (x, y), dxfattribs={"layer": LAYER_OF[k]})
    desc, nom = DESC[code]
    ins.add_auto_attribs({"CODIGO": code, "DESCRIPCION": desc, "NOM": nom})
    return ins


def text(msp, s, x, y, h=.3, layer="SEÑ-ETIQUETAS", color=None, align=None):
    t = msp.add_text(s, height=h, dxfattribs={"layer": layer, "style": "SEN-ARIAL", **({"color": color} if color else {})})
    if align:
        t.set_placement((x, y), align=align)
    else:
        t.dxf.insert = (x, y)
    return t


def arrow(msp, pts):
    P = [T(*p) for p in pts]
    msp.add_lwpolyline(P, dxfattribs={"layer": "SEÑ-RUTA-EVACUACION", "const_width": .12})
    (x1, y1), (x2, y2) = P[-2], P[-1]
    a = math.atan2(y2 - y1, x2 - x1); L = .7
    msp.add_solid([(x2, y2), (x2 - L * math.cos(a - .45), y2 - L * math.sin(a - .45)),
                   (x2 - L * math.cos(a + .45), y2 - L * math.sin(a + .45))],
                  dxfattribs={"layer": "SEÑ-RUTA-EVACUACION"})


def build(doc):
    setup(doc)
    msp = doc.modelspace()
    count = {}
    for px, py, codes in ROWS:
        for i, c in enumerate(codes):
            x, y = T(px + i * GAP, py)
            place(msp, c, x, y); count[c] = count.get(c, 0) + 1
    for x, y, codes in ROWS_DXF:
        for i, c in enumerate(codes):
            place(msp, c, x + i * GAP_M, y); count[c] = count.get(c, 0) + 1
    for name, (ex, ey, pr, (tx, ty)) in EXITS.items():
        x, y = T(ex, ey)
        msp.add_circle((x, y), .85, dxfattribs={"layer": "SEÑ-ETIQUETAS"})
        lx, ly = T(tx, ty)
        text(msp, f"{name} > {pr}", lx, ly, .35)
        for i, c in enumerate(("P3", "F4")):
            px_, py_ = T(tx + 4 + i * 9, ty + 7)
            place(msp, c, px_, py_); count[c] = count.get(c, 0) + 1
    for r in ROUTES:
        arrow(msp, r)
    x0, y0 = T(ESD[0], ESD[1]); x1, y1 = T(ESD[2], ESD[3])
    msp.add_lwpolyline([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], close=True,
                       dxfattribs={"layer": "SEÑ-ZONA-ESD", "const_width": .06})
    text(msp, "ZONA ESD - delimitar en piso", x0, y1 - .55, .28, "SEÑ-ZONA-ESD")
    x0, y0 = T(PR3[0], PR3[1]); x1, y1 = T(PR3[2], PR3[3])
    pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    h = msp.add_hatch(color=3, dxfattribs={"layer": "SEÑ-EVACUACION"}); h.rgb = (140, 240, 140)
    h.paths.add_polyline_path(pts, is_closed=True)
    msp.add_lwpolyline(pts, close=True, dxfattribs={"layer": "SEÑ-EVACUACION", "const_width": .08})
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    for i, s in enumerate(["PUNTO DE", "REUNION 3", "(propuesto)"]):
        text(msp, s, cx, cy + .8 - i * .8, .55 if i < 2 else .35, "SEÑ-EVACUACION", 250,
             TextEntityAlignment.MIDDLE_CENTER)
    text(msp, "Verificar que no cruce maniobra de traileres", x0 - .5, y1 - .9, .28)
    # PR-1: aparece en el PDF pero no existe en el DXF -> se agrega en la misma posicion
    x0, y0 = T(274, 356); x1, y1 = T(325, 407)
    pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    h = msp.add_hatch(color=3, dxfattribs={"layer": "SEÑ-EVACUACION"}); h.rgb = (0, 220, 0)
    h.paths.add_polyline_path(pts, is_closed=True)
    msp.add_lwpolyline(pts, close=True, dxfattribs={"layer": "SEÑ-EVACUACION", "const_width": .08})
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    for i, s in enumerate(["PUNTO", "DE", "REUNION", "1"]):
        text(msp, s, cx, cy + 1.2 - i * .8, .6, "SEÑ-EVACUACION", 250, TextEntityAlignment.MIDDLE_CENTER)
    legend(msp, count)
    return count


def legend(msp, count):
    X, Y = 222.0, 236.0
    L = "SEÑ-TABLA"
    text(msp, "SIMBOLOGIA - SEÑALETICA, EPP Y EVACUACION (propuesta)", X, Y, .6, L)
    text(msp, "Colores y formas segun NOM-026-STPS-2008. Senales de evacuacion segun NOM-003-SEGOB-2011.", X, Y - .9, .3, L)
    cols = [X, X + 1.3, X + 3.0, X + 13.5, X + 22.5]
    y = Y - 2.2
    for c, hd in zip(cols, ["Simb.", "Cant.", "Texto de la senal", "Fundamento (NOM)", ""]):
        text(msp, hd, c, y, .3, L)
    y -= .4
    msp.add_line((X, y), (X + 32, y), dxfattribs={"layer": L})
    y -= .7
    for code, (desc, nom) in DESC.items():
        place(msp, code, cols[0] + .4, y + .12)
        text(msp, f"{code}  x{count.get(code, 0)}", cols[1], y, .28, L)
        text(msp, desc, cols[2], y, .28, L)
        text(msp, nom, cols[3], y, .28, L)
        y -= .95
    y -= .4
    notes = [
        "NOTAS",
        "1. Salidas SE-1..SE-6 (ya existian). Cada una lleva P3 'No obstruir' y F4 lampara de emergencia.",
        "2. SE-1, SE-2 > Punto de reunion 1 | SE-3, SE-4 > Punto de reunion 2 | SE-5, SE-6 > Punto de reunion 3 (nuevo).",
        "3. Tamano de senal real: S >= L^2/2000 (S m2, L m). Simbolos de este plano a escala de lectura, no reales.",
        "4. Senales a 2.0-2.2 m de altura; extintores con parte superior a max. 1.50 m (NOM-002-STPS-2010).",
        "5. Recorrido max. a salida 40 m (NOM-002-STPS-2010). Ver capa SEÑ-RUTA-EVACUACION.",
        "6. Cada senal es bloque con atributos CODIGO / DESCRIPCION / NOM (usar Extraccion de datos para contar).",
    ]
    for i, n in enumerate(notes):
        text(msp, n, X, y - i * .6, .32 if i == 0 else .26, L)


# ---- full file
doc = ezdxf.readfile(IN)
cnt = build(doc)
doc.saveas(OUT_FULL)
print("full saved", sum(cnt.values()), "signs", cnt)

# ---- layers-only file (same coordinates, for INSERT / XREF / copy-paste)
new = ezdxf.new("R2018", setup=True)
new.header["$INSUNITS"] = 6
build(new)
new.saveas(OUT_LAYERS)
print("layers-only saved")
