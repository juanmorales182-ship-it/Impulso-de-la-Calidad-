"""Production-only DXF with 4 layers: area, signage, exits/assembly points, flow diagram.
usage: python3 prod.py <in.dxf> <out.dxf>
"""
import sys, math
import ezdxf
from ezdxf.addons import Importer
from ezdxf.enums import TextEntityAlignment
from ezdxf import bbox

IN, OUT = sys.argv[1], sys.argv[2]
HERE = __file__.rsplit("/", 1)[0]
_src = open(HERE + "/dxfedit.py").read().split("# ---- full file")[0]
sys_argv = sys.argv
sys.argv = [0, "x", "y", "z"]
exec(_src)
sys.argv = sys_argv
IN, OUT = sys.argv[1], sys.argv[2]

L1 = "1-AREA DE PRODUCCION"
L2 = "2-SEÑALETICA"
L3 = "3-SALIDAS Y PUNTOS DE REUNION"
L4 = "4-DIAGRAMA DE RECORRIDO"
for k in LAYER_OF:
    LAYER_OF[k] = L2

ROWS[:] = [(px, 424, c) if (px, py) == (583, 432) else (px, py, c) for px, py, c in ROWS]
ROOM = (162.47, 199.35, 188.47, 212.35)       # production room (metres)
REGION = (160.40, 197.30, 188.60, 214.40)     # room + surrounding aisles (signage kept here)
EXIT_TXT = [(159.2, 190.9), (159.3, 198.5), (159.0, 214.8), (188.3, 189.8), (201.8, 211.5), (201.9, 221.7)]


def inside(x, y, r, pad=0.0):
    return r[0] - pad <= x <= r[2] + pad and r[1] - pad <= y <= r[3] + pad


def center(e):
    try:
        b = bbox.extents([e], fast=True)
        if b.has_data:
            return b.center.x, b.center.y
    except Exception:
        pass
    return None


import os
FULL = os.environ.get("FULL") == "1"
L0 = "0-PLANTA GENERAL"
src = ezdxf.readfile(IN)
msp_src = src.modelspace()
if FULL:
    doc = src
    msp = msp_src
else:
    doc = ezdxf.new("R2018", setup=True)
    doc.header["$INSUNITS"] = 6
    doc.header["$MEASUREMENT"] = 1
    msp = doc.modelspace()
    pick = []
    for e in msp_src:
        lay = e.dxf.layer
        if lay == "PRODUCCIÓN":
            pick.append(e)
        elif lay == "ÁREA SIN COMPONENTES":
            c = center(e)
            if c and inside(*c, ROOM, .05):
                pick.append(e)
        elif lay == "SEGURIDAD E HIGIENE ":
            pick.append(e)
    imp = Importer(src, doc)
    imp.import_entities(pick, msp)
    imp.finalize()

for name, col in ((L1, 7), (L2, 2), (L3, 3), (L4, 4)):
    doc.layers.add(name, color=col)
if FULL:
    doc.layers.add(L0, color=8)


def resolve(e, layname):
    """Freeze BYLAYER colour/linetype/lineweight so the look survives a layer change."""
    if layname not in doc.layers:
        return
    L = doc.layers.get(layname)
    try:
        if e.dxf.get("color", 256) == 256 and not e.dxf.hasattr("true_color"):
            e.dxf.color = abs(L.dxf.color) or 7
            if L.dxf.hasattr("true_color"):
                e.dxf.true_color = L.dxf.true_color
        if e.dxf.get("linetype", "BYLAYER").upper() == "BYLAYER":
            lt = L.dxf.get("linetype", "Continuous")
            if lt.upper() != "CONTINUOUS":
                e.dxf.linetype = lt
        if e.dxf.get("lineweight", -1) == -1:
            lw = L.dxf.get("lineweight", -3)
            if lw >= 0:
                e.dxf.lineweight = lw
    except Exception:
        pass


