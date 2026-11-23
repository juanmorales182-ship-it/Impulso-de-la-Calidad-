"""Small authoring engine for the 'BMS en un clic' series.

Each episode is a list of scenes. A browser scene shows one real screenshot inside a
browser window and runs steps in order (camera moves, highlights with a help bubble,
cursor clicks, typing). Timing comes from the text length, so copy edits re-time the
scene. Output: one HyperFrames project per episode.
"""
import os, json, math, shutil

VW, VH, OX, OY = 1664, 876, 128, 132
FPS = 30
FR = 1 / FPS

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
.vp{position:absolute;left:0;top:60px;width:1664px;height:876px;overflow:hidden;}
.page{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;}
.shot{position:absolute;left:0;display:block;}
.hl{position:absolute;border-style:solid;border-color:#CE003A;border-radius:10px;opacity:0;box-sizing:border-box;}
.cover{position:absolute;background:#fff;}
.tip{position:absolute;background:#1E2833;color:#fff;border-radius:20px;padding:22px 30px;font-size:31px;line-height:1.3;
 font-weight:500;max-width:620px;box-shadow:0 18px 40px rgba(15,25,40,.28);opacity:0;transform-origin:50% 50%;z-index:40;}
.tip b{font-weight:700;text-decoration:underline;text-decoration-color:#CE003A;text-decoration-thickness:4px;text-underline-offset:6px;}
.cursor{position:absolute;left:0;top:0;width:40px;height:40px;opacity:0;transform-origin:6px 4px;z-index:50;
 filter:drop-shadow(0 3px 4px rgba(0,0,0,.3));}
.typed{position:absolute;font-family:'Inter',sans-serif;white-space:nowrap;}
.typed span{opacity:0;}
.w{display:inline-block;}
"""

NAV = ('<svg class="nav" viewBox="0 0 110 24" fill="none" stroke="#6B7480" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
       '<path d="M14 4 6 12l8 8M6 12h16"/><path d="M48 4l8 8-8 8M56 12H40"/>'
       '<path d="M100 7a8 8 0 1 0 2 7"/><path d="M101 2v6h-6"/></svg>')
LOCK = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7480" stroke-width="2.4" stroke-linecap="round">'
        '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>')
CURSOR = ('<svg viewBox="0 0 40 40"><path d="M6 4 L6 32 L13 25 L18 36 L23 34 L18 23 L28 23 Z" fill="#fff" stroke="#1E2833" '
          'stroke-width="2.4" stroke-linejoin="round"/></svg>')
STAR = ('<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" '
        'fill="#F5B301" stroke="#E0A000" stroke-width="1.6" stroke-linejoin="round"/></svg>')


def words(html):
    import re
    return len(re.sub(r"<[^>]+>", " ", html).split())


def read_time(html):
    return max(2.4, 0.5 + 0.3 * words(html)) + 0.3


def tip_size(html):
    import re
    txt = re.sub(r"<[^>]+>", "", html)
    w = min(620, len(txt) * 15.5 + 60)
    lines = math.ceil(len(txt) * 15.5 / 560)
    return w, 44 + lines * 41


class Browser:
    def __init__(self, sid, img, W, H, crop=0, url=("editor.signavio.com", "/p/hub/home"), fit=None,
                 rise=False, exit="out", bg="#fff", loading=False, start_cam=None, xoff=None, zoom_target=None):
        self.sid, self.img, self.W, self.H, self.crop = sid, img, W, H - crop, crop
        self.Hfull = H
        self.url, self.rise, self.exit, self.bg, self.loading = url, rise, exit, bg, loading
        self.xoff, self.zoom_target = xoff, zoom_target
        self.s = fit if fit else VW / W
        self.fitted = bool(fit)
        self.inner, self.overlay, self.js, self.sfx = [], [], [], []
        self.n = 0
        self.cur_shown = False
        self.cur_pos = None
        self.t = 0.0
        self.cam = self._cam(1, W / 2, 0)
        if start_cam:
            self.cam = self._cam(*start_cam)
        self.js.append(f"tl.set('#{sid}-page',{{x:{self.cam['x']:.1f},y:{self.cam['y']:.1f},scale:{self.cam['scale']:.4f}}},0);")
        if rise:
            self.js.append(f"tl.fromTo('#{sid}-win',{{y:1000,scale:.96}},{{y:0,scale:1,duration:.95,ease:'expo.out'}},0);")
            self.sfx.append((0.05, "whoosh.mp3", .57, .7, False))
            self.t = 1.0
        elif loading:
            self.js.append(f"tl.fromTo('#{sid}-load .dot',{{scale:.6}},{{scale:1.25,duration:.18,stagger:.09,ease:'power1.inOut',yoyo:true,repeat:1}},0);")
            self.js.append(f"tl.fromTo('#{sid}-page',{{opacity:0,filter:'blur(8px)'}},{{opacity:1,filter:'blur(0px)',duration:.2,ease:'power2.out'}},.55);")
            self.js.append(f"tl.set('#{sid}-load',{{opacity:0}},.8);")
            self.t = 0.9
        else:
            self.js.append(f"tl.fromTo('#{sid}-page',{{opacity:0,filter:'blur(8px)'}},{{opacity:1,filter:'blur(0px)',duration:.2,ease:'power2.out'}},0);")
            self.t = 0.3

    # ---- geometry
    def _cam(self, z, fx, fy):
        sc = self.s * z
        x = VW / 2 - fx * sc
        y = VH / 2 - fy * sc
        x = min(0, max(VW - self.W * sc, x))
        y = min(0, max(min(0, VH - self.H * sc), y))
        if self.W * sc < VW:
            x = self.xoff if self.xoff is not None else (VW - self.W * sc) / 2
        if self.H * sc < VH:
            y = (VH - self.H * sc) / 2 if self.fitted else 0
        return {"x": x, "y": y, "scale": sc, "z": z}

    def scr(self, px, py, cam=None):
        c = cam or self.cam
        return OX + c["x"] + px * c["scale"], OY + c["y"] + py * c["scale"]

    def _id(self, kind):
        self.n += 1
        return f"{self.sid}-{kind}{self.n}"

    # ---- steps
    def cam_to(self, z, fx, fy, d=0.9):
        self.cam = self._cam(z, fx, fy)
        c = self.cam
        self.js.append(f"tl.to('#{self.sid}-page',{{x:{c['x']:.1f},y:{c['y']:.1f},scale:{c['scale']:.4f},duration:{d},ease:'power2.inOut'}},{self.t:.2f});")
        self.t += d
        return self

    def _place_tip(self, html, box):
        w, h = tip_size(html)
        if box is None:
            return 170, 1000 - h - 40
        bx, by, bw, bh = box
        cands = [
            (bx + bw + 36, by + bh / 2 - h / 2),
            (max(150, min(1770 - w, bx)), by + bh + 30),
            (bx - 36 - w, by + bh / 2 - h / 2),
            (max(150, min(1770 - w, bx)), by - 30 - h),
        ]
        for x, y in cands:
            if 150 <= x and x + w <= 1770 and 120 <= y and y + h <= 1010:
                return x, y
        x, y = cands[2]
        return max(150, min(1770 - w, x)), max(120, min(1010 - h, y))

    def tip(self, html, box=None, pos=None, hold=None, at=None):
        tid = self._id("t")
        x, y = pos if pos else self._place_tip(html, box)
        self.overlay.append(f'<div class="tip" data-hold id="{tid}" style="left:{x:.0f}px;top:{y:.0f}px">{html}</div>')
        t0 = self.t if at is None else at
        hold = max(hold, 0.55 + 0.3 * words(html)) if hold else read_time(html)
        self.js.append(f"tl.fromTo('#{tid}',{{opacity:0,filter:'blur(8px)',scale:.96}},{{opacity:1,filter:'blur(0px)',scale:1,duration:.25,ease:'power4.out'}},{t0 + .05:.2f});")
        self.js.append(f"tl.to('#{tid}',{{opacity:0,filter:'blur(8px)',duration:.15,ease:'power2.in'}},{t0 + hold:.2f});")
        return t0, hold

    def box(self, x, y, w, h, t0, t1=None):
        bid = self._id("b")
        bw = max(1.5, 3.5 / self.cam["scale"])
        pad = 4 / self.cam["scale"]
        self.inner.append(f'<div class="hl" id="{bid}" style="left:{x - pad:.1f}px;top:{y - pad:.1f}px;width:{w + 2 * pad:.1f}px;height:{h + 2 * pad:.1f}px;border-width:{bw:.2f}px"></div>')
        self.js.append(f"tl.fromTo('#{bid}',{{opacity:0,scale:1.06}},{{opacity:1,scale:1,duration:.3,ease:'expo.out'}},{t0:.2f});")
        if t1 is not None:
            self.js.append(f"tl.to('#{bid}',{{opacity:0,duration:.15}},{t1:.2f});")
        return bid

    def focus(self, rect, html, z=None, at=None, keep=False, pos=None, hold=None, gap=0.25):
        """Optionally move the camera to the rect, outline it and explain it."""
        x, y, w, h = rect
        if z:
            self.cam_to(z, x + w / 2, y + h / 2)
        sx, sy = self.scr(x, y)
        sbox = (sx, sy, w * self.cam["scale"], h * self.cam["scale"])
        t0 = self.t
        _, hold = self.tip(html, sbox, pos=pos, at=t0, hold=hold)
        self.box(x, y, w, h, t0, None if keep else t0 + hold)
        self.t = t0 + hold + gap
        return self

    def say(self, html, pos=None, box=None):
        t0, hold = self.tip(html, box, pos=pos)
        self.t = t0 + hold + 0.25
        return self

    def sbox(self, x, y, w, h, html, pos=None):
        """Highlight something in screen space (browser chrome)."""
        bid = self._id("sb")
        self.overlay.append(f'<div class="hl" id="{bid}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-width:3.5px;z-index:45"></div>')
        t0 = self.t
        _, hold = self.tip(html, (x, y, w, h), pos=pos, at=t0)
        self.js.append(f"tl.fromTo('#{bid}',{{opacity:0,scale:1.06}},{{opacity:1,scale:1,duration:.3,ease:'expo.out'}},{t0:.2f});")
        self.js.append(f"tl.to('#{bid}',{{opacity:0,duration:.15}},{t0 + hold:.2f});")
        self.t = t0 + hold + 0.25
        return self

    def click(self, px, py, screen=False, sound="click-soft.mp3", move=0.65, at=None):
        tx, ty = (px, py) if screen else self.scr(px, py)
        cid = f"{self.sid}-cur"
        t = self.t if at is None else at
        if not self.cur_shown:
            sx, sy = (tx + 260, ty + 200) if tx < 1500 else (tx - 260, ty + 200)
            self.js.append(f"tl.fromTo('#{cid}',{{opacity:0,x:{sx - 6:.0f},y:{sy - 4:.0f}}},{{opacity:1,duration:.2}},{t:.2f});")
            self.cur_shown = True
            t += 0.15
        self.js.append(f"tl.to('#{cid}',{{x:{tx - 6:.0f},y:{ty - 4:.0f},duration:{move},ease:'power2.inOut'}},{t:.2f});")
        t += move + 0.15
        self.js.append(f"tl.to('#{cid}',{{scale:.82,duration:.08,ease:'power2.out'}},{t:.2f});")
        self.js.append(f"tl.to('#{cid}',{{scale:1,duration:.12,ease:'power2.out'}},{t + .08:.2f});")
        self.sfx.append((t, sound, .36, 1, True))
        if at is None:
            self.t = t + 0.3
        return t

    def type_text(self, text, x, y, size, cover=None, step=0.09):
        if cover:
            cx, cy, cw, ch = cover
            self.inner.append(f'<div class="cover" style="left:{cx}px;top:{cy}px;width:{cw}px;height:{ch}px"></div>')
        tid = self._id("q")
        sp = "".join(f"<span>{c}</span>" for c in text)
        self.inner.append(f'<div class="typed" data-layout-ignore id="{tid}" style="left:{x}px;top:{y}px;font-size:{size}px">{sp}</div>')
        for i in range(len(text)):
            self.js.append(f"tl.set('#{tid} span:nth-child({i + 1})',{{opacity:1}},{self.t + i * step:.2f});")
        self.sfx.append((self.t, "typing.mp3", min(1.5, len(text) * step + .1), .6, True))
        self.t += len(text) * step + 0.3
        return self

    def pop_star(self, px, py, size):
        sid = self._id("star")
        self.inner.append(f'<div id="{sid}" style="position:absolute;left:{px - size / 2:.1f}px;top:{py - size / 2:.1f}px;width:{size}px;height:{size}px;opacity:0">{STAR}</div>')
        self.js.append(f"tl.fromTo('#{sid}',{{opacity:0,scale:.3}},{{opacity:1,scale:1,duration:.45,ease:'back.out(2.2)'}},{self.t - 0.25:.2f});")
        self.sfx.append((self.t - 0.25, "pop.mp3", .7, .7, True))
        return self

    def reveal(self, rect):
        """A white cover over rect that fades out now (results appearing)."""
        cid = self._id("cv")
        x, y, w, h = rect
        self.inner.append(f'<div class="cover" id="{cid}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"></div>')
        self.js.append(f"tl.to('#{cid}',{{opacity:0,duration:.25,ease:'power1.out'}},{self.t:.2f});")
        self.t += 0.35
        return self

    def card(self, html, x, y, hold=2.6):
        cid = self._id("card")
        self.overlay.append(f'<div class="tip" data-hold id="{cid}" style="left:{x}px;top:{y}px;padding:30px 40px 34px;max-width:560px">{html}</div>')
        self.js.append(f"tl.fromTo('#{cid}',{{opacity:0,scale:.7}},{{opacity:1,scale:1,duration:.55,ease:'back.out(1.6)'}},{self.t:.2f});")
        self.js.append(f"tl.to('#{cid}',{{opacity:0,filter:'blur(8px)',duration:.18,ease:'power2.in'}},{self.t + hold:.2f});")
        self.sfx.append((self.t, "pop.mp3", .7, .8, True))
        self.t += hold + 0.3
        return self

    def wait(self, d):
        self.t += d
        return self

    # ---- output
    def finish(self):
        sid = self.sid
        if self.cur_shown:
            self.js.append(f"tl.to('#{sid}-cur',{{opacity:0,duration:.15}},{self.t:.2f});")
        if self.exit == "out":
            self.js.append(f"tl.to('#{sid}-page',{{opacity:0,filter:'blur(8px)',duration:.15,ease:'power2.in'}},{self.t:.2f});")
            self.t += 0.2
        elif self.exit == "zoom":
            c = self._cam(self.cam["z"] * 3.5, *self.zoom_target)
            self.js.append(f"tl.to('#{sid}-page',{{x:{c['x']:.1f},y:{c['y']:.1f},scale:{c['scale']:.4f},duration:.5,ease:'power3.in'}},{self.t:.2f});")
            self.js.append(f"tl.to('#{sid}-page',{{opacity:0,filter:'blur(14px)',duration:.3,ease:'power3.in'}},{self.t + .2:.2f});")
            self.sfx.append((self.t, "whoosh-short.mp3", .57, .7, False))
            self.t += 0.6
        elif self.exit == "drop":
            self.js.append(f"tl.to('#{sid}-win',{{y:760,scale:.82,opacity:0,duration:.7,ease:'power3.in'}},{self.t:.2f});")
            self.sfx.append((self.t + .05, "whoosh-short.mp3", .57, .6, False))
            self.t += 0.75
        return round(self.t + 0.05, 2)

    def html(self):
        dur = self.finish()
        host, path = self.url
        sid = self.sid
        load = ""
        if self.loading:
            dots = "".join(f'<div class="dot" style="position:absolute;left:{806 + 20 * i}px;top:430px;width:14px;height:14px;border-radius:7px;background:#1A6BD8"></div>' for i in range(3))
            load = f'<div id="{sid}-load" style="position:absolute;inset:0;background:#F6F0F6">{dots}</div>'
        page = (f'<div class="page" id="{sid}-page" style="width:{self.W}px;height:{self.H}px;background:{self.bg}">'
                f'<img class="shot" src="assets/img/{self.img}" style="top:{-self.crop}px;width:{self.W}px;height:{self.Hfull}px" alt="">'
                + "".join(self.inner) + "</div>")
        body = (f'<div class="win" id="{sid}-win"><div class="bar">{NAV}<div class="url" data-layout-ignore>{LOCK}'
                f'<span class="host">{host}</span>{path}</div></div>'
                f'<div class="vp" style="background:{"#F3F4F6" if self.W * self.s < VW - 2 or self.H * self.s < VH - 2 else "#fff"}">{load}{page}</div></div>'
                + "".join(self.overlay)
                + (f'<div class="cursor" id="{sid}-cur">{CURSOR}</div>' if self.cur_shown else ""))
        return dur, body, "\n    ".join(self.js)


class Ground:
    """A scene on the plain ground: titles, kinetic type, cards."""

    def __init__(self, sid):
        self.sid = sid
        self.body, self.js, self.sfx = [], [], []
        self.t = 0.0
        self.n = 0
        self.dur = None

    def _id(self, k):
        self.n += 1
        return f"{self.sid}-{k}{self.n}"

    def add(self, html, js=None, t_after=None, sfx=None):
        self.body.append(html)
        if js:
            self.js.extend(js if isinstance(js, list) else [js])
        if sfx:
            self.sfx.extend(sfx)
        if t_after is not None:
            self.t = t_after
        return self

    def html(self):
        return self.dur or round(self.t, 2), "".join(self.body), "\n    ".join(self.js)


def scene_file(cid, dur, body, js):
    return f"""<template>
  <style>{CSS}</style>
  <div id="root" data-composition-id="{cid}" data-width="1920" data-height="1080" data-duration="{dur}">
{body}
  </div>
  <script>
  (function(){{
    const tl = gsap.timeline({{ paused: true }});
    {js}
    window.__timelines["{cid}"] = tl;
  }})();
  </script>
</template>
"""


def build_episode(root, slug, title, scenes, template_dir):
    """scenes: list of Browser/Ground objects. Writes a full HyperFrames project."""
    proj = os.path.join(root, slug)
    os.makedirs(os.path.join(proj, "compositions"), exist_ok=True)
    for f in ("hyperframes.json", "package.json", "CLAUDE.md", "AGENTS.md"):
        src = os.path.join(template_dir, f)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(proj, f))
    meta = {"id": f"bms-{slug}", "name": title}
    json.dump(meta, open(os.path.join(proj, "meta.json"), "w"), ensure_ascii=False, indent=2)
    link = os.path.join(proj, "assets")
    if not os.path.lexists(link):
        os.symlink("../assets", link)
    for f in os.listdir(os.path.join(proj, "compositions")):
        os.remove(os.path.join(proj, "compositions", f))
    t = 0.0
    hosts, audio = [], []
    counts = {}
    for sc in scenes:
        dur, body, js = sc.html()
        with open(os.path.join(proj, "compositions", f"{sc.sid}.html"), "w") as fh:
            fh.write(scene_file(sc.sid, dur, body, js))
        hosts.append(f'      <div id="{sc.sid}" data-composition-id="{sc.sid}" data-composition-src="compositions/{sc.sid}.html" '
                     f'data-start="{t:.2f}" data-duration="{dur}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>')
        lanes_end = {}
        for (lt, f, d, v, aligned, *ms) in sorted(sc.sfx, key=lambda e: e[0]):
            st = t + lt + (FR if aligned else 0)
            lane = 2
            while lanes_end.get(lane, -1) > st:
                lane += 1
            lanes_end[lane] = st + d
            k = f.split(".")[0]
            counts[k] = counts.get(k, 0) + 1
            m = f' data-media-start="{ms[0]}"' if ms else ""
            audio.append(f'      <audio id="sfx-{k}-{counts[k]}" class="clip" src="assets/sfx/{f}" data-start="{st:.3f}" data-duration="{d}" '
                         f'data-volume="{v}" data-track-index="{lane}"{m}></audio>')
        t += dur
    total = round(t, 2)
    html = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root {{ --ground: #e9ecf1; --ink: #1e2833; --accent: #ce003a; --font-display: "Outfit", sans-serif; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: var(--ground); }}
      #root {{ width: 100%; height: 100%; font-family: var(--font-display); background: var(--ground); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1920" data-height="1080">
{chr(10).join(hosts)}
{chr(10).join(audio)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
    with open(os.path.join(proj, "index.html"), "w") as fh:
        fh.write(html)
    return total


# ---------------------------------------------------------------- ground helpers
def intro(sid, number, title, accent_word):
    g = Ground(sid)
    words_html = " ".join(
        f'<span class="w" id="{sid}-key">{w}</span>' if w == accent_word else f'<span class="w">{w}</span>'
        for w in title.split())
    g.add(f'<div style="position:absolute;left:200px;top:330px;font-size:40px;font-weight:600;color:#6B7480;letter-spacing:.01em">'
          f'BMS en un clic · <span style="color:#1E2833">capítulo {number} de 6</span></div>'
          f'<div id="{sid}-title" style="position:absolute;left:192px;top:400px;width:1560px;font-size:156px;font-weight:700;line-height:1.04;letter-spacing:-0.025em">{words_html}</div>',
          [f"tl.to('#{sid}-key',{{color:'#CE003A',duration:.25,ease:'power1.out'}},.7);"],
          t_after=2.4)
    g.dur = 2.4
    return g


def outro(sid, claim, accent, next_title=None):
    g = Ground(sid)
    claim_html = " ".join(
        f'<span class="w" style="color:#CE003A">{w}</span>' if w in accent else f'<span class="w">{w}</span>' for w in claim.split())
    nxt = (f'<div id="{sid}-next" style="position:absolute;left:560px;top:760px;width:800px;text-align:center;font-size:34px;font-weight:500;color:#5B6572">'
           f'Siguiente: <span style="color:#1E2833;font-weight:600">{next_title}</span></div>') if next_title else ""
    g.add(f'<div id="{sid}-claim" style="position:absolute;left:200px;top:400px;width:1560px;font-weight:700;font-size:132px;line-height:1.05;letter-spacing:-0.025em">{claim_html}</div>'
          f'<img id="{sid}-logo" src="assets/img/brose-logo.png" alt="Brose" style="position:absolute;left:600px;top:340px;width:720px;height:253px">'
          f'<div id="{sid}-sub" style="position:absolute;left:560px;top:640px;width:800px;text-align:center;font-size:40px;font-weight:500;color:#5B6572">'
          f'<span class="w">Brose</span> <span class="w">Management</span> <span class="w">System</span></div>' + nxt,
          [f"tl.fromTo('#{sid}-claim .w',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.14,stagger:.1,ease:'power2.out'}},.1);",
           f"tl.to('#{sid}-claim',{{opacity:0,filter:'blur(12px)',duration:.25,ease:'power2.in'}},2.9);",
           f"tl.fromTo('#{sid}-logo',{{clipPath:'inset(0% 100% 0% 0%)'}},{{clipPath:'inset(0% 0% 0% 0%)',duration:.85,ease:'power3.inOut'}},3.2);",
           f"tl.fromTo('#{sid}-sub .w',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.13,stagger:.09,ease:'power2.out'}},4.0);"]
          + ([f"tl.fromTo('#{sid}-next',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.2,ease:'power2.out'}},4.6);"] if next_title else []),
          t_after=7.6,
          sfx=[(2.0, "riser.mp3", 1.4, .4, False, 2.27), (3.2, "impact-bass-1.mp3", 2.1, .75, True)])
    g.dur = 7.6
    return g
