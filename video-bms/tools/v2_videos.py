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
if __name__ == "__main__":
    for k in (sys.argv[1:] or ["sample"]):
        slug, title, fn = VIDEOS[k]
        print(k, build_video(ROOT, slug, title, fn(), TEMPLATE))
