"""Vector graphics for the right panel (1244 x 1080, ground #F3F4F6). Each returns (html, js);
js lines use {t} for the graphic's start time and {gid} for its container id."""

RED, INK, MUTED = "#CE003A", "#1E2833", "#5B6572"
CARD = "background:#fff;border-radius:18px;box-shadow:0 18px 40px rgba(20,30,45,.10),0 1px 3px rgba(20,30,45,.08);"


def _bg():
    return '<div style="position:absolute;inset:0;background:#F3F4F6"></div>'


def _stagger(sel, start, gap=.12, dur=.45, frm="y:30"):
    return f"tl.fromTo('#{{gid}} {sel}',{{opacity:0,{frm}}},{{opacity:1,y:0,x:0,duration:{dur},stagger:{gap},ease:'expo.out'}},{{t}}+{start});"


def pills():
    html = _bg() + f"""
<div class="p1" style="position:absolute;left:150px;top:250px;width:940px;height:230px;{CARD}">
  <div style="position:absolute;left:56px;top:62px;padding:0 34px;height:96px;border-radius:24px;border:3px solid #C9CED6;font-size:54px;font-weight:600;line-height:90px;color:#1E2833">Published &#8964;</div>
  <div style="position:absolute;left:470px;top:56px;width:420px;font-size:32px;line-height:1.3;color:#1E2833"><b>Vista normal</b><br><span style="color:#5B6572">todos ven los procesos publicados</span></div>
</div>
<div class="p1" style="position:absolute;left:150px;top:540px;width:940px;height:230px;{CARD}">
  <div style="position:absolute;left:56px;top:62px;padding:0 34px;height:96px;border-radius:24px;border:3px solid #F2D35B;background:#FFF2B8;font-size:54px;font-weight:600;line-height:90px;color:#B45309">Preview &#8964;</div>
  <div style="position:absolute;left:470px;top:56px;width:420px;font-size:32px;line-height:1.3;color:#1E2833"><b>Requiere autorización</b><br><span style="color:#5B6572">procesos sin publicar o archivados</span></div>
</div>"""
    return html, [_stagger(".p1", .1, .5)]


def profile_menu():
    items = [("Settings", ""), ("My Subscriptions", ""), ("Audiences", "General Audience"),
             ("Content Language", "English"), ("Legal information", ""), ("About", "")]
    rows = ""
    y = 300
    for i, (a, b) in enumerate(items):
        hl = ' id="pm-cl"' if a == "Content Language" else ""
        rows += (f'<div{hl} style="position:absolute;left:40px;top:{y}px;width:460px;height:{70 if b else 56}px">'
                 f'<div style="font-size:28px;color:#1E2833">{a}</div>'
                 + (f'<div style="font-size:26px;color:#5B6572">{b}</div>' if b else "") + "</div>")
        y += 80 if b else 62
    html = _bg() + f"""
<div style="position:absolute;left:330px;top:110px;width:540px;height:840px;{CARD}">
  <div style="position:absolute;left:210px;top:44px;width:120px;height:120px;border-radius:60px;background:#D9EBFF;color:#1A6BD8;font-size:46px;font-weight:600;text-align:center;line-height:120px">Tú</div>
  <div id="pm-ma" style="position:absolute;left:150px;top:196px;width:240px;height:52px;border-radius:12px;border:2px solid #9DB6D8;font-size:24px;line-height:48px;text-align:center;color:#1A6BD8">Manage Account</div>
  {rows}
  <div style="position:absolute;left:390px;top:780px;font-size:24px;color:#1A6BD8">Sign Out</div>
</div>
<div class="hlg" id="pm-b1" style="position:absolute;left:470px;top:296px;width:260px;height:72px;border:4px solid {RED};border-radius:14px;opacity:0"></div>
<div class="hlg" id="pm-b2" style="position:absolute;left:358px;top:606px;width:484px;height:86px;border:4px solid {RED};border-radius:14px;opacity:0"></div>
"""
    js = ["tl.fromTo('#{gid} #pm-b1',{opacity:0,scale:1.08},{opacity:1,scale:1,duration:.3,ease:'expo.out'},{t}+.6);",
          "tl.to('#{gid} #pm-b1',{opacity:0,duration:.15},{t}+3.4);",
          "tl.fromTo('#{gid} #pm-b2',{opacity:0,scale:1.08},{opacity:1,scale:1,duration:.3,ease:'expo.out'},{t}+3.6);"]
    return html, js


PROCS = [("01", "S2S", "Estrategia del negocio", 0), ("02", "A2D", "Planeación y control", 0),
         ("03", "S2I", "Nuevas ideas de negocio", 1), ("04", "I2A", "Nuevos productos (InnoMAX)", 1),
         ("05", "A2P", "Desarrollo de producto (PDP)", 1), ("06", "P2D", "Del arranque a la entrega", 1),
         ("07", "P2Q", "Temas de calidad", 2), ("08", "H2R", "Recursos humanos", 2),
         ("09", "C2C", "Cotización, pedido y cobranza", 2), ("10", "S2P", "Compras", 2),
         ("11", "R2R", "Contabilidad y reportes", 2), ("12", "I2I", "Sistemas de TI", 2),
         ("13", "C2I", "Sistemas de gestión", 2), ("14", "I2C", "Comunicación interna y externa", 2)]
