#!/usr/bin/env python3
"""Generates the scene files for the BMS film. Output: video-bms/film/compositions/*.html"""
import os, sys, json

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

VW, VH, OX, OY = 1664, 876, 128, 132

CSS = """
#root{position:absolute;inset:0;font-family:'Outfit',sans-serif;color:#1E2833;}
.win{position:absolute;left:128px;top:72px;width:1664px;height:936px;border-radius:18px;background:#fff;
 box-shadow:0 30px 80px rgba(20,30,45,.18),0 2px 6px rgba(20,30,45,.08);overflow:hidden;}
.bar{position:absolute;left:0;top:0;width:1664px;height:60px;background:#F5F6F8;border-bottom:1px solid #E2E5EA;}
.nav{position:absolute;top:18px;left:24px;width:110px;height:24px;}
.url{position:absolute;left:150px;top:11px;width:1180px;height:38px;border-radius:19px;background:#fff;border:1px solid #DFE3E8;
 font-family:'Inter',sans-serif;font-size:19px;color:#3A4450;line-height:36px;padding-left:46px;white-space:nowrap;overflow:hidden;}
.url svg{position:absolute;left:16px;top:9px;}
.url .host{color:#1E2833;}
.vp{position:absolute;left:0;top:60px;width:1664px;height:876px;overflow:hidden;background:#fff;}
.page{position:absolute;left:0;top:0;transform-origin:0 0;}
.shot{position:absolute;left:0;display:block;}
.hl{position:absolute;border-style:solid;border-color:#CE003A;border-radius:10px;opacity:0;box-sizing:border-box;}
.cover{position:absolute;background:#fff;}
.tip{position:absolute;background:#1E2833;color:#fff;border-radius:20px;padding:22px 30px;font-size:31px;line-height:1.3;
 font-weight:500;max-width:620px;box-shadow:0 18px 40px rgba(15,25,40,.28);opacity:0;transform-origin:50% 50%;}
.tip b{font-weight:700;text-decoration:underline;text-decoration-color:#CE003A;text-decoration-thickness:4px;text-underline-offset:6px;}
.cursor{position:absolute;left:0;top:0;width:40px;height:40px;opacity:0;transform-origin:6px 4px;z-index:50;
 filter:drop-shadow(0 3px 4px rgba(0,0,0,.3));}
.typed{position:absolute;font-family:'Inter',sans-serif;white-space:nowrap;}
.typed span{opacity:0;}
"""

NAV = ('<svg class="nav" viewBox="0 0 110 24" fill="none" stroke="#6B7480" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
       '<path d="M14 4 6 12l8 8M6 12h16"/><path d="M48 4l8 8-8 8M56 12H40"/>'
       '<path d="M100 7a8 8 0 1 0 2 7"/><path d="M101 2v6h-6"/></svg>')
LOCK = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7480" stroke-width="2.4" stroke-linecap="round">'
        '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>')
CURSOR = ('<svg viewBox="0 0 40 40"><path d="M6 4 L6 32 L13 25 L18 36 L23 34 L18 23 L28 23 Z" fill="#fff" stroke="#1E2833" '
          'stroke-width="2.4" stroke-linejoin="round"/></svg>')

