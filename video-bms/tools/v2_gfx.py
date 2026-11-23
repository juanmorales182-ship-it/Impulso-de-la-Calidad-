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