GROUPS = [("Gestión", "#1E2833"), ("Realización", RED), ("Soporte", "#8A94A3")]


def fourteen():
    leg = "".join(f'<div style="display:inline-block;margin-right:40px;font-size:26px;font-weight:600;color:#1E2833">'
                  f'<i style="display:inline-block;width:18px;height:18px;border-radius:5px;background:{c};margin-right:10px;vertical-align:-2px"></i>{g}</div>'
                  for g, c in GROUPS)
    chips = ""
    for i, (n, code, name, g) in enumerate(PROCS):
        col, row = divmod(i, 7)
        x, y = 70 + col * 560, 200 + row * 112
        chips += (f'<div class="chip" style="position:absolute;left:{x}px;top:{y}px;width:530px;height:94px;{CARD}overflow:hidden">'
                  f'<i style="position:absolute;left:0;top:0;width:10px;height:94px;background:{GROUPS[g][1]}"></i>'
                  f'<div style="position:absolute;left:30px;top:18px;font-size:44px;font-weight:700;color:{GROUPS[g][1] if g < 2 else "#5B6572"}">{n}</div>'
                  f'<div style="position:absolute;left:110px;top:14px;font-size:22px;font-weight:600;color:#5B6572">{code}</div>'
                  f'<div style="position:absolute;left:110px;top:40px;width:410px;font-size:27px;font-weight:500;color:#1E2833;white-space:nowrap">{name}</div></div>')
    html = _bg() + f'<div class="lg" style="position:absolute;left:70px;top:120px">{leg}</div>' + chips
    return html, ["tl.fromTo('#{gid} .lg',{opacity:0},{opacity:1,duration:.3},{t}+.1);", _stagger(".chip", .3, .16, .45, "x:-30")]