LIB = """
const VW=1664,VH=876,OX=128,OY=132;
function camState(W,H,s,z,fx,fy){const sc=s*z;let x=VW/2-fx*sc,y=VH/2-fy*sc;
 x=Math.min(0,Math.max(VW-W*sc,x));y=Math.min(0,Math.max(Math.min(0,VH-H*sc),y));
 if(W*sc<VW)x=(VW-W*sc)/2;return{x:x,y:y,scale:sc};}
function scr(c,px,py){return{x:OX+c.x+px*c.scale,y:OY+c.y+py*c.scale};}
function cam(tl,el,c,t,d,ease){if(!d){tl.set(el,{x:c.x,y:c.y,scale:c.scale},t);}else{tl.to(el,{x:c.x,y:c.y,scale:c.scale,duration:d,ease:ease||'power2.inOut'},t);}}
function tipIn(tl,s,t){tl.fromTo(s,{opacity:0,filter:'blur(8px)',scale:.96},{opacity:1,filter:'blur(0px)',scale:1,duration:.25,ease:'power4.out'},t);}
function tipOut(tl,s,t){tl.to(s,{opacity:0,filter:'blur(8px)',duration:.15,ease:'power2.in'},t);}
function boxIn(tl,s,t){tl.fromTo(s,{opacity:0,scale:1.06},{opacity:1,scale:1,duration:.3,ease:'expo.out'},t);}
function boxOut(tl,s,t){tl.to(s,{opacity:0,duration:.15,ease:'power1.in'},t);}
function curShow(tl,s,p,t){tl.fromTo(s,{opacity:0,x:p.x-6,y:p.y-4},{opacity:1,duration:.2,ease:'power1.out'},t);}
function curTo(tl,s,p,t,d){tl.to(s,{x:p.x-6,y:p.y-4,duration:d||.6,ease:'power2.inOut'},t);}
function curHide(tl,s,t){tl.to(s,{opacity:0,duration:.15},t);}
function click(tl,s,t){tl.to(s,{scale:.82,duration:.08,ease:'power2.out'},t);tl.to(s,{scale:1,duration:.12,ease:'power2.out'},t+.08);}
function typeIn(tl,sel,t,step){document.querySelectorAll(sel+' span').forEach(function(e,i){tl.set(e,{opacity:1},t+i*step);});}
function pageIn(tl,s,t){tl.fromTo(s,{opacity:0,filter:'blur(8px)'},{opacity:1,filter:'blur(0px)',duration:.2,ease:'power2.out'},t);}
function pageOut(tl,s,t){tl.to(s,{opacity:0,filter:'blur(8px)',duration:.15,ease:'power2.in'},t);}
"""


def browser(p, url_html, vp_inner, extra_win=""):
    return (f'<div class="win" id="{p}-win">'
            f'<div class="bar">{NAV}<div class="url" data-layout-ignore>{LOCK}{url_html}</div></div>'
            f'<div class="vp" id="{p}-vp">{vp_inner}</div>{extra_win}</div>')


def page(pid, img, W, H, crop=0, inner="", extra_style=""):
    return (f'<div class="page" id="{pid}" style="width:{W}px;height:{H - crop}px;{extra_style}">'
            f'<img class="shot" src="assets/img/{img}" style="top:{-crop}px;width:{W}px;height:{H}px" alt="">{inner}</div>')


def hl(i, x, y, w, h, bw):
    return f'<div class="hl" id="{i}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-width:{bw}px"></div>'


def tip(i, html, left, top, maxw=620):
    return f'<div class="tip" data-hold id="{i}" style="left:{left}px;top:{top}px;max-width:{maxw}px">{html}</div>'


def typed(i, text, x, y, size, color="#1E2833"):
    sp = "".join(f"<span>{c}</span>" for c in text)
    return f'<div class="typed" data-layout-ignore id="{i}" style="left:{x}px;top:{y}px;font-size:{size}px;color:{color}">{sp}</div>'


def cursor(i):
    return f'<div class="cursor" id="{i}">{CURSOR}</div>'


def url(host, path):
    return f'<span class="host">{host}</span>{path}'


def scene(cid, dur, body, js, extra_css=""):
    html = f"""<template>
  <style>{CSS}{extra_css}</style>
  <div id="root" data-composition-id="{cid}" data-width="1920" data-height="1080" data-duration="{dur}">
{body}
  </div>
  <script>
  (function(){{
{LIB}
    const tl = gsap.timeline({{ paused: true }});
{js}
    window.__timelines["{cid}"] = tl;
  }})();
  </script>
</template>
"""
    with open(os.path.join(OUT, f"{cid}.html"), "w") as f:
        f.write(html)