stats = {"area": 0, "sen": 0, "exits": 0, "drop": 0, "planta": 0}
for e in list(msp):
    lay = e.dxf.layer
    if lay == "ÁREA SIN COMPONENTES" and FULL:
        c = center(e)
        if not (c and inside(*c, ROOM, .05)):
            resolve(e, lay); e.dxf.layer = L0; stats["planta"] += 1
            continue
    if lay in ("PRODUCCIÓN", "ÁREA SIN COMPONENTES"):
        resolve(e, lay) if FULL else None
        e.dxf.layer = L1; stats["area"] += 1
    elif lay == "SEGURIDAD E HIGIENE ":
        c = center(e)
        if c is None:
            msp.delete_entity(e); stats["drop"] += 1; continue
        x, y = c
        dmin = min(math.hypot(x - a, y - b) for a, b in EXIT_TXT)
        if FULL:
            resolve(e, lay)
        if dmin < 1.2 or (x < 158.5 and y < 187):          # exit signs, PR-2
            e.dxf.layer = L3; stats["exits"] += 1
        elif inside(x, y, REGION) or (FULL and dmin >= 3.0):
            e.dxf.layer = L2; stats["sen"] += 1
        elif dmin < 3.0:                                    # alarms beside exits
            e.dxf.layer = L3; stats["exits"] += 1
        else:
            msp.delete_entity(e); stats["drop"] += 1
    elif FULL:
        if lay.strip() == "COTAS":
            msp.delete_entity(e); stats["drop"] += 1; continue
        if lay == "FLUJO LOGÍSTICO":
            c = center(e)
            if c and inside(*c, ROOM, .05):     # replaced by the new flow diagram
                msp.delete_entity(e); stats["drop"] += 1; continue
        resolve(e, lay); e.dxf.layer = L0; stats["planta"] += 1

if FULL:  # block contents -> layer 0 (inherit insert layer), keep look
    for blk in doc.blocks:
        if blk.name.lower().startswith(("*model_space", "*paper_space")):
            continue
        for e in blk:
            if e.dxf.layer != "0":
                resolve(e, e.dxf.layer); e.dxf.layer = "0"
    doc.layers.get(L0).on()
print("imported", stats)

# ------------------------------------------------------------- 2) signage (production only)
setup(doc)
count = {}
for px, py, codes in ROWS:
    for i, c in enumerate(codes):
        x, y = T(px + i * GAP, py)
        if FULL or inside(x, y, REGION):
            place(msp, c, x, y); count[c] = count.get(c, 0) + 1
for x0, y0, codes in ROWS_DXF:
    for i, c in enumerate(codes):
        x = x0 + i * GAP_M
        if FULL or inside(x, y0, REGION):
            place(msp, c, x, y0); count[c] = count.get(c, 0) + 1
x0, y0 = T(ESD[0], ESD[1]); x1, y1 = T(ESD[2], ESD[3])
msp.add_lwpolyline([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], close=True,
                   dxfattribs={"layer": L2, "const_width": .06, "linetype": "DASHED", "color": 6})
text(msp, "ZONA ESD", 175.7, 208.95, .25, L2, 6)
text(msp, "(delimitar en piso)", 175.7, 208.55, .22, L2, 6)

# ------------------------------------------------------------- 3) exits + assembly points
for name, (ex, ey, pr, (tx, ty)) in EXITS.items():
    x, y = T(ex, ey)
    msp.add_circle((x, y), .85, dxfattribs={"layer": L3, "color": 6})
    lx, ly = T(tx, ty)
    text(msp, f"{name} > {pr}", lx, ly, .35, L3, 6)
    for i, c in enumerate(("P3", "F4")):
        a, b = T(tx + 4 + i * 9, ty + 7)
        ins = place(msp, c, a, b); ins.dxf.layer = L3
        count[c] = count.get(c, 0) + 1
for r in ROUTES:
    P = [T(*p) for p in r]
    msp.add_lwpolyline(P, dxfattribs={"layer": L3, "const_width": .12, "linetype": "DASHED", "color": 3})
    (xa, ya), (xb, yb) = P[-2], P[-1]
    a = math.atan2(yb - ya, xb - xa); Lh = .7
    msp.add_solid([(xb, yb), (xb - Lh * math.cos(a - .45), yb - Lh * math.sin(a - .45)),
                   (xb - Lh * math.cos(a + .45), yb - Lh * math.sin(a + .45))],
                  dxfattribs={"layer": L3, "color": 3})