def hierarchy():
    cards = [("Mapa de procesos", "14 procesos principales"), ("Proceso principal", "08_H2R  Hire to Retire"),
             ("Mapa", "H2R_06  Train & Qualify"), ("Proceso de grupo", "GR_00542_00  Plan training budget")]
    html = _bg()
    for i, (lab, tit) in enumerate(cards):
        x, y = 90 + i * 130, 140 + i * 200
        border = f"border:3px solid {RED};" if i == 3 else ""
        html += (f'<div class="hc" style="position:absolute;left:{x}px;top:{y}px;width:760px;height:136px;{CARD}{border}">'
                 f'<div style="position:absolute;left:36px;top:24px;font-size:24px;font-weight:600;color:{RED if i == 3 else "#5B6572"}">{lab}</div>'
                 f'<div style="position:absolute;left:36px;top:60px;font-size:38px;font-weight:700;color:#1E2833;white-space:nowrap">{tit}</div></div>')
        if i < 3:
            html += (f'<svg class="hl2" style="position:absolute;left:{x + 40}px;top:{y + 136}px;overflow:visible" width="100" height="64">'
                     f'<path d="M10 0 V40 H86" fill="none" stroke="#9AA3AF" stroke-width="4" stroke-linecap="round"/>'
                     f'<path d="M76 30 L88 40 L76 50" fill="none" stroke="#9AA3AF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    js = []
    for i in range(4):
        js.append(f"tl.fromTo('#{{gid}} .hc:nth-of-type({i + 2})',{{opacity:0,y:30}},{{opacity:1,y:0,duration:.5,ease:'expo.out'}},{{t}}+{.2 + i * 1.1:.2f});")
    js.append("tl.fromTo('#{gid} .hl2',{opacity:0},{opacity:1,duration:.3,stagger:1.1},{t}+.8);")
    return html, js


def two_maps():
    def card(x, title, chips, hi):
        h = (f'<div class="mc" style="position:absolute;left:{x}px;top:110px;width:520px;height:540px;{CARD}">'
             f'<div style="position:absolute;left:30px;top:26px;font-size:26px;font-weight:700;color:#1E2833">{title}</div>')
        for j, (code, name) in enumerate(chips):
            on = j == hi
            h += (f'<div style="position:absolute;left:30px;top:{96 + j * 108}px;width:460px;height:88px;border-radius:14px;'
                  f'background:{"#FDECEF" if on else "#F3F4F6"};border:{"3px solid " + RED if on else "2px solid #E5E7EB"}">'
                  f'<div style="position:absolute;left:22px;top:10px;font-size:22px;font-weight:600;color:{RED if on else "#5B6572"}">{code}</div>'
                  f'<div style="position:absolute;left:22px;top:40px;font-size:27px;font-weight:{600 if on else 500};color:#1E2833">{name}</div></div>')
        return h + "</div>"
    html = _bg()
    html += card(60, "S2P_02 Production Material (Series)",
                 [("S2P_02_GR_05_00", "Contracting (Series)"), ("S2P_02_GR_07_00", "Goods Receiving Process"),
                  ("S2P_02_GR_08_00", "Commercial Goods Receiving"), ("S2P_11", "Invoice & Pay")], 1)
    html += card(664, "P2D_03 Material Flow",
                 [("P2D_03_GR_15_00", "Goods Receiving Process"), ("P2D_03_GR_16_00", "Commercial Goods Receiving"),
                  ("P2D_03_GR_17_00", "Labeling and traceability"), ("P2D_03_GR_18_00", "Store material")], 0)
    html += ('<svg class="ln" style="position:absolute;left:0;top:0" width="1244" height="1080">'
             f'<path d="M520 362 C 560 560, 560 700, 520 800" fill="none" stroke="{RED}" stroke-width="4" stroke-dasharray="10 8"/>'
             f'<path d="M1124 254 C 1180 560, 900 720, 760 800" fill="none" stroke="{RED}" stroke-width="4" stroke-dasharray="10 8"/></svg>')
    html += (f'<div class="gr" style="position:absolute;left:322px;top:790px;width:600px;height:130px;{CARD}border:3px solid {RED}">'
             f'<div style="position:absolute;left:36px;top:22px;font-size:24px;font-weight:600;color:{RED}">El mismo proceso</div>'
             f'<div style="position:absolute;left:36px;top:58px;font-size:40px;font-weight:700;color:#1E2833">GR_00266_00</div>'
             f'<div style="position:absolute;left:330px;top:66px;font-size:28px;color:#5B6572">Goods Receiving</div></div>')
    js = [_stagger(".mc", .1, .35, .5),
          "tl.fromTo('#{gid} .ln',{opacity:0},{opacity:1,duration:.4},{t}+1.6);",
          "tl.fromTo('#{gid} .gr',{opacity:0,scale:.8},{opacity:1,scale:1,duration:.5,ease:'back.out(1.6)'},{t}+2.0);"]
    return html, js


def names():
    html = _bg() + f"""
<div class="nm" style="position:absolute;left:110px;top:210px;font-size:110px;font-weight:700;letter-spacing:-0.02em;color:#1E2833">GR_00266_00</div>
<div class="nm" style="position:absolute;left:110px;top:400px;width:1040px;height:130px;{CARD}">
  <div style="position:absolute;left:36px;top:30px;font-size:58px;font-weight:700"><span style="color:{RED}">WI_</span>GR_00266_01</div>
  <div style="position:absolute;left:660px;top:46px;font-size:32px;color:#5B6572">instrucción de trabajo</div></div>
<div class="nm" style="position:absolute;left:110px;top:560px;width:1040px;height:130px;{CARD}">
  <div style="position:absolute;left:36px;top:30px;font-size:58px;font-weight:700"><span style="color:{RED}">WI_</span>GR_00266_02</div>
  <div style="position:absolute;left:660px;top:46px;font-size:32px;color:#5B6572">otra instrucción</div></div>
<div class="nm" style="position:absolute;left:110px;top:720px;width:1040px;height:130px;{CARD}">
  <div style="position:absolute;left:36px;top:30px;font-size:58px;font-weight:700"><span style="color:{RED}">AT_</span>GR_00266_01</div>
  <div style="position:absolute;left:660px;top:46px;font-size:32px;color:#5B6572">anexo</div></div>"""
    return html, [_stagger(".nm", .1, .7, .5, "x:-40")]


def _ico(kind, color, size=64):
    p = {"flame": '<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
         "shield": '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M12 7v10M7.5 12h9" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
         "screen": '<rect x="3" y="4" width="18" height="12" rx="1.5" fill="none" stroke="#fff" stroke-width="2"/><path d="M8 20h8M12 16v4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
         "doc": '<path d="M7 3h7l4 4v14H7z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M10 12h5M10 16h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
         "list": '<path d="M5 6h14M5 12h14M5 18h9" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
         "scope": '<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="#fff"/>',
         "folder": '<path d="M3 6h6l2 2h10v11H3z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>',
         "user": '<circle cx="12" cy="8" r="4" fill="none" stroke="#fff" stroke-width="2"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6" fill="none" stroke="#fff" stroke-width="2"/>'}[kind]
    return (f'<div style="width:{size}px;height:{size}px;border-radius:{size // 4}px;background:{color};display:flex;align-items:center;justify-content:center">'
            f'<svg viewBox="0 0 24 24" width="{size * .62:.0f}" height="{size * .62:.0f}">{p}</svg></div>')


def info_grid():
    items = [("flame", "#F07A1A", "Riesgos y oportunidades", "definidos por grupo"),
             ("list", "#1E2833", "Cláusulas IATF", "requisitos relacionados"),
             ("shield", "#3E9B3E", "ISO 45001", "y otras normas aplicables"),
             ("scope", RED, "Alcance", "dónde aplica el proceso")]
    html = _bg()
    for i, (k, c, a, b) in enumerate(items):
        col, row = i % 2, i // 2
        x, y = 90 + col * 540, 230 + row * 300
        html += (f'<div class="ig" style="position:absolute;left:{x}px;top:{y}px;width:510px;height:250px;{CARD}">'
                 f'<div style="position:absolute;left:36px;top:36px">{_ico(k, c, 76)}</div>'
                 f'<div style="position:absolute;left:36px;top:136px;font-size:34px;font-weight:700;color:#1E2833">{a}</div>'
                 f'<div style="position:absolute;left:36px;top:182px;font-size:27px;color:#5B6572">{b}</div></div>')
    return html, [_stagger(".ig", .1, .3, .5)]


def icon_legend():
    items = [("flame", "#F07A1A", "Riesgos"), ("shield", "#3E9B3E", "Controles"), ("screen", "#1A6BD8", "Sistemas de TI"), ("doc", "#1A6BD8", "Documentos")]
    html = _bg() + (f'<div class="il0" style="position:absolute;left:70px;top:120px;width:1102px;height:380px;{CARD}overflow:hidden">'
                    f'<img src="assets/img/task-icons.png" style="position:absolute;left:0;top:0;width:1102px;height:380px" alt=""></div>')
    for i, (k, c, a) in enumerate(items):
        x = 70 + i * 280
        html += (f'<div class="il" style="position:absolute;left:{x}px;top:600px;width:250px;height:250px;{CARD}">'
                 f'<div style="position:absolute;left:83px;top:44px">{_ico(k, c, 84)}</div>'
                 f'<div style="position:absolute;left:0;top:162px;width:250px;text-align:center;font-size:30px;font-weight:600;color:#1E2833">{a}</div></div>')
    return html, ["tl.fromTo('#{gid} .il0',{opacity:0,y:30},{opacity:1,y:0,duration:.5,ease:'expo.out'},{t}+.1);", _stagger(".il", 1.2, .25, .45)]


def repository():
    rows = ["00_Level 0 - Process Landscape", "01_Level 1 - Main Processes", "02_Level 2 - Sub Processes",
            "03_Level 3 - Business Processes", "04_Level 4 - Work Instructions", "16_Specific Views", "20_Process Role Catalogue"]
    html = _bg() + f'<div style="position:absolute;left:90px;top:110px;width:1060px;height:860px;{CARD}">'
    html += '<div style="position:absolute;left:44px;top:36px;font-size:40px;font-weight:700;color:#1E2833">Repository · Brose Processes</div>'
    for i, r in enumerate(rows):
        html += (f'<div class="rr" style="position:absolute;left:44px;top:{124 + i * 100}px;width:970px;height:84px;border-radius:14px;background:#F7F8FA">'
                 f'<div style="position:absolute;left:18px;top:12px">{_ico("folder", "#8A94A3", 60)}</div>'
                 f'<div style="position:absolute;left:100px;top:22px;font-size:32px;font-weight:500;color:#1E2833">{r}</div></div>')
    html += "</div>"
    return html, [_stagger(".rr", .2, .14, .45, "x:-30")]


def dictionary():
    items = [("user", "#1A6BD8", "Roles de proceso"), ("doc", "#1A6BD8", "Documentos"), ("user", "#5B6572", "Usuarios"),
             ("scope", RED, "Alcances"), ("list", "#1E2833", "Objetos de proceso"), ("flame", "#F07A1A", "Riesgos"),
             ("shield", "#3E9B3E", "Controles"), ("screen", "#1A6BD8", "Sistemas de TI")]
    html = _bg() + '<div style="position:absolute;left:90px;top:110px;font-size:40px;font-weight:700;color:#1E2833">Dictionary · todas las categorías</div>'
    for i, (k, c, a) in enumerate(items):
        col, row = i % 2, i // 2
        x, y = 90 + col * 540, 200 + row * 190
        html += (f'<div class="dc" style="position:absolute;left:{x}px;top:{y}px;width:510px;height:160px;{CARD}">'
                 f'<div style="position:absolute;left:32px;top:44px">{_ico(k, c, 72)}</div>'
                 f'<div style="position:absolute;left:130px;top:58px;font-size:34px;font-weight:600;color:#1E2833">{a}</div></div>')
    return html, [_stagger(".dc", .2, .12, .45)]


def code_decode():
    html = _bg() + f"""
<div class="cd" style="position:absolute;left:90px;top:150px;width:1060px;height:200px;{CARD}">
  <div style="position:absolute;left:44px;top:34px;font-size:26px;font-weight:600;color:#5B6572">Nombre completo</div>
  <div style="position:absolute;left:44px;top:80px;font-size:52px;font-weight:700;color:#1E2833;white-space:nowrap"><span id="cd-gr" style="color:{RED}">GR</span>_<span id="cd-num">00542</span>_00 &nbsp;Plan training budget</div>
</div>
<div class="cd" style="position:absolute;left:90px;top:420px;width:510px;height:300px;{CARD}">
  <div style="position:absolute;left:44px;top:40px;font-size:96px;font-weight:700;color:{RED}">GR</div>
  <div style="position:absolute;left:44px;top:170px;width:430px;font-size:32px;line-height:1.3;color:#1E2833"><b>Proceso de grupo</b><br><span style="color:#5B6572">válido en todo Brose</span></div>
</div>
<div class="cd" style="position:absolute;left:640px;top:420px;width:510px;height:300px;{CARD}">
  <div style="position:absolute;left:44px;top:40px;font-size:96px;font-weight:700;color:#1E2833">00542</div>
  <div style="position:absolute;left:44px;top:170px;width:430px;font-size:32px;line-height:1.3;color:#1E2833"><b>Su número</b><br><span style="color:#5B6572">único para cada proceso</span></div>
</div>"""
    return html, [_stagger(".cd", .1, .5, .5)]


def plus_emphasis():
    cur = ('<svg viewBox="0 0 40 40" width="70" height="70"><path d="M6 4 L6 32 L13 25 L18 36 L23 34 L18 23 L28 23 Z" fill="#fff" '
           'stroke="#1E2833" stroke-width="2.4" stroke-linejoin="round"/></svg>')
    html = _bg() + f"""
<svg class="pe-chev" style="position:absolute;left:150px;top:200px" width="940" height="300" viewBox="0 0 940 300">
  <polygon points="0,0 860,0 940,150 860,300 0,300 80,150" fill="#D5D8DD"/>
  <text x="480" y="128" text-anchor="middle" font-family="Outfit" font-size="44" font-weight="500" fill="#2B3A4A">06_P2D_Production to</text>
  <text x="480" y="182" text-anchor="middle" font-family="Outfit" font-size="44" font-weight="500" fill="#2B3A4A">Delivery</text>
</svg>
<div class="pe-plus" style="position:absolute;left:584px;top:420px;width:72px;height:72px;border:6px dotted #1A6BD8;border-radius:8px;background:rgba(255,255,255,.6)">
  <div style="position:absolute;left:28px;top:12px;width:5px;height:36px;background:#1A6BD8;border-radius:2px"></div>
  <div style="position:absolute;left:12px;top:28px;width:36px;height:5px;background:#1A6BD8;border-radius:2px"></div>
</div>
<div class="pe-ring" style="position:absolute;left:556px;top:392px;width:128px;height:128px;border:5px solid {RED};border-radius:22px;opacity:0"></div>
<div class="pe-cur" style="position:absolute;left:0;top:0;opacity:0;filter:drop-shadow(0 4px 6px rgba(0,0,0,.3))">{cur}</div>
<div class="pe-card" style="position:absolute;left:150px;top:640px;width:940px;height:220px;{CARD}border-left:10px solid {RED}">
  <div style="position:absolute;left:44px;top:40px;font-size:54px;font-weight:700;color:#1E2833">Haz clic en el signo <span style="color:{RED}">+</span></div>
  <div style="position:absolute;left:44px;top:124px;width:860px;font-size:32px;color:#5B6572">el cuadrito azul punteado debajo del nombre: así se abre el proceso</div>
</div>"""
    js = ["tl.fromTo('#{gid} .pe-chev',{opacity:0,x:-40},{opacity:1,x:0,duration:.5,ease:'expo.out'},{t}+.1);",
          "tl.fromTo('#{gid} .pe-plus',{opacity:0,scale:.4},{opacity:1,scale:1,duration:.5,ease:'back.out(2)'},{t}+.6);",
          "tl.fromTo('#{gid} .pe-cur',{opacity:0,x:900,y:700},{opacity:1,duration:.2},{t}+1.1);",
          "tl.to('#{gid} .pe-cur',{x:618,y:452,duration:.8,ease:'power2.inOut'},{t}+1.2);",
          "tl.to('#{gid} .pe-cur',{scale:.82,duration:.08},{t}+2.1);tl.to('#{gid} .pe-cur',{scale:1,duration:.12},{t}+2.18);",
          "tl.fromTo('#{gid} .pe-ring',{opacity:0,scale:1.3},{opacity:1,scale:1,duration:.35,ease:'expo.out'},{t}+2.1);",
          "tl.fromTo('#{gid} .pe-card',{opacity:0,y:30},{opacity:1,y:0,duration:.5,ease:'expo.out'},{t}+2.4);"]
    return html, js


def info_grid6():
    items = [("flame", "#F07A1A", "Riesgos y oportunidades", "definidos por grupo"),
             ("list", "#1E2833", "Cláusulas IATF e ISO 45001", "requisitos relacionados"),
             ("scope", RED, "Alcance", "dónde aplica el procedimiento"),
             ("list", "#5B6572", "Índice", "cómo está organizado"),
             ("user", "#1A6BD8", "Actividades y responsables", "quién hace cada tarea"),
             ("doc", "#1A6BD8", "Documentos relacionados", "attachments o normas")]
    html = _bg()
    for i, (k, c, a, b) in enumerate(items):
        col, row = i % 2, i // 2
        x, y = 90 + col * 540, 160 + row * 270
        html += (f'<div class="ig" style="position:absolute;left:{x}px;top:{y}px;width:510px;height:240px;{CARD}">'
                 f'<div style="position:absolute;left:36px;top:32px">{_ico(k, c, 70)}</div>'
                 f'<div style="position:absolute;left:36px;top:124px;width:450px;font-size:32px;font-weight:700;color:#1E2833;white-space:nowrap">{a}</div>'
                 f'<div style="position:absolute;left:36px;top:170px;font-size:28px;color:#5B6572">{b}</div></div>')
    return html, [_stagger(".ig", .1, .25, .5)]


def task_icon_list():
    rows = [("Procesos antecesores o predecesores", "list", "#5B6572"), ("Transacciones de SAP para la tarea", "screen", "#1A6BD8"),
            ("Documentos de la tarea o attachments", "doc", "#E0A000"), ("Normas, CSR o regulaciones legales", "shield", "#3E9B3E")]
    html = _bg() + (f'<div class="tl0" style="position:absolute;left:70px;top:90px;width:1102px;height:380px;{CARD}overflow:hidden">'
                    f'<img src="assets/img/task-icons.png" style="position:absolute;left:0;top:0;width:1102px;height:380px" alt=""></div>')
    for i, (a, k, c) in enumerate(rows):
        html += (f'<div class="tr" style="position:absolute;left:70px;top:{520 + i * 118}px;width:1102px;height:100px;{CARD}">'
                 f'<div style="position:absolute;left:24px;top:18px">{_ico(k, c, 64)}</div>'
                 f'<div style="position:absolute;left:112px;top:30px;font-size:32px;font-weight:600;color:#1E2833">{a}</div></div>')
    return html, ["tl.fromTo('#{gid} .tl0',{opacity:0,y:30},{opacity:1,y:0,duration:.5,ease:'expo.out'},{t}+.1);", _stagger(".tr", .9, .3, .45, "x:-30")]


def page_sections():
    """The process page as one scrolling card; each section is outlined and tagged where it lives
    (1 Descripción, 2 Flujo, 3 Información crítica with its icons inside)."""
    X, W = 100, 1044
    s1 = W / 1893          # process-page scale (below native: sharp)
    s2 = W / 1651          # diagram scale
    hdr_h = round(215 * s1)
    y_hdr = 90
    y_desc = y_hdr + hdr_h + 14
    h_desc = round(491 * s1)
    y_flow = y_desc + h_desc + 24
    h_flow = round(638 * s2)
    y_info = y_flow + h_flow + 24
    items = [("flame", "#F07A1A", "Riesgos y oportunidades"), ("list", "#1E2833", "Cláusulas IATF e ISO 45001"),
             ("scope", RED, "Alcance del procedimiento"), ("list", "#5B6572", "Índice del procedimiento"),
             ("user", "#1A6BD8", "Actividades y responsables"), ("doc", "#1A6BD8", "Documentos relacionados")]
    h_info = 90 + 3 * 100
    card_h = y_info + h_info + 30 - 70

    def tag(n, ico, col, text, y):
        return (f'<div class="ps-tag" id="ps-tag{n}" style="position:absolute;left:{X + 16}px;top:{y + 14}px;height:64px;padding:0 26px 0 12px;border-radius:32px;'
                f'background:#1E2833;color:#fff;font-size:30px;font-weight:600;line-height:64px;white-space:nowrap;opacity:0;z-index:5;box-shadow:0 8px 20px rgba(0,0,0,.2)">'
                f'<span style="display:inline-block;width:44px;height:44px;border-radius:22px;background:{RED};text-align:center;line-height:44px;font-weight:700;margin-right:12px;vertical-align:1px">{n}</span>'
                f'<span style="display:inline-block;vertical-align:-12px;margin-right:12px">{_ico(ico, col, 40)}</span>{text}</div>')

    def box(n, y, h):
        return (f'<div id="ps-box{n}" style="position:absolute;left:{X - 8}px;top:{y - 8}px;width:{W + 16}px;height:{h + 16}px;'
                f'border:4px solid {RED};border-radius:14px;opacity:0;z-index:4"></div>')

    chips = ""
    for i, (k, c, a) in enumerate(items):
        col, row = i % 2, i // 2
        cx, cy = X + 20 + col * 512, y_info + 90 + row * 100
        chips += (f'<div class="ps-chip" style="position:absolute;left:{cx}px;top:{cy}px;width:492px;height:84px;border-radius:14px;background:#F7F8FA;opacity:0">'
                  f'<div style="position:absolute;left:14px;top:12px">{_ico(k, c, 60)}</div>'
                  f'<div style="position:absolute;left:90px;top:24px;font-size:28px;font-weight:600;color:#1E2833;white-space:nowrap">{a}</div></div>')

    inner = (f'<div style="position:absolute;left:{X - 20}px;top:70px;width:{W + 40}px;height:{card_h}px;{CARD}"></div>'
             f'<div style="position:absolute;left:{X}px;top:{y_hdr}px;width:{W}px;height:{hdr_h}px;overflow:hidden">'
             f'<img src="assets/img/process-page.png" style="position:absolute;left:0;top:0;width:{W}px;height:{round(887 * s1)}px" alt=""></div>'
             f'<div style="position:absolute;left:{X}px;top:{y_desc}px;width:{W}px;height:{h_desc}px;overflow:hidden">'
             f'<img src="assets/img/process-page.png" style="position:absolute;left:0;top:{-round(232 * s1)}px;width:{W}px;height:{round(887 * s1)}px" alt=""></div>'
             f'<div style="position:absolute;left:{X}px;top:{y_flow}px;width:{W}px;height:{h_flow}px;overflow:hidden">'
             f'<img src="assets/img/process-diagram.png" style="position:absolute;left:0;top:0;width:{W}px;height:{h_flow}px" alt=""></div>'
             f'<div style="position:absolute;left:{X}px;top:{y_info}px;width:{W}px;height:{h_info}px;border-radius:14px;background:#fff;border:2px solid #E5E7EB"></div>'
             + chips
             + box(1, y_desc, h_desc) + box(2, y_flow, h_flow) + box(3, y_info, h_info)
             + tag(1, "doc", "#1A6BD8", "Descripción del proceso", y_desc)
             + tag(2, "list", "#5B6572", "Flujo", y_flow)
             + tag(3, "flame", "#F07A1A", "Información crítica", y_info))
    scroll = max(0, y_info + h_info + 40 - 1060)
    html = _bg() + f'<div class="ps-scroll" style="position:absolute;left:0;top:0;width:1244px;height:{card_h + 140}px">{inner}</div>'

    def show(n, at):
        return [f"tl.fromTo('#{{gid}} #ps-box{n}',{{opacity:0,scale:1.03}},{{opacity:1,scale:1,duration:.35,ease:'expo.out'}},{{t}}+{at});",
                f"tl.fromTo('#{{gid}} #ps-tag{n}',{{opacity:0,x:-30}},{{opacity:1,x:0,duration:.45,ease:'expo.out'}},{{t}}+{at + .1:.2f});"]

    def hide(n, at):
        return [f"tl.to('#{{gid}} #ps-box{n}',{{opacity:0,duration:.2}},{{t}}+{at});"]

    js = (["tl.fromTo('#{gid} .ps-scroll',{opacity:0,y:40},{opacity:1,y:0,duration:.5,ease:'expo.out'},{t}+.1);"]
          + show(1, .7) + hide(1, 2.9) + show(2, 3.0) + hide(2, 5.2)
          + [f"tl.to('#{{gid}} .ps-scroll',{{y:{-scroll},duration:1.0,ease:'power2.inOut'}},{{t}}+5.2);"]
          + show(3, 6.2)
          + ["tl.fromTo('#{gid} .ps-chip',{opacity:0,y:16},{opacity:1,y:0,duration:.4,stagger:.18,ease:'expo.out'},{t}+6.6);"])
    return html, js


# ---- real Signavio icons only (cropped from the source screenshots); later definitions win
REAL = {"antecesor": ("ic-antecesor.png", 49, 48), "sap": ("ic-sap.png", 44, 49), "doctarea": ("ic-doc-tarea.png", 44, 49),
        "norma": ("ic-norma.png", 44, 49), "riesgo": ("ic-riesgo.png", 90, 88), "control": ("ic-control.png", 90, 88),
        "ti": ("ic-ti.png", 85, 82), "documento": ("ic-documento.png", 86, 108)}


def real_icon(key, h):
    f, w0, h0 = REAL[key]
    w = round(w0 * h / h0)
    return f'<img src="assets/img/{f}" alt="" style="display:block;width:{w}px;height:{h}px">'


def _bullet(color="#9AA3AF", size=18):
    return f'<i style="display:block;width:{size}px;height:{size}px;border-radius:{size // 2}px;background:{color}"></i>'


def task_icon_list():
    rows = [("antecesor", "Procedimientos antecesores o predecesores", (100, 160, 50, 52)),
            ("sap", "Transacciones de SAP para realizar la tarea", (287, 108, 44, 50)),
            ("doctarea", "Documentos relacionados a la tarea o attachments", (339, 108, 44, 50)),
            ("norma", "Normas, CSR o regulaciones legales", (389, 108, 44, 50))]
    X0, Y0 = 70, 90
    html = _bg() + (f'<div class="tl0" style="position:absolute;left:{X0}px;top:{Y0}px;width:1102px;height:380px;{CARD}overflow:hidden">'
                    f'<img src="assets/img/task-icons.png" style="position:absolute;left:0;top:0;width:1102px;height:380px" alt=""></div>')
    js = ["tl.fromTo('#{gid} .tl0',{opacity:0,y:30},{opacity:1,y:0,duration:.5,ease:'expo.out'},{t}+.1);"]
    for i, (k, label, (x, y, w, h)) in enumerate(rows):
        html += (f'<div id="tlr{i}" style="position:absolute;left:{X0 + x - 7}px;top:{Y0 + y - 7}px;width:{w + 14}px;height:{h + 14}px;'
                 f'border:4px solid {RED};border-radius:50%;opacity:0"></div>')
        html += (f'<div class="tr" id="tlrow{i}" style="position:absolute;left:{X0}px;top:{520 + i * 118}px;width:1102px;height:100px;{CARD}opacity:0">'
                 f'<div style="position:absolute;left:28px;top:24px">{real_icon(k, 52)}</div>'
                 f'<div style="position:absolute;left:112px;top:30px;font-size:32px;font-weight:600;color:#1E2833">{label}</div></div>')
        at = .9 + i * 1.3
        js += [f"tl.fromTo('#{{gid}} #tlrow{i}',{{opacity:0,x:-30}},{{opacity:1,x:0,duration:.45,ease:'expo.out'}},{{t}}+{at:.2f});",
               f"tl.fromTo('#{{gid}} #tlr{i}',{{opacity:0,scale:1.4}},{{opacity:1,scale:1,duration:.35,ease:'expo.out'}},{{t}}+{at:.2f});",
               f"tl.to('#{{gid}} #tlr{i}',{{opacity:0,duration:.2}},{{t}}+{at + 1.2:.2f});"]
    return html, js


def icon_legend():
    items = [("riesgo", "Riesgos"), ("control", "Controles"), ("ti", "Sistemas de TI"), ("documento", "Documentos")]
    html = _bg() + '<div style="position:absolute;left:90px;top:170px;font-size:40px;font-weight:700;color:#1E2833">Íconos del BMS y su significado</div>'
    for i, (k, a) in enumerate(items):
        col, row = i % 2, i // 2
        x, y = 90 + col * 540, 260 + row * 330
        html += (f'<div class="il" style="position:absolute;left:{x}px;top:{y}px;width:510px;height:300px;{CARD}">'
                 f'<div style="position:absolute;left:0;top:50px;width:510px;display:flex;justify-content:center">{real_icon(k, 110)}</div>'
                 f'<div style="position:absolute;left:0;top:200px;width:510px;text-align:center;font-size:36px;font-weight:600;color:#1E2833">{a}</div></div>')
    return html, [_stagger(".il", .2, .3, .45)]


def dictionary():
    items = [(None, "Roles de proceso"), ("documento", "Documentos"), (None, "Usuarios"), (None, "Alcances"),
             (None, "Objetos de proceso"), ("riesgo", "Riesgos"), ("control", "Controles"), ("ti", "Sistemas de TI")]
    html = _bg() + '<div style="position:absolute;left:90px;top:110px;font-size:40px;font-weight:700;color:#1E2833">Dictionary · categorías</div>'
    for i, (k, a) in enumerate(items):
        col, row = i % 2, i // 2
        x, y = 90 + col * 540, 200 + row * 190
        ico = real_icon(k, 64) if k else f'<div style="padding:23px">{_bullet()}</div>'
        html += (f'<div class="dc" style="position:absolute;left:{x}px;top:{y}px;width:510px;height:160px;{CARD}">'
                 f'<div style="position:absolute;left:36px;top:48px">{ico}</div>'
                 f'<div style="position:absolute;left:130px;top:58px;font-size:34px;font-weight:600;color:#1E2833">{a}</div></div>')
    return html, [_stagger(".dc", .2, .12, .45)]


_page_sections_v1 = page_sections


def page_sections():
    html, js = _page_sections_v1()
    import re as _re
    # section tags: number only, no drawn icons
    html = _re.sub(r'<span style="display:inline-block;vertical-align:-12px;margin-right:12px">.*?</div></span>', '', html, flags=_re.S)
    # info chips: real icon for risks and documents, a plain bullet for the rest
    repl = {"Riesgos y oportunidades": real_icon("riesgo", 56), "Documentos relacionados": real_icon("documento", 56)}

    def chip(m):
        label = m.group(2)
        ico = repl.get(label, f'<div style="padding:19px">{_bullet(RED if label.startswith("Cláusulas") else "#9AA3AF")}</div>')
        return f'<div style="position:absolute;left:14px;top:14px">{ico}</div>' + m.group(1)
    html = _re.sub(r'<div style="position:absolute;left:14px;top:12px">.*?</div></div>(<div style="position:absolute;left:90px;top:24px;[^>]*>([^<]*)</div>)',
                   chip, html, flags=_re.S)
    return html, js


def page_sections():
    """Section icons back (as the approved version); risks and documents use the real Signavio icons."""
    import re as _re
    html, js = _page_sections_v1()
    repl = {"Riesgos y oportunidades": real_icon("riesgo", 58), "Documentos relacionados": real_icon("documento", 58)}

    def chip(m):
        label = m.group(2)
        if label in repl:
            return f'<div style="position:absolute;left:14px;top:13px">{repl[label]}</div>' + m.group(1)
        return m.group(0)
    html = _re.sub(r'<div style="position:absolute;left:14px;top:12px">(?:(?!<div class="ps-chip").)*?</div></div>(<div style="position:absolute;left:90px;top:24px;[^>]*>([^<]*)</div>)',
                   chip, html, flags=_re.S)
    return html, js