# ---------------------------------------------------------------- S1 acceso
W, H, C = 1637, 791, 41
s = VW / W
star = ('<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" '
        'fill="FILL" stroke="STROKE" stroke-width="1.6" stroke-linejoin="round"/></svg>')
inner = (
    '<div class="cover" style="left:100px;top:186px;width:1160px;height:30px"></div>'
    + typed("acc-q", "SIGNAVIO", 115, 189, 16)
    + '<div class="cover" id="acc-res" style="left:60px;top:262px;width:880px;height:420px"></div>'
    + '<div class="cover" style="left:862px;top:282px;width:30px;height:30px"></div>'
    + f'<div id="acc-star0" style="position:absolute;left:866px;top:286px;width:22px;height:22px">{star.replace("FILL","none").replace("STROKE","#9AA1AB")}</div>'
    + f'<div id="acc-star1" style="position:absolute;left:864px;top:284px;width:26px;height:26px;opacity:0">{star.replace("FILL","#F5B301").replace("STROKE","#E0A000")}</div>'
    + hl("acc-hl-card", 494, 270, 408, 329, 3)
    + hl("acc-hl-link", 502, 368, 136, 30, 2.5)
)
body = (
    '<div id="acc-hook" style="position:absolute;left:200px;top:300px;font-weight:700;font-size:156px;line-height:1.08;letter-spacing:-0.02em">'
    '<div><span class="w">¿Dónde</span> <span class="w">encuentro</span></div>'
    '<div><span class="w">mi</span> <span class="w" id="acc-hook-key" style="color:#1E2833">proceso?</span></div></div>'
    + browser("acc", url("brosecloud.sharepoint.com", "/sites/bbc-appregister"), page("acc-page", "app-register-bms.png", W, H, C, inner))
    + tip("acc-t1", "Entra a la BBC, abre <b>App Register</b> y busca «Signavio»", 1060, 560, 600)
    + tip("acc-t2", "Marca la <b>estrella</b> para tenerlo siempre en tus favoritos", 150, 640, 520)
    + tip("acc-t3", "Clic en <b>Start Signavio</b>", 150, 640, 520)
    + cursor("acc-cur")
)
js = f"""
    const W={W},H={H - C},s={s};
    const c0=camState(W,H,s,1,W/2,0), c1=camState(W,H,s,1.35,698,434), c2=camState(W,H,s,4,570,383);
    // hook
    tl.to('#acc-hook-key',{{color:'#CE003A',duration:.25,ease:'power1.out'}},.9);
    tl.to('#acc-hook',{{opacity:0,filter:'blur(10px)',duration:.22,ease:'power2.in'}},2.45);
    tl.fromTo('#acc-win',{{y:1000,scale:.96}},{{y:0,scale:1,duration:.95,ease:'expo.out'}},2.4);
    cam(tl,'#acc-page',c0,0);
    // search
    tipIn(tl,'#acc-t1',3.4);
    typeIn(tl,'#acc-q',4.0,.1);
    const arrow=scr(c0,1327,200);
    curShow(tl,'#acc-cur',scr(c0,1000,520),4.3);
    curTo(tl,'#acc-cur',arrow,4.9,.6);
    click(tl,'#acc-cur',5.7);
    tl.to('#acc-res',{{opacity:0,duration:.25,ease:'power1.out'}},5.95);
    tipOut(tl,'#acc-t1',7.1);
    // star
    cam(tl,'#acc-page',c1,6.5,.9);
    boxIn(tl,'#acc-hl-card',7.3);
    tipIn(tl,'#acc-t2',7.35);
    curTo(tl,'#acc-cur',scr(c1,877,297),7.6,.7);
    click(tl,'#acc-cur',8.5);
    tl.set('#acc-star0',{{opacity:0}},8.55);
    tl.fromTo('#acc-star1',{{opacity:0,scale:.3}},{{opacity:1,scale:1,duration:.45,ease:'back.out(2.2)'}},8.55);
    tipOut(tl,'#acc-t2',10.8);
    boxOut(tl,'#acc-hl-card',10.8);
    // start signavio
    tipIn(tl,'#acc-t3',11.0);
    boxIn(tl,'#acc-hl-link',11.1);
    curTo(tl,'#acc-cur',scr(c1,582,383),11.0,.7);
    click(tl,'#acc-cur',12.9);
    tipOut(tl,'#acc-t3',13.25);
    curHide(tl,'#acc-cur',13.1);
    cam(tl,'#acc-page',c2,13.2,.5,'power3.in');
    tl.to('#acc-page',{{opacity:0,filter:'blur(14px)',duration:.3,ease:'power3.in'}},13.4);
"""
scene("acceso", 13.8, body, js)