def assembly(rect_pdf, lines, rgb, note=None):
    x0, y0 = T(rect_pdf[0], rect_pdf[1]); x1, y1 = T(rect_pdf[2], rect_pdf[3])
    pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    h = msp.add_hatch(color=3, dxfattribs={"layer": L3}); h.rgb = rgb
    h.paths.add_polyline_path(pts, is_closed=True)
    msp.add_lwpolyline(pts, close=True, dxfattribs={"layer": L3, "const_width": .08, "color": 3})
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    n = len(lines)
    for i, s in enumerate(lines):
        text(msp, s, cx, cy + (n - 1) * .4 - i * .8, .55, L3, 250, TextEntityAlignment.MIDDLE_CENTER)
    if note:
        text(msp, note, x0 - .5, y1 - .9, .28, L3, 6)


assembly((274, 356, 325, 407), ["PUNTO", "DE", "REUNION", "1"], (0, 220, 0))
assembly(PR3, ["PUNTO DE", "REUNION 3", "(propuesto)"], (140, 240, 140),
         "Verificar que no cruce maniobra de traileres")

# ------------------------------------------------------------- 4) flow diagram (diagrama de recorrido)
ST = doc.styles.get("SEN-ARIAL").dxf.name


def dr_blocks():
    defs = {
        "DR_OPERACION": (141, 198, 63),
        "DR_INSPECCION": (150, 140, 240),
        "DR_TRANSPORTE": (155, 200, 240),
        "DR_ALMACENAMIENTO": (30, 144, 255),
    }
    for name, rgb in defs.items():
        b = doc.blocks.new(name)
        if name == "DR_OPERACION":
            h = b.add_hatch(); h.rgb = rgb; h.paths.add_edge_path().add_arc((0, 0), .28, 0, 360)
            b.add_circle((0, 0), .28, dxfattribs={"color": 7})
            tp = (0, 0)
        elif name == "DR_INSPECCION":
            pts = [(-.26, -.26), (.26, -.26), (.26, .26), (-.26, .26)]
            h = b.add_hatch(); h.rgb = rgb; h.paths.add_polyline_path(pts, is_closed=True)
            b.add_lwpolyline(pts, close=True, dxfattribs={"color": 7})
            tp = (0, 0)
        elif name == "DR_TRANSPORTE":
            pts = [(-.5, -.13), (.12, -.13), (.12, -.27), (.5, 0), (.12, .27), (.12, .13), (-.5, .13)]
            h = b.add_hatch(); h.rgb = rgb; h.paths.add_polyline_path(pts, is_closed=True)
            b.add_lwpolyline(pts, close=True, dxfattribs={"color": 7})
            tp = (-.12, 0)
        else:
            pts = [(-.33, .28), (.33, .28), (0, -.3)]
            h = b.add_hatch(); h.rgb = rgb; h.paths.add_polyline_path(pts, is_closed=True)
            b.add_lwpolyline(pts, close=True, dxfattribs={"color": 7})
            tp = (0, .1)
        a = b.add_attdef("NUM", tp, dxfattribs={"height": .17, "color": 250, "style": ST})
        a.set_placement(tp, align=TextEntityAlignment.MIDDLE_CENTER)
        d = b.add_attdef("ACTIVIDAD", (0, -.45), dxfattribs={"height": .1, "style": ST})
        d.is_invisible = True


dr_blocks()
BN = {"O": "DR_OPERACION", "I": "DR_INSPECCION", "T": "DR_TRANSPORTE", "S": "DR_ALMACENAMIENTO"}

