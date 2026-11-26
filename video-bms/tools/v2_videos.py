#!/usr/bin/env python3
"""The three 'BMS en un clic' videos (v2 look).  python3 tools/v2_videos.py [v1 v2 v3 | sample]"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from v2_engine import Chapter, Screen, Card, build_video, title_card, end_card

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "v2")
TEMPLATE = os.path.join(HERE, "..", "film")

BBC = Screen("bbc-dashboard-clean.jpg", 960, 493, url=("brosecloud.sharepoint.com", "/sites/bbc"), scale=1100 / 960)
APPREG = Screen("app-register-bms.png", 1637, 791, crop=41, url=("brosecloud.sharepoint.com", "/sites/bbc-appregister"))
HOME = Screen("signavio-home.png", 1914, 1095, crop=32, url=("editor.signavio.com", "/p/hub/home"))


def ch_entrar(total=4):
    c = Chapter("v1-entrar", "Entrar al BMS", total)
    c.show(BBC, cam=(1, None, 140))
    c.step("Entra desde la BBC",
           "Cualquier empleado con <b>cuenta de Windows</b> puede entrar. Para leer procesos publicados <b>no necesitas permisos extra</b>.")
    c.wait(1.2)
    b = c.box((222, 336, 144, 98))
    c.point(300, 400)
    c.wait(.8)
    c.hold()

    c.step("¿No ves el mosaico?", "Abre <b>App Register</b> y escribe «Signavio» en el buscador.")
    c.show(APPREG, cam=(1, None, 0))
    res = c.cover((60, 262, 880, 420))
    c.wait(.5)
    c.type_text("SIGNAVIO", 115, 189, 16, cover=(100, 186, 1160, 30))
    c.click(1327, 200)
    c.js.append(f"tl.to('#{res}',{{opacity:0,duration:.25}},{c.t:.2f});")
    c.wait(.4)
    c.box((494, 270, 408, 329))
    c.loupe((498, 316, 400, 130), w=620, h=210, pos=(1040, 620), hold=2.4)
    c.hold()

    c.step("Guárdalo en favoritos", "Marca la <b>estrella</b> del mosaico y lo tendrás siempre a la mano.")
    c.unbox()
    c.click(877, 297)
    c.star(877, 297, 26)
    c.loupe((690, 270, 250, 60), w=440, h=150, pos=(1300, 560), hold=2.0)
    c.hold()

    c.step("Abre Signavio", "Haz clic en <b>Start Signavio</b> y entras directo al BMS.")
    c.box((506, 372, 128, 24))
    c.click(582, 383)
    c.loupe((470, 360, 260, 80), w=520, h=160, pos=(1000, 640), hold=1.8)
    c.unbox()
    c.cursor_off()
    c.show(HOME, cam=(1, None, 0))
    c.wait(1.6)
    c.hold()
    return c


def sample():
    return [title_card("v1-title", 1, "Entrar y moverte en el BMS", ["BMS"], "Cómo entrar, ubicarte y volver siempre a lo que necesitas"),
            ch_entrar()]


VIDEOS = {"sample": ("sample", "BMS en un clic — muestra", sample)}


# ====================================================================== full videos
import v2_gfx as G

PROC = Screen("process-page.png", 1893, 887, url=("editor.signavio.com", "/p/hub/model/GR_00168_00"))
SEARCH = Screen("search-results.png", 1895, 778, url=("editor.signavio.com", "/p/hub/search?q=GR_00168"))
RECENT = Screen("recent.png", 1898, 1040, url=("editor.signavio.com", "/p/hub/recent"))
PORTAL = Screen("knowledge-portal.png", 1858, 1050, url=("brosecloud.sharepoint.com", "/sites/bms/knowledge-portal"))
GR542 = Screen("gr00542.jpg", 1242, 414, url=("editor.signavio.com", "/p/hub/model/GR_00542_00"))
DIAG = Screen("process-diagram.png", 1651, 638, url=("editor.signavio.com", "/p/hub/model/GR_00168_00"))


def gfx(c, fn, dur):
    html, js = fn()
    c.graphic(html, js, max(dur, c.step_min - c.t + .3))


def ch_moverte():
    c = Chapter("v1-mover", "Moverte en Signavio", 5)
    c.show(HOME, cam=(1, None, 0))
    c.step("Vuelve al inicio", "El logo <b>BMS</b> o la <b>casita</b> del menú te regresan siempre a la página de inicio.")
    c.wait(.8)
    b = c.box((60, 6, 150, 44))
    c.loupe((20, 0, 420, 60), w=600, h=110, pos=(1060, 300), hold=2.2)
    c.unbox(b)
    c.box((14, 56, 34, 34))
    c.point(31, 73)
    c.loupe((0, 40, 300, 120), w=420, h=170, pos=(1060, 300), hold=2.0)
    c.unbox()
    c.cursor_off()
    c.hold()

    c.step("Published y Preview", "<b>Published</b> es la vista normal. <b>Preview</b> pide autorización y muestra procesos sin publicar o archivados.")
    c.box((298, 12, 94, 30))
    c.loupe((200, 0, 300, 60), w=520, h=120, pos=(1100, 300), hold=1.8)
    c.unbox()
    gfx(c, G.pills, 5.4)
    c.hold()

    c.step("Cambia el idioma", "En tu perfil: <b>Manage Account</b> cambia el idioma del sistema y <b>Content Language</b> el del contenido.")
    c.box((1864, 8, 38, 36))
    c.click(1882, 25)
    c.unbox()
    c.cursor_off()
    gfx(c, G.profile_menu, 6.4)
    c.hold()

    c.step("Guarda tus procesos", "Marca la <b>estrella</b> en cualquier proceso y lo encuentras en <b>Favoritos</b>.")
    c.show(PROC, cam=(1, None, 0))
    c.wait(.4)
    c.click(1652, 121)
    c.star(1652, 121, 26)
    c.loupe((1540, 90, 320, 70), w=500, h=130, pos=(1180, 330), hold=1.8)
    c.cursor_off()
    c.box((14, 144, 38, 36))
    c.loupe((0, 60, 260, 230), w=300, h=260, pos=(800, 560), hold=2.0)
    c.unbox()
    c.hold()

    c.step("Vuelve a lo reciente", "En <b>Recientes</b> encuentras lo último que abriste.")
    c.show(RECENT, cam=(1, None, 0))
    c.wait(.4)
    c.loupe((0, 60, 560, 320), w=560, h=320, pos=(1180, 520), hold=2.6)
    c.hold()
    return c


def video1():
    return [title_card("v1-title", 2, "Entrar y moverte en el BMS", ["BMS"], "Cómo entrar a Signavio, ubicarte y guardar lo que más usas"),
            ch_entrar(), ch_moverte(),
            end_card("v1-end", "Ya estás dentro.", ["dentro."], "El mapa de procesos y sus nombres")]


def ch_mapa():
    c = Chapter("v2-mapa", "El mapa de procesos", 6)
    c.show(HOME, cam=(1, None, 0))
    c.step("Tu página de inicio", "Al entrar ves el <b>mapa de procesos de Brose</b>: reúne los 14 procesos principales.")
    c.wait(.6)
    c.point(740, 700)
    c.cursor_off()
    c.hold()

    c.step("Tres grupos", "<b>Gestión</b> define y controla el negocio. <b>Realización</b> genera el volumen de negocio. <b>Soporte</b> mantiene todo en marcha.")
    for r in [(302, 396, 892, 151), (302, 545, 892, 150), (302, 693, 892, 370)]:
        c.box(r, until=c.t + 2.0)
        c.wait(2.2)
    c.hold()

    c.step("Ábrelo con el signo +", "Para abrir un proceso o un mapa, haz clic en el <b>signo +</b>: el cuadrito azul punteado debajo del nombre.")
    c.box((1050, 634, 26, 26))
    c.click(1063, 647)
    c.loupe((960, 580, 220, 90), w=440, h=180, pos=(1080, 640), hold=2.2)
    c.unbox()
    c.cursor_off()
    gfx(c, G.plus_emphasis, 6.0)
    c.hold()

    c.step("Los 14 procesos", "Cada uno reúne los procesos de un área: de la estrategia a la comunicación.")
    gfx(c, G.fourteen, 9.0)
    c.hold()

    c.step("Accesos rápidos", "Arriba del mapa: <b>BMS Cockpit</b>, <b>Trainings</b>, <b>Process System Handbook</b>, <b>Transfer Matrix</b> y <b>Process Role Catalogue</b>.")
    c.box((195, 285, 1490, 95))
    c.loupe((195, 285, 1490, 95), w=1060, h=90, pos=(760, 640), mag=.7, hold=4.0)
    c.unbox()
    c.hold()

    c.step("Vistas específicas", "Mapas por <b>sistema de gestión</b>, <b>función</b>, <b>tema</b>, <b>planta</b> y <b>proyecto de cliente</b>.")
    c.box((1338, 396, 424, 380))
    c.loupe((1338, 396, 424, 380), w=440, h=400, pos=(1000, 380), hold=3.2)
    c.unbox()
    c.hold()
    return c


def ch_nombres():
    c = Chapter("v2-nombres", "Cómo se nombran", 4)
    c.show(GR542, cam=(1, None, 0))
    c.step("Del mapa al proceso", "Cada proceso principal tiene su mapa; esos mapas contienen otros mapas o procesos, hasta el <b>proceso de grupo</b>.")
    gfx(c, G.hierarchy, 6.0)
    c.hold()

    c.step("Nombre y número", "Cada proceso tiene nombre y número. <b>GR</b> = proceso de grupo, válido en todo Brose.")
    c.box((425, 2, 500, 38))
    c.wait(1.0)
    c.unbox()
    gfx(c, G.code_decode, 4.6)
    c.hold()

    c.step("Un proceso, varios mapas", "El mismo <b>GR_00266_00</b> aparece en el mapa de compras y en el de producción, con otro nombre de lugar.")
    gfx(c, G.two_maps, 6.4)
    c.hold()

    c.step("Instrucciones y anexos", "Llevan el nombre de su proceso: <b>WI_</b> para instrucciones de trabajo y <b>AT_</b> para anexos.")
    gfx(c, G.names, 5.0)
    c.hold()
    return c


def video2():
    return [title_card("v2-title", 3, "El mapa de procesos y sus nombres", ["mapa"], "Cómo está organizado el BMS y cómo leer el nombre de cada proceso"),
            ch_mapa(), ch_nombres(),
            end_card("v2-end", "14 procesos, un solo mapa.", ["mapa."], "Leer un proceso y encontrar ayuda")]


def ch_leer():
    c = Chapter("v3-leer", "Leer un proceso", 7)
    c.show(HOME, cam=(1, None, 0))
    c.step("Busca tu proceso", "Escribe el <b>nombre</b>, el <b>número</b> o una <b>cláusula IATF</b> en el buscador.")
    c.cam_to(1.74, 1480, 40)
    c.box((1300, 6, 364, 42))
    c.click(1520, 26)
    c.type_text("GR_00168", 1434, 15, 15, cover=(1428, 12, 200, 28))
    c.click(1645, 26)
    c.unbox()
    c.hold()

    c.step("Elige el resultado", "Verás procesos <b>(GR)</b> e instrucciones de trabajo <b>(WI)</b>.")
    c.show(SEARCH, cam=(1.72, 900, 470))
    c.wait(.4)
    c.box((428, 478, 1410, 108))
    c.click(700, 505)
    c.wait(.6)
    c.unbox()
    c.cursor_off()
    c.hold()

    c.step("Lee la descripción", "Arriba ves su <b>ruta</b> en el mapa; abajo, qué hace el proceso y qué normas aplica.")
    c.show(PROC, cam=(1, None, 0))
    c.wait(.4)
    c.box((114, 72, 838, 30), until=c.t + 2.4)
    c.loupe((114, 62, 640, 90), w=640, h=90, pos=(1000, 300), hold=2.2)
    c.box((116, 232, 1731, 491))
    c.loupe((130, 300, 760, 200), w=760, h=200, pos=(1020, 660), hold=3.2)
    c.unbox()
    c.hold()

    c.step("Información clave", "Cada proceso se divide en: <b>1</b> descripción, <b>2</b> flujo y <b>3</b> información crítica, cada una con su ícono.")
    gfx(c, G.page_sections, 10.6)
    c.hold()

    c.step("Sigue el flujo", "El diagrama muestra quién hace qué y en qué orden.")
    c.show(DIAG, cam=(1, None, 0))
    c.wait(1.2)
    c.cam_to(1.45, 1000, 330, d=1.2)
    c.wait(1.2)
    c.hold()

    c.step("Los íconos de cada tarea", "Arriba de cada tarea: antecesores, transacciones <b>SAP</b>, documentos y normas.")
    gfx(c, G.task_icon_list, 6.4)
    c.hold()

    c.step("Íconos del BMS", "En el BMS también verás estos íconos: <b>riesgos</b>, <b>controles</b>, <b>sistemas de TI</b> y <b>documentos</b>.")
    gfx(c, G.icon_legend, 4.8)
    c.hold()
    return c


def ch_ayuda():
    c = Chapter("v3-ayuda", "Encontrar ayuda", 4)
    c.show(PORTAL, cam=(1, None, 0))
    c.step("Repository", "Aquí están todos los <b>modelos</b>: mapas, diagramas, instrucciones de trabajo, roles y mapas por planta.")
    gfx(c, G.repository, 5.4)
    c.hold()

    c.step("Dictionary", "Aquí están todos los <b>objetos</b>: roles, documentos, usuarios, riesgos, controles y sistemas de TI.")
    gfx(c, G.dictionary, 5.4)
    c.hold()

    c.step("BMS Knowledge Portal", "Guías paso a paso: cómo navegar, cómo leer un proceso y sus objetos.")
    c.wait(.6)
    c.box((276, 728, 1340, 255))
    c.loupe((276, 728, 700, 260), w=700, h=260, pos=(1000, 300), hold=3.0)
    c.unbox()
    c.hold()

    c.step("Capacitaciones y contactos", "En <b>BMS Trainings</b>: webinar con instructor y curso autodidacta. ¿Dudas? Busca a tus <b>contactos del BMS</b> en el portal.")
    c.show(HOME, cam=(1, None, 0))
    c.wait(.4)
    c.box((510, 293, 240, 70))
    c.loupe((470, 280, 330, 100), w=500, h=150, pos=(1100, 620), hold=3.4)
    c.unbox()
    c.hold()
    return c


def video3():
    return [title_card("v3-title", 4, "Leer un proceso y encontrar ayuda", ["proceso"], "Busca, entiende cada parte de un proceso y sabe a dónde acudir"),
            ch_leer(), ch_ayuda(),
            end_card("v3-end", "Tu proceso, a un clic.", ["a", "un", "clic."])]


def ch_g_entrar():
    c = Chapter("g-entrar", "Cómo entrar", 3)
    c.show(APPREG, cam=(1, None, 0))
    c.step("Búscalo en App Register", "En la BBC abre <b>App Register</b>, escribe «Signavio» y da clic en la flecha.")
    res = c.cover((60, 262, 880, 420))
    c.wait(.4)
    c.type_text("SIGNAVIO", 115, 189, 16, cover=(100, 186, 1160, 30))
    c.click(1327, 200)
    c.js.append(f"tl.to('#{res}',{{opacity:0,duration:.25}},{c.t:.2f});")
    c.wait(.4)
    c.box((494, 270, 408, 329))
    c.loupe((498, 316, 400, 130), w=620, h=210, pos=(1040, 620), hold=2.2)
    c.hold()

    c.step("Marca la estrella", "Abre el mosaico <b>Brose Management System</b> y marca la estrella: quedará en tus favoritos.")
    c.unbox()
    c.click(877, 297)
    c.star(877, 297, 26)
    c.loupe((690, 270, 250, 60), w=440, h=150, pos=(1300, 560), hold=2.0)
    c.hold()

    c.step("Start Signavio", "Da clic en <b>Start Signavio</b> y llegas directo a la página inicial.")
    c.box((506, 372, 128, 24))
    c.click(582, 383)
    c.unbox()
    c.cursor_off()
    c.show(HOME, cam=(1, None, 0))
    c.wait(1.4)
    c.hold()
    return c


def ch_g_explorar():
    c = Chapter("g-explorar", "Explorando Signavio", 6)
    c.show(HOME, cam=(1, None, 0))
    c.step("Lo que ya conocías", "Aquí siguen: <b>1</b> el mapa de procesos, <b>2</b> el manual de calidad y <b>3</b> el Plant Specific Landscape.")
    c.wait(.4)
    c.badge(1, 210, 420)
    c.box((302, 396, 892, 667), until=c.t + 2.0)
    c.wait(2.2)
    c.badge(2, 820, 300)
    c.box((818, 293, 260, 70), until=c.t + 2.0)
    c.loupe((800, 280, 300, 100), w=430, h=140, pos=(1000, 640), hold=1.9)
    c.badge(3, 1380, 690)
    c.box((1391, 674, 318, 66), until=c.t + 2.2)
    c.loupe((1380, 660, 340, 100), w=440, h=130, pos=(1000, 640), hold=2.0)
    c.hold()
    c.unbadge()

    c.step("Ábrelo con el signo +", "Para abrir un proceso o un mapa, haz clic en el <b>signo +</b>: el cuadrito azul punteado debajo del nombre.")
    c.box((1050, 634, 26, 26))
    c.click(1063, 647)
    c.loupe((960, 580, 220, 90), w=440, h=180, pos=(1080, 640), hold=2.2)
    c.unbox()
    c.cursor_off()
    gfx(c, G.plus_emphasis, 6.0)
    c.hold()

    c.step("Busca tu proceso", "Busca por <b>nombre del proceso</b> o por <b>cláusula IATF</b>.")
    c.cam_to(1.74, 1480, 40)
    c.box((1300, 6, 364, 42))
    c.click(1520, 26)
    c.type_text("GR_00168", 1434, 15, 15, cover=(1428, 12, 200, 28))
    c.click(1645, 26)
    c.unbox()
    c.show(SEARCH, cam=(1.72, 900, 470))
    c.wait(.4)
    c.box((428, 478, 1410, 108))
    c.click(700, 505)
    c.unbox()
    c.cursor_off()
    c.hold()

    c.step("Todo en secciones", "Cada proceso se divide en: <b>1</b> descripción, <b>2</b> flujo y <b>3</b> información crítica, cada una con su ícono.")
    c.show(PROC, cam=(1, None, 0))
    gfx(c, G.page_sections, 10.6)
    c.hold()

    c.step("Íconos nuevos", "Arriba de cada tarea: antecesores, transacciones <b>SAP</b>, documentos y normas.")
    gfx(c, G.task_icon_list, 6.4)
    c.hold()

    c.step("BMS Knowledge Portal", "Para capacitaciones específicas, consulta el <b>SharePoint del BMS</b> y elige tu tema.")
    c.show(PORTAL, cam=(1, None, 0))
    c.wait(.8)
    c.box((276, 728, 1340, 255))
    c.loupe((276, 728, 700, 260), w=700, h=260, pos=(1000, 300), hold=2.8)
    c.unbox()
    c.hold()
    return c


def video0():
    return [title_card("g-title", 1, "Explorando el nuevo Signavio", ["Signavio"], "Lo esencial del nuevo BMS en poco más de un minuto"),
            ch_g_entrar(), ch_g_explorar(),
            end_card("g-end", "Bienvenido al nuevo Signavio.", ["Signavio."], "Entrar y moverte en el BMS")]


VIDEOS.update({"v0": ("video-1-explorando-signavio", "BMS en un clic 1 — Explorando el nuevo Signavio", video0),
               "v1": ("video-2-entrar-y-moverte", "BMS en un clic 2 — Entrar y moverte", video1),
               "v2": ("video-3-mapa-y-nombres", "BMS en un clic 3 — El mapa y los nombres", video2),
               "v3": ("video-4-leer-y-ayuda", "BMS en un clic 4 — Leer un proceso y ayuda", video3)})


if __name__ == "__main__":
    for k in (sys.argv[1:] or ["sample"]):
        slug, title, fn = VIDEOS[k]
        print(k, build_video(ROOT, slug, title, fn(), TEMPLATE))