# ---------------------------------------------------------------- S2 inicio
W, H, C = 1914, 1095, 32
s = VW / W
inner = (
    '<div class="cover" style="left:1428px;top:12px;width:200px;height:28px"></div>'
    + typed("ini-q", "GR_00168", 1434, 15, 15)
    + hl("ini-hl-mgmt", 302, 396, 892, 151, 3)
    + hl("ini-hl-real", 302, 545, 892, 150, 3)
    + hl("ini-hl-supp", 302, 693, 892, 380, 3)
    + hl("ini-hl-tool", 190, 280, 1490, 92, 3.5)
    + hl("ini-hl-views", 1338, 396, 424, 380, 3.5)
    + hl("ini-hl-search", 1300, 6, 364, 42, 2)
)
body = (
    browser("ini", url("editor.signavio.com", "/p/hub/home"),
            '<div id="ini-load" style="position:absolute;inset:0;background:#F6F0F6">'
            '<div class="dot" style="position:absolute;left:806px;top:430px;width:14px;height:14px;border-radius:7px;background:#1A6BD8"></div>'
            '<div class="dot" style="position:absolute;left:826px;top:430px;width:14px;height:14px;border-radius:7px;background:#1A6BD8"></div>'
            '<div class="dot" style="position:absolute;left:846px;top:430px;width:14px;height:14px;border-radius:7px;background:#1A6BD8"></div></div>'
            + page("ini-page", "signavio-home.png", W, H, C, inner))
    + tip("ini-t1", "Tu página de inicio: el <b>mapa de procesos</b> de Brose", 1150, 150, 600)
    + tip("ini-t2", "<b>Gestión</b>: definen y controlan nuestro negocio", 1250, 260, 520)
    + tip("ini-t3", "<b>Realización</b>: generan el volumen de negocio", 1250, 430, 520)
    + tip("ini-t4", "<b>Soporte</b>: hacen que el negocio funcione sin tropiezos", 1250, 600, 520)
    + '<div class="tip" id="ini-14" style="left:1290px;top:300px;padding:30px 40px 34px;max-width:520px">'
      '<div style="font-size:190px;font-weight:700;line-height:.95;letter-spacing:-0.03em">14</div>'
      '<div style="font-size:44px;font-weight:600;line-height:1.1">procesos principales</div>'
      '<div style="font-size:29px;font-weight:400;margin-top:12px;opacity:.85">agrupan todos los procesos de Brose</div></div>'
    + tip("ini-t5", "<b>Accesos rápidos</b>: cockpit, capacitaciones, manual, matriz y roles", 300, 640, 640)
    + tip("ini-t6", "<b>Vistas específicas</b>: sistemas de gestión, temas y tu planta", 260, 640, 640)
    + tip("ini-t7", "Busca por <b>nombre</b>, <b>número</b> de proceso o <b>cláusula IATF</b>", 980, 480, 640)
    + cursor("ini-cur")
)
js = f"""
    const W={W},H={H - C},s={s};
    const c0=camState(W,H,s,1,W/2,0), c1=camState(W,H,s,1.22,760,700), c2=camState(W,H,s,1.8,1480,40);
    // loading
    tl.fromTo('#ini-load .dot',{{scale:.6}},{{scale:1.25,duration:.18,stagger:.09,ease:'power1.inOut',yoyo:true,repeat:1}},0);
    cam(tl,'#ini-page',c0,0);
    pageIn(tl,'#ini-page',.55);
    tl.set('#ini-load',{{opacity:0}},.8);
    tipIn(tl,'#ini-t1',1.0);
    tipOut(tl,'#ini-t1',3.85);
    cam(tl,'#ini-page',c1,3.0,1.0);
    boxIn(tl,'#ini-hl-mgmt',4.0); tipIn(tl,'#ini-t2',4.05); boxOut(tl,'#ini-hl-mgmt',6.45); tipOut(tl,'#ini-t2',6.45);
    boxIn(tl,'#ini-hl-real',6.6); tipIn(tl,'#ini-t3',6.65); boxOut(tl,'#ini-hl-real',9.05); tipOut(tl,'#ini-t3',9.05);
    boxIn(tl,'#ini-hl-supp',9.2); tipIn(tl,'#ini-t4',9.25); boxOut(tl,'#ini-hl-supp',12.05); tipOut(tl,'#ini-t4',12.05);
    cam(tl,'#ini-page',c0,12.0,.9);
    tl.fromTo('#ini-14',{{opacity:0,scale:.7}},{{opacity:1,scale:1,duration:.55,ease:'back.out(1.6)'}},12.7);
    tl.to('#ini-14',{{opacity:0,filter:'blur(8px)',duration:.18,ease:'power2.in'}},15.4);
    boxIn(tl,'#ini-hl-tool',15.6); tipIn(tl,'#ini-t5',15.65); boxOut(tl,'#ini-hl-tool',18.65); tipOut(tl,'#ini-t5',18.65);
    boxIn(tl,'#ini-hl-views',18.8); tipIn(tl,'#ini-t6',18.85); boxOut(tl,'#ini-hl-views',21.6); tipOut(tl,'#ini-t6',21.6);
    // search (c2 applies from 22.6)
    cam(tl,'#ini-page',c2,21.7,.9);
    tipIn(tl,'#ini-t7',22.3);
    boxIn(tl,'#ini-hl-search',22.6);
    curShow(tl,'#ini-cur',scr(c2,1300,250),22.4);
    curTo(tl,'#ini-cur',scr(c2,1520,26),22.6,.6);
    click(tl,'#ini-cur',23.3);
    typeIn(tl,'#ini-q',23.6,.1);
    curTo(tl,'#ini-cur',scr(c2,1645,26),24.6,.5);
    click(tl,'#ini-cur',25.3);
    tipOut(tl,'#ini-t7',25.6); curHide(tl,'#ini-cur',25.6);
    pageOut(tl,'#ini-page',25.8);
"""
scene("inicio", 26.0, body, js)