ACT = {
 "S1": "Almacenar componentes inyectados (almacen de materia prima)",
 "T1": "Transportar componentes del almacen a la Estacion 1",
 "I1": "Est. 1 - Inspeccionar componentes",
 "O1": "Est. 1 - Ensamblar A-EB-001 con A-EB-002",
 "O2": "Est. 1 - Ensamblar A-EB-003",
 "O3": "Est. 1 - Ensamblar A-EB-004",
 "O4": "Est. 1 - Ensamblar A-EB-005",
 "I2": "Est. 1 - Inspeccionar sub-ensamble 1",
 "T2": "Banda: Estacion 1 a Estacion 2",
 "O5": "Est. 2 - Ensamblar B-CF-001 (sub-ensamble de Est. 1)",
 "O6": "Est. 2 - Ensamblar B-CF-002",
 "O7": "Est. 2 - Ensamblar B-CF-003",
 "O8": "Est. 2 - Ensamblar B-CF-004",
 "O9": "Est. 2 - Ensamblar B-CF-005",
 "I3": "Est. 2 - Inspeccionar sub-ensamble 2",
 "T3": "Banda: Estacion 2 a Estacion 3",
 "O10": "Est. 3 - Ensamblar C-EP-001 con C-EP-002",
 "I4": "Est. 3 - Inspeccionar sub-ensamble",
 "T4": "Banda: Estacion 3 a Estacion 4",
 "O11": "Est. 4 - Ensamblar sub-ensamble de Est. 3 con D-EP-001",
 "O12": "Est. 4 - Ensamblar sub-ensamble de Est. 3 con D-CF-002",
 "O13": "Est. 4 - Ensamblar sub-ensamble de Est. 3 con D-CF-003",
 "O14": "Est. 4 - Ensamblar sub-ensamble de Est. 3 con D-EC-004",
 "I5": "Est. 4 - Inspeccionar sub-ensamble",
 "T5": "Banda: Estacion 4 a Estacion 5",
 "O15": "Est. 5 - Atornillar D-EC-002",
 "I6": "Est. 5 - Inspeccion de control de calidad",
 "T6": "Transportar a almacen de producto terminado (pasa por empaque)",
 "S2": "Almacenar producto terminado",
}

s = .62
SYM = {"S1": (172.6, 218.0)}
SYM["T1"] = (170.0, 207.6, -90)
for i, k in enumerate(["I1", "O1", "O2", "O3", "O4", "I2"]):
    SYM[k] = (168.8, 202.9 - i * s)
SYM["T2"] = (170.68, 199.8, 0)
for i, k in enumerate(["O5", "O6", "O7", "O8", "O9", "I3"]):
    SYM[k] = (172.55, 199.8 + i * s)
SYM["T3"] = (175.0, 202.9, 0)
SYM["O10"] = (177.4, 202.9 - s); SYM["I4"] = (177.4, 202.9 - 2 * s)
SYM["T4"] = (179.45, 199.8, 0)
for i, k in enumerate(["O11", "O12", "O13", "O14", "I5"]):
    SYM[k] = (181.5, 199.8 + i * s)
SYM["T5"] = (183.4, 202.9, 0)
SYM["O15"] = (185.3, 202.9); SYM["I6"] = (185.3, 202.9 + s)
SYM["T6"] = (190.8, 204.2, 0)
SYM["S2"] = (196.6, 204.2)

PATH = [(172.25, 218.0), (170.0, 218.0), (170.0, 202.9), (168.8, 202.9), (168.8, 199.8), (172.55, 199.8),
        (172.55, 202.9), (177.4, 202.9), (177.4, 199.8), (181.5, 199.8), (181.5, 202.9), (185.3, 202.9),
        (185.3, 204.2), (196.3, 204.2)]
msp.add_lwpolyline(PATH, dxfattribs={"layer": L4, "color": 7, "const_width": .03})

for k, v in SYM.items():
    kind = k[0]
    rot = v[2] if len(v) > 2 else 0
    ins = msp.add_blockref(BN[kind], (v[0], v[1]), dxfattribs={"layer": L4, "rotation": rot})
    ins.add_auto_attribs({"NUM": k[1:], "ACTIVIDAD": ACT[k]})
if not FULL:
    text(msp, "ALMACEN DE MATERIA PRIMA", 173.1, 218.4, .3, L4, 4)
    text(msp, "ALMACEN DE PRODUCTO TERMINADO", 194.6, 205.2, .3, L4, 4)


