#!/usr/bin/env python3
"""Builds the six 'BMS en un clic' episodes.  Run:  python3 tools/series.py [ep1 ep2 ...]"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from series_engine import Browser, Ground, build_episode, intro, outro

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "series")
TEMPLATE = os.path.join(HERE, "..", "film")

SIG = ("editor.signavio.com", "/p/hub/home")
HOME = dict(img="signavio-home.png", W=1914, H=1095, crop=32, url=SIG)
PROC = dict(img="process-page.png", W=1893, H=887, url=("editor.signavio.com", "/p/hub/model/GR_00168_00"))
TITLES = ["Entrar al BMS", "Moverte en Signavio", "El mapa de procesos", "Cómo se nombran los procesos",
          "Leer un proceso", "Dónde está todo y ayuda"]


def ep1():
    A = Browser("e1-bbc", "bbc-dashboard.jpg", 960, 493, url=("brosecloud.sharepoint.com", "/sites/bbc"), fit=1.7,
                rise=True, start_cam=(1.5, 294, 385))
    A.say("Cualquier empleado con <b>cuenta de Windows</b> puede entrar", pos=(1060, 200))
    A.say("Para leer procesos publicados <b>no necesitas permisos extra</b>", pos=(1060, 200))
    A.focus((222, 336, 144, 98), "En la BBC, busca el mosaico <b>Brose Management System</b>")

    C = Browser("e1-app", "app-register-bms.png", 1637, 791, crop=41, url=("brosecloud.sharepoint.com", "/sites/bbc-appregister"))
    C.inner.append('<div class="cover" style="left:60px;top:262px;width:880px;height:420px" id="e1-app-res"></div>')
    t0, hold = C.tip("¿No lo ves? Abre <b>App Register</b> y busca «Signavio»", pos=(1060, 560))
    C.wait(.6).type_text("SIGNAVIO", 115, 189, 16, cover=(100, 186, 1160, 30))
    C.click(1327, 200)
    C.js.append(f"tl.to('#e1-app-res',{{opacity:0,duration:.25,ease:'power1.out'}},{C.t:.2f});")
    C.t = max(C.t + .4, t0 + hold + .25)
    C.focus((494, 270, 408, 329), "Ahí está: <b>Brose Management System</b>", z=1.3)

    B = Browser("e1-tile", "bms-tile.jpg", 390, 270, url=("brosecloud.sharepoint.com", "/sites/bbc"), fit=2.4,
                exit="zoom", zoom_target=(140, 186))
    B.click(320, 41)
    B.pop_star(320, 41, 34)
    B.focus((296, 17, 48, 48), "Marca la <b>estrella</b> y lo tienes siempre en favoritos")
    B.focus((30, 168, 225, 34), "Clic en <b>Start SAP Signavio</b>", keep=True)
    B.click(140, 186)

    D = Browser("e1-home", **HOME, loading=True, exit="drop")
    D.say("Listo: estás en el <b>inicio del BMS</b>", pos=(1150, 150))
    return [intro("e1-intro", 1, TITLES[0], "BMS"), A, C, B, D, outro("e1-out", "Ya estás dentro.", ["dentro."], TITLES[1])]


def ep2():
    A = Browser("e2-home", **HOME, rise=True)
    A.sbox(146, 84, 122, 36, "Usa las <b>flechas del navegador</b> para ir atrás o adelante")
    A.focus((60, 6, 150, 44), "El logo <b>BMS</b> te regresa al inicio", z=1.6)
    A.focus((14, 56, 34, 34), "La <b>casita</b> también te lleva al inicio")
    A.focus((298, 12, 94, 30), "<b>Published</b> es la vista normal: todo lo publicado")

    B = Browser("e2-views", "views.jpg", 940, 280, url=SIG, fit=1.6)
    B.focus((630, 190, 232, 78), "<b>Preview</b> pide autorización especial: procesos sin publicar o archivados")

    C = Browser("e2-profile", "profile-menu.jpg", 420, 480, url=SIG, fit=1.7, xoff=180)
    C.focus((146, 170, 116, 26), "En tu perfil, <b>Manage Account</b> cambia el idioma del sistema")
    C.focus((86, 312, 234, 34), "<b>Content Language</b> cambia el idioma del contenido")

    D = Browser("e2-fav", **PROC, start_cam=(1.8, 1500, 140))
    D.click(1652, 121)
    D.pop_star(1652, 121, 26)
    D.focus((1632, 100, 40, 40), "¿Lo usas seguido? Márcalo con la <b>estrella</b>")
    D.cam_to(1.8, 200, 200)
    D.focus((14, 144, 38, 36), "Lo encuentras en <b>Favoritos</b>, en el menú de la izquierda")

    E = Browser("e2-recent", "recent.png", 1898, 1040, url=("editor.signavio.com", "/p/hub/recent"),
                start_cam=(1.15, 300, 200), exit="drop")
    E.say("En <b>Recientes</b> vuelves a lo último que abriste", pos=(190, 560))
    return [intro("e2-intro", 2, TITLES[1], "Signavio"), A, B, C, D, E,
            outro("e2-out", "Te mueves como en casa.", ["casa."], TITLES[2])]


def ep3():
    A = Browser("e3-home", **HOME, rise=True)
    A.say("La página de inicio es el <b>mapa de procesos</b> de Brose", pos=(1150, 150))
    A.cam_to(1.22, 760, 700)
    A.focus((302, 396, 892, 151), "<b>Gestión</b>: definen y controlan nuestro negocio", pos=(1250, 260))
    A.focus((302, 545, 892, 150), "<b>Realización</b>: generan el volumen de negocio", pos=(1250, 430))
    A.focus((302, 693, 892, 380), "<b>Soporte</b>: hacen que el negocio funcione sin tropiezos", pos=(1250, 600))
    A.cam_to(1, 957, 0)
    A.card('<div style="font-size:190px;font-weight:700;line-height:.95;letter-spacing:-0.03em">14</div>'
           '<div style="font-size:44px;font-weight:600;line-height:1.1">procesos principales</div>'
           '<div style="font-size:29px;font-weight:400;margin-top:12px;opacity:.85">reúnen todos los procesos de Brose</div>', 1290, 300)

    B = Browser("e3-list", "landscape-14.jpg", 736, 566, url=SIG, fit=1.5, xoff=40, exit="out")
    rows = [((14, 43, 140, 52), "Definir la estrategia del negocio"), ((155, 47, 540, 47), "Planeación y control"),
            ((155, 166, 135, 38), "Encontrar nuevas ideas de negocio"), ((293, 166, 133, 38), "Identificar nuevos productos"),
            ((426, 166, 135, 38), "Desarrollar el producto"), ((561, 166, 135, 38), "Del arranque a la entrega")]
    for i, label in enumerate(["Temas de calidad", "Procesos de RH", "Cotización, pedido, factura y cobranza", "Compras",
                               "Reportes financieros y contabilidad", "Sistemas de TI: implementar y mantener",
                               "Sistemas de gestión", "Comunicación interna y externa"]):
        yc = [290, 324, 358, 392, 425, 459, 493, 527][i]
        rows.append(((155, yc - 12, 541, 24), label))
    for n, (rect, label) in enumerate(rows, 1):
        sx, sy = B.scr(rect[0], rect[1] + rect[3] / 2)
        B.focus(rect, f"<b>{n:02d}</b> {label}", pos=(1270, max(140, min(880, sy - 40))), hold=1.85, gap=.1)

    C = Browser("e3-tools", **HOME, exit="drop")
    tools = [((200, 293, 280, 70), "<b>BMS Cockpit</b>: la página del BMS en la BBC"),
             ((510, 293, 240, 70), "<b>BMS Trainings</b>: todo sobre las capacitaciones"),
             ((818, 293, 260, 70), "<b>Process System Handbook</b>: acceso rápido a roles y procesos"),
             ((1128, 293, 255, 70), "<b>Transfer Matrix</b>: de la lógica anterior a la nueva"),
             ((1440, 293, 215, 70), "<b>Process Role Catalogue</b>: todos los roles de proceso")]
    for rect, text in tools:
        x = rect[0] + rect[2] / 2
        C.focus(rect, text, pos=(max(160, min(1150, 128 + x * C.s - 300)), 560))
    C.focus((1338, 396, 424, 380), "<b>Vistas específicas</b>: sistemas de gestión, funcionales, por tema y por planta", pos=(300, 600))
    C.say("También hay vistas por <b>proyecto de cliente</b>", pos=(300, 640))
    return [intro("e3-intro", 3, TITLES[2], "mapa"), A, B, C,
            outro("e3-out", "14 procesos, un solo mapa.", ["mapa."], TITLES[3])]


def ep4():
    A = Browser("e4-home", **HOME, rise=True)
    A.cam_to(1.22, 760, 800)
    A.focus((498, 785, 664, 42), "Cada <b>proceso principal</b> tiene su propio mapa", pos=(1180, 520))

    B = Browser("e4-layers", "structure-layers.jpg", 660, 585, url=("editor.signavio.com", "/p/hub/model/H2R_06"), fit=1.45, xoff=80)
    B.focus((150, 200, 505, 380), "Esos mapas contienen <b>otros mapas</b> o <b>procesos</b>", pos=(1180, 420))
    B.say("…hasta llegar a cada <b>proceso de grupo</b> en detalle", pos=(1180, 420))

    C = Browser("e4-gr", "gr00542.jpg", 1242, 414, url=("editor.signavio.com", "/p/hub/model/GR_00542_00"), fit=1.3)
    C.focus((425, 2, 500, 38), "Cada proceso tiene <b>nombre y número</b>", pos=(600, 760))
    C.say("<b>GR</b> = proceso de grupo, válido en todo Brose", pos=(600, 760))

    D = Browser("e4-s2p", "s2p-landscape.jpg", 729, 332, url=("editor.signavio.com", "/p/hub/model/S2P_02"), fit=2.1)
    D.focus((408, 42, 116, 80), "En el mapa de compras se llama <b>S2P_02_GR_07_00</b>", pos=(560, 780))

    E = Browser("e4-p2d", "p2d-landscape.jpg", 628, 330, url=("editor.signavio.com", "/p/hub/model/P2D_03"), fit=2.4, exit="drop")
    E.focus((76, 100, 90, 63), "En el de producción se llama <b>P2D_03_GR_15_00</b>", pos=(700, 780))
    E.say("Pero adentro siempre es el mismo: <b>GR_00266_00</b>", pos=(700, 780))

    F = Ground("e4-names")
    F.add('<div id="e4n-code" style="position:absolute;left:200px;top:190px;font-size:180px;font-weight:700;letter-spacing:-0.02em">GR_00266_00</div>'
          '<div id="e4n-r1" style="position:absolute;left:200px;top:470px;font-size:100px;font-weight:700"><span style="color:#CE003A">WI_</span>GR_00266_01'
          '<span style="font-size:52px;font-weight:500;color:#5B6572;margin-left:40px">instrucción de trabajo</span></div>'
          '<div id="e4n-r2" style="position:absolute;left:200px;top:630px;font-size:100px;font-weight:700"><span style="color:#CE003A">AT_</span>GR_00266_01'
          '<span style="font-size:52px;font-weight:500;color:#5B6572;margin-left:40px">anexo</span></div>'
          '<div id="e4n-note" style="position:absolute;left:200px;top:830px;font-size:46px;font-weight:500;color:#1E2833">'
          'Llevan el nombre del proceso al que pertenecen</div>',
          ["tl.fromTo('#e4n-code',{opacity:0,filter:'blur(8px)'},{opacity:1,filter:'blur(0px)',duration:.2,ease:'power2.out'},.1);",
           "tl.fromTo('#e4n-r1',{opacity:0,x:-40},{opacity:1,x:0,duration:.5,ease:'expo.out'},1.1);",
           "tl.fromTo('#e4n-r2',{opacity:0,x:-40},{opacity:1,x:0,duration:.5,ease:'expo.out'},2.4);",
           "tl.fromTo('#e4n-note',{opacity:0,filter:'blur(6px)'},{opacity:1,filter:'blur(0px)',duration:.2},3.6);",
           "tl.to('#e4n-code, #e4n-r1, #e4n-r2, #e4n-note',{opacity:0,filter:'blur(10px)',duration:.2,ease:'power2.in'},6.5);"],
          t_after=6.8, sfx=[(1.1, "pop.mp3", .7, .6, True), (2.4, "pop.mp3", .7, .6, True)])
    F.dur = 6.8
    return [intro("e4-intro", 4, TITLES[3], "nombran"), A, B, C, D, E, F,
            outro("e4-out", "Un proceso, un nombre.", ["nombre."], TITLES[4])]


def ep5():
    A = Browser("e5-home", **HOME, rise=True)
    A.cam_to(1.8, 1480, 40)
    t0, hold = A.tip("Busca por <b>nombre</b>, <b>número</b> de proceso o <b>cláusula IATF</b>", pos=(980, 480))
    A.box(1300, 6, 364, 42, A.t, t0 + hold)
    A.click(1520, 26)
    A.type_text("GR_00168", 1434, 15, 15, cover=(1428, 12, 200, 28))
    A.t = max(A.t, t0 + hold - 1.0)
    A.click(1645, 26)
    A.t = max(A.t, t0 + hold + .2)

    B = Browser("e5-results", "search-results.png", 1895, 778, url=("editor.signavio.com", "/p/hub/search?q=GR_00168"))
    B.cam_to(1.28, 900, 470)
    B.focus((428, 478, 1410, 108), "Aparecen los <b>procesos (GR)</b> y sus <b>instrucciones de trabajo (WI)</b>", keep=True, pos=(1100, 780))
    B.click(700, 505)

    C = Browser("e5-proc", **PROC)
    C.cam_to(1.6, 560, 110)
    C.focus((114, 72, 838, 30), "La <b>ruta</b> te dice dónde vive el proceso", pos=(300, 330))
    C.cam_to(1, 946, 400)
    C.focus((116, 232, 1731, 491), "La <b>descripción</b>: qué hace el proceso y qué normas aplica", pos=(1120, 700), keep=True)
    C.say("También ves <b>riesgos y oportunidades</b> y cláusulas <b>IATF</b> e <b>ISO 45001</b>", pos=(1080, 700))
    C.say("…y el <b>alcance</b>: dónde aplica el proceso", pos=(1120, 700))

    D = Browser("e5-flow", "process-diagram.png", 1651, 638, url=PROC["url"])
    D.say("El <b>flujo</b>: quién hace qué y en qué orden", pos=(200, 820))

    E = Browser("e5-task", "task-icons.png", 1102, 380, url=PROC["url"], fit=1.45)
    E.focus((272, 94, 440, 76), "Sobre cada tarea: procesos <b>antes y después</b>, transacciones <b>SAP</b>, documentos y normas", pos=(1050, 800))

    F = Browser("e5-icons", "icons.jpg", 790, 310, url=PROC["url"], fit=1.9, exit="drop")
    F.focus((25, 15, 84, 84), "Naranja: <b>riesgos</b>", pos=(330, 820), hold=2.0)
    F.focus((353, 15, 84, 84), "Verde: <b>controles</b>", pos=(760, 820), hold=2.0)
    F.focus((686, 15, 80, 74), "Azul: <b>sistemas de TI</b>", pos=(1150, 820), hold=2.0)
    F.focus((32, 185, 70, 100), "<b>Documentos</b> relacionados", pos=(420, 820), hold=2.0)
    return [intro("e5-intro", 5, TITLES[4], "proceso"), A, B, C, D, E, F,
            outro("e5-out", "Todo el proceso, en una página.", ["página."], TITLES[5])]


def ep6():
    A = Browser("e6-repo", "repository.jpg", 476, 268, url=("editor.signavio.com", "/p/hub/repository"), fit=2.4, rise=True, xoff=60)
    A.focus((4, 60, 38, 16), "En <b>Repository</b> están todos los modelos", z=1.7, pos=(1250, 300))
    A.cam_to(1.5, 250, 110)
    A.say("Mapas, diagramas, instrucciones de trabajo, roles y <b>mapas por planta</b>", pos=(1250, 300))

    B = Browser("e6-dict", "dictionary.jpg", 476, 267, url=("editor.signavio.com", "/p/hub/dictionary"), fit=2.4, xoff=60)
    B.focus((4, 80, 36, 16), "En <b>Dictionary</b> están todos los objetos", z=1.7, pos=(1250, 300))
    B.cam_to(1.5, 250, 120)
    B.say("Roles, documentos, usuarios, riesgos, controles y <b>sistemas de TI</b>", pos=(1250, 300))

    C = Browser("e6-portal", "knowledge-portal.png", 1858, 1050, url=("brosecloud.sharepoint.com", "/sites/bms/knowledge-portal"))
    C.say("El <b>BMS Knowledge Portal</b> tiene guías paso a paso", pos=(1100, 230))
    C.cam_to(1, 929, 1050)
    C.focus((276, 728, 1340, 255), "Cómo navegar, cómo leer un proceso y sus objetos", pos=(1100, 200))

    D = Browser("e6-train", **HOME, exit="drop")
    D.focus((510, 293, 240, 70), "En <b>BMS Trainings</b>: webinar con instructor y curso autodidacta", z=1.3, pos=(700, 640))
    D.focus((818, 293, 260, 70), "<b>Process System Handbook</b>: guía rápida para encontrar procesos y roles", pos=(700, 640))
    D.say("¿Dudas? En el portal están tus <b>contactos del BMS</b>", pos=(700, 640))
    return [intro("e6-intro", 6, TITLES[5], "ayuda"), A, B, C, D, outro("e6-out", "Tu proceso, a un clic.", ["a", "un", "clic."])]


EPS = {"ep1": ep1, "ep2": ep2, "ep3": ep3, "ep4": ep4, "ep5": ep5, "ep6": ep6}
if __name__ == "__main__":
    for k in (sys.argv[1:] or list(EPS)):
        i = int(k[2:]) - 1
        total = build_episode(ROOT, k, f"BMS en un clic {i + 1} — {TITLES[i]}", EPS[k](), TEMPLATE)
        print(k, total)