# ---------------------------------------------------------------- S3 busqueda
W, H = 1895, 778
s = VW / W
inner = hl("bus-hl", 428, 478, 1410, 108, 3)
body = (
    browser("bus", url("editor.signavio.com", "/p/hub/search?q=GR_00168"), page("bus-page", "search-results.png", W, H, 0, inner))
    + tip("bus-t1", "Aparecen los <b>procesos (GR)</b> y sus <b>instrucciones de trabajo (WI)</b>", 1100, 780, 640)
    + cursor("bus-cur")
)
js = f"""
    const W={W},H={H},s={s};
    const c0=camState(W,H,s,1,W/2,0), c1=camState(W,H,s,1.28,900,470);
    cam(tl,'#bus-page',c0,0);
    pageIn(tl,'#bus-page',0);
    cam(tl,'#bus-page',c1,.3,.8);
    boxIn(tl,'#bus-hl',1.1);
    tipIn(tl,'#bus-t1',1.15);
    curShow(tl,'#bus-cur',scr(c1,1200,700),3.2);
    curTo(tl,'#bus-cur',scr(c1,700,505),3.3,.7);
    click(tl,'#bus-cur',4.6);
    tipOut(tl,'#bus-t1',4.8); curHide(tl,'#bus-cur',4.8);
    pageOut(tl,'#bus-page',4.9);
"""
scene("busqueda", 5.1, body, js)