# ------------------------------------------------------------- legends
def sen_legend(X, Y):
    text(msp, "SIMBOLOGIA DE SEÑALETICA - " + ("PLANTA GENERAL" if FULL else "AREA DE PRODUCCION"), X, Y, .55, L2, 7)
    text(msp, "Colores y formas segun NOM-026-STPS-2008", X, Y - .8, .3, L2, 7)
    y = Y - 2.0
    for c, hd in zip([X, X + 1.3, X + 3.0, X + 13.5], ["Simb.", "Cant.", "Texto de la senal", "Fundamento (NOM)"]):
        text(msp, hd, c, y, .3, L2, 7)
    y -= 1.1
    for code, (desc, nom) in DESC.items():
        if code not in count:
            continue
        ins = place(msp, code, X + .4, y + .12)
        if code in ("P3", "F4"):
            ins.dxf.layer = L2
        text(msp, f"{code}  x{count[code]}", X + 1.3, y, .28, L2, 7)
        text(msp, desc, X + 3.0, y, .28, L2, 7)
        text(msp, nom, X + 13.5, y, .28, L2, 7)
        y -= .95


def dr_legend(X, Y):
    text(msp, "DIAGRAMA DE RECORRIDO - ENSAMBLE DE CONTROL", X, Y, .55, L4, 7)
    text(msp, "Basado en el Diagrama de Operaciones (mejorado)", X, Y - .8, .3, L4, 7)
    y = Y - 2.0
    text(msp, "SIMBOLOGIA", X, y, .35, L4, 7); y -= 1.0
    for name, lab in (("DR_OPERACION", "Operacion (circulo)"), ("DR_INSPECCION", "Inspeccion (cuadro)"),
                      ("DR_TRANSPORTE", "Transporte (flecha)"), ("DR_ALMACENAMIENTO", "Almacenamiento (triangulo invertido)")):
        ins = msp.add_blockref(name, (X + .6, y + .1), dxfattribs={"layer": L4})
        ins.add_auto_attribs({"NUM": "", "ACTIVIDAD": lab})
        text(msp, lab, X + 1.5, y, .3, L4, 7)
        y -= .9
    y -= .4
    text(msp, "RESUMEN:  Operaciones 15  |  Inspecciones 6  |  Transportes 6  |  Almacenamientos 2", X, y, .3, L4, 7)
    y -= 1.1
    text(msp, "No.", X, y, .3, L4, 7); text(msp, "Actividad", X + 1.5, y, .3, L4, 7)
    y -= .9
    for k in ["S1", "T1", "I1", "O1", "O2", "O3", "O4", "I2", "T2", "O5", "O6", "O7", "O8", "O9", "I3", "T3",
              "O10", "I4", "T4", "O11", "O12", "O13", "O14", "I5", "T5", "O15", "I6", "T6", "S2"]:
        ins = msp.add_blockref(BN[k[0]], (X + .5, y + .1), dxfattribs={"layer": L4})
        ins.add_auto_attribs({"NUM": k[1:], "ACTIVIDAD": ACT[k]})
        text(msp, ACT[k], X + 1.5, y, .27, L4, 7)
        y -= .75


sen_legend(224.0 if FULL else 216.0, 214.0)
dr_legend(258.0 if FULL else 250.0, 214.0)

# ------------------------------------------------------------- cleanup: only our 4 layers (+0, Defpoints)
keep = {"0", "Defpoints", L0, L1, L2, L3, L4}
used = {e.dxf.layer for e in msp}
for blk in doc.blocks:
    for e in blk:
        used.add(e.dxf.layer)
print("layers used:", used)
for lay in list(doc.layers):
    n = lay.dxf.name
    if n not in keep and n not in used:
        try:
            doc.layers.remove(n)
        except Exception as ex:
            print("cannot remove", n, ex)
if doc.header.get("$CLAYER", "0") not in doc.layers:
    doc.header["$CLAYER"] = "0"
doc.saveas(OUT)
print("saved", OUT, "signs", count)