# ---------------------------------------------------------------- S4 proceso
W, H = 1893, 887
s = VW / W
inner = (hl("pro-hl-path", 114, 72, 838, 30, 2)
         + hl("pro-hl-code", 115, 107, 162, 40, 2)
         + hl("pro-hl-title", 115, 107, 455, 40, 2)
         + hl("pro-hl-desc", 116, 232, 1731, 491, 3.5))
body = (
    browser("pro", url("editor.signavio.com", "/p/hub/model/GR_00168_00"), page("pro-page", "process-page.png", W, H, 0, inner))
    + tip("pro-t1", "La <b>ruta</b> te dice dónde vive el proceso", 300, 330, 560)
    + tip("pro-t2", "<b>GR</b> = proceso de grupo, válido en todo Brose", 300, 330, 560)
    + tip("pro-t3", "Puede aparecer en varios mapas, pero <b>su nombre no cambia</b>", 300, 330, 600)
    + tip("pro-t4", "La <b>descripción</b>: qué hace el proceso y qué normas aplica", 1120, 700, 600)
)
js = f"""
    const W={W},H={H},s={s};
    const c0=camState(W,H,s,1,W/2,0), c1=camState(W,H,s,1.6,560,110), c2=camState(W,H,s,1,W/2,400);
    cam(tl,'#pro-page',c0,0);
    pageIn(tl,'#pro-page',0);
    cam(tl,'#pro-page',c1,.3,.9);
    boxIn(tl,'#pro-hl-path',1.1); tipIn(tl,'#pro-t1',1.15);
    boxOut(tl,'#pro-hl-path',4.0); tipOut(tl,'#pro-t1',4.0);
    boxIn(tl,'#pro-hl-code',4.2); tipIn(tl,'#pro-t2',4.25);
    boxOut(tl,'#pro-hl-code',7.4); tipOut(tl,'#pro-t2',7.4);
    boxIn(tl,'#pro-hl-title',7.55); tipIn(tl,'#pro-t3',7.6);
    boxOut(tl,'#pro-hl-title',10.7); tipOut(tl,'#pro-t3',10.7);
    cam(tl,'#pro-page',c2,10.7,.9);
    boxIn(tl,'#pro-hl-desc',11.5); tipIn(tl,'#pro-t4',11.55);
    boxOut(tl,'#pro-hl-desc',15.0); tipOut(tl,'#pro-t4',15.0);
    tl.to('#pro-page',{{y:c2.y-520,duration:.55,ease:'power2.in'}},15.15);
"""
scene("proceso", 15.7, body, js)

# ---------------------------------------------------------------- S5 diagrama
W, H = 1651, 638
s = VW / W
W2, H2 = 1102, 380
z2 = 1.45
x2 = (VW - W2 * z2) / 2
y2 = (VH - H2 * z2) / 2
body = (
    browser("dia", url("editor.signavio.com", "/p/hub/model/GR_00168_00"),
            page("dia-page", "process-diagram.png", W, H, 0)
            + f'<div class="page" id="dia-icons" style="width:{W2}px;height:{H2}px;opacity:0">'
              f'<img class="shot" src="assets/img/task-icons.png" style="top:0;width:{W2}px;height:{H2}px" alt="">'
            + hl("dia-hl", 272, 94, 440, 76, 3) + '</div>')
    + tip("dia-t1", "El <b>flujo</b>: quién hace qué y en qué orden", 200, 820, 560)
    + tip("dia-t2", "Los <b>íconos</b> de cada tarea abren transacciones SAP, documentos y normas", 1050, 810, 640)
)
js = f"""
    const W={W},H={H},s={s};
    const yc=({VH}-H*s)/2;
    tl.fromTo('#dia-page',{{x:0,y:yc+620,scale:s}},{{y:yc,duration:.6,ease:'power2.out'}},0);
    tipIn(tl,'#dia-t1',.7);
    tipOut(tl,'#dia-t1',4.0);
    tl.to('#dia-page',{{scale:s*1.6,x:-520,y:yc-260,opacity:0,filter:'blur(10px)',duration:.5,ease:'power3.in'}},4.0);
    tl.fromTo('#dia-icons',{{x:{x2 + 140},y:{y2 + 60},scale:{z2 * 0.8},opacity:0,filter:'blur(10px)'}},
      {{x:{x2},y:{y2},scale:{z2},opacity:1,filter:'blur(0px)',duration:.55,ease:'expo.out'}},4.35);
    boxIn(tl,'#dia-hl',5.0); tipIn(tl,'#dia-t2',5.05);
    tipOut(tl,'#dia-t2',9.0); boxOut(tl,'#dia-hl',9.0);
    pageOut(tl,'#dia-icons',9.1);
"""
scene("diagrama", 9.3, body, js)

# ---------------------------------------------------------------- S6 favoritos
W, H = 1893, 887
s = VW / W
W2, H2 = 1898, 1040
s2 = VW / W2
inner = (f'<div id="fav-star1" style="position:absolute;left:1639px;top:107px;width:26px;height:26px;opacity:0">'
         f'{star.replace("FILL", "#F5B301").replace("STROKE", "#E0A000")}</div>'
         + hl("fav-hl-star", 1632, 100, 40, 40, 2)
         + hl("fav-hl-side", 14, 144, 38, 36, 2))
body = (
    browser("fav", '<span id="fav-u1">' + url("editor.signavio.com", "/p/hub/model/GR_00168_00") + '</span>'
            '<span id="fav-u2" style="position:absolute;left:46px;top:0;opacity:0">' + url("editor.signavio.com", "/p/hub/recent") + '</span>',
            page("fav-page", "process-page.png", W, H, 0, inner)
            + page("fav-rec", "recent.png", W2, H2, 0, "", "opacity:0"))
    + tip("fav-t1", "¿Lo usas seguido? Márcalo con la <b>estrella</b>", 1060, 560, 560)
    + tip("fav-t2", "Y queda guardado en tus <b>Favoritos</b>", 330, 600, 520)
    + tip("fav-t3", "En <b>Recientes</b> vuelves a lo último que abriste", 190, 560, 470)
    + cursor("fav-cur")
)
js = f"""
    const W={W},H={H},s={s},W2={W2},H2={H2},s2={s2};
    const c1=camState(W,H,s,1.8,1500,140), c2=camState(W,H,s,1.8,200,200), r1=camState(W2,H2,s2,1.15,300,200);
    cam(tl,'#fav-page',c1,0);
    pageIn(tl,'#fav-page',0);
    tipIn(tl,'#fav-t1',.35);
    curShow(tl,'#fav-cur',scr(c1,1400,400),.6);
    curTo(tl,'#fav-cur',scr(c1,1652,121),.8,.7);
    click(tl,'#fav-cur',1.7);
    tl.fromTo('#fav-star1',{{opacity:0,scale:.3}},{{opacity:1,scale:1,duration:.45,ease:'back.out(2.2)'}},1.75);
    boxIn(tl,'#fav-hl-star',1.75);
    tipOut(tl,'#fav-t1',3.6); boxOut(tl,'#fav-hl-star',3.6); curHide(tl,'#fav-cur',3.6);
    cam(tl,'#fav-page',c2,3.7,.9);
    boxIn(tl,'#fav-hl-side',4.6); tipIn(tl,'#fav-t2',4.65);
    tipOut(tl,'#fav-t2',7.2); boxOut(tl,'#fav-hl-side',7.2);
    pageOut(tl,'#fav-page',7.3);
    tl.set('#fav-u1',{{opacity:0}},7.4); tl.set('#fav-u2',{{opacity:1}},7.4);
    cam(tl,'#fav-rec',r1,0);
    pageIn(tl,'#fav-rec',7.45);
    tipIn(tl,'#fav-t3',7.75);
    tipOut(tl,'#fav-t3',10.9);
    pageOut(tl,'#fav-rec',11.0);
"""
scene("favoritos", 11.2, body, js)

# ---------------------------------------------------------------- S7 portal
W, H = 1858, 1050
s = VW / W
inner = hl("por-hl", 276, 728, 1340, 255, 3.5)
body = (
    browser("por", url("brosecloud.sharepoint.com", "/sites/bms/knowledge-portal"), page("por-page", "knowledge-portal.png", W, H, 0, inner))
    + tip("por-t1", "¿Quieres saber más? Visita el <b>BMS Knowledge Portal</b>", 1100, 230, 600)
    + tip("por-t2", "Guías paso a paso para <b>navegar</b> y <b>leer procesos</b>", 1100, 200, 600)
)
js = f"""
    const W={W},H={H},s={s};
    const c0=camState(W,H,s,1,W/2,0), c1=camState(W,H,s,1,W/2,H);
    cam(tl,'#por-page',c0,0);
    pageIn(tl,'#por-page',0);
    tipIn(tl,'#por-t1',.4);
    tipOut(tl,'#por-t1',3.5);
    cam(tl,'#por-page',c1,3.4,.9);
    boxIn(tl,'#por-hl',4.3); tipIn(tl,'#por-t2',4.35);
    tipOut(tl,'#por-t2',7.6);
"""
scene("portal", 7.8, body, js)

# ---------------------------------------------------------------- S8 cierre
W, H = 1858, 1050
s = VW / W
inner = hl("cie-hl", 276, 728, 1340, 255, 3.5)
body = (
    browser("cie", url("brosecloud.sharepoint.com", "/sites/bms/knowledge-portal"), page("cie-page", "knowledge-portal.png", W, H, 0, inner))
    + '<div id="cie-claim" style="position:absolute;left:200px;top:360px;font-weight:700;font-size:132px;line-height:1.05;letter-spacing:-0.025em">'
      '<div><span class="w">Tu</span> <span class="w">proceso,</span></div>'
      '<div style="color:#CE003A"><span class="w">a</span> <span class="w">un</span> <span class="w">clic.</span></div></div>'
    + '<img id="cie-logo" src="assets/img/brose-logo.png" alt="Brose" style="position:absolute;left:560px;top:362px;width:800px;height:281px">'
    + '<div id="cie-sub" style="position:absolute;left:560px;top:700px;width:800px;text-align:center;font-size:40px;font-weight:500;color:#5B6572">'
      '<span class="w">Brose</span> <span class="w">Management</span> <span class="w">System</span></div>'
)
js = f"""
    const W={W},H={H},s={s};
    const c1=camState(W,H,s,1,W/2,H);
    cam(tl,'#cie-page',c1,0);
    tl.set('#cie-hl',{{opacity:1}},0);
    tl.to('#cie-hl',{{opacity:0,duration:.15}},.05);
    tl.fromTo('#cie-win',{{y:0,scale:1,opacity:1}},{{y:760,scale:.82,opacity:0,duration:.7,ease:'power3.in'}},.2);
    tl.fromTo('#cie-claim .w',{{opacity:0}},{{opacity:1,duration:.12,stagger:.12,ease:'power1.out'}},.75);
    tl.fromTo('#cie-claim .w',{{color:'#B9C0C9'}},{{color:(i,e)=>e.parentNode.style.color?'#CE003A':'#1E2833',duration:.25,stagger:.12,ease:'power1.out'}},.85);
    tl.to('#cie-claim',{{opacity:0,filter:'blur(12px)',duration:.25,ease:'power2.in'}},3.9);
    tl.fromTo('#cie-logo',{{clipPath:'inset(0% 100% 0% 0%)',opacity:1}},{{clipPath:'inset(0% 0% 0% 0%)',duration:.85,ease:'power3.inOut'}},4.2);
    tl.fromTo('#cie-sub .w',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.13,stagger:.09,ease:'power2.out'}},5.1);
"""
scene("cierre", 8.6, body, js)
print("ok")
