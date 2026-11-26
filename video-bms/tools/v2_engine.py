"""v2 engine for the 'BMS en un clic' videos: left text panel + crisp browser mockup.

Screens are never shown above their native pixel size, so they stay sharp. Details are
shown through a loupe (a 1:1 crop of the same screenshot), never by upscaling.
"""
import os, json, math, re, shutil

FR = 1 / 30
# browser mockup geometry (frame px)
MX, MY, MW, MH, CH = 740, 136, 1100, 808, 50
VX, VY, VW, VH = MX, MY + CH, MW, MH - CH
INK, MUTED, RED, GROUND = "#1E2833", "#5B6572", "#CE003A", "#F3F4F6"

CSS = """
#root{position:absolute;inset:0;font-family:'Outfit',sans-serif;color:#1E2833;background:#fff;}
.panel{position:absolute;left:676px;top:0;width:1244px;height:1080px;background:#F3F4F6;}
.mock{position:absolute;left:740px;top:136px;width:1100px;height:808px;border-radius:16px;background:#fff;overflow:hidden;
 box-shadow:0 40px 90px rgba(20,30,45,.16),0 2px 8px rgba(20,30,45,.08);}
.bar{position:absolute;left:0;top:0;width:1100px;height:50px;background:#F7F8FA;border-bottom:1px solid #E4E7EC;}
.dots{position:absolute;left:20px;top:19px;}
.dots i{display:inline-block;width:12px;height:12px;border-radius:6px;background:#D5D9DF;margin-right:8px;}
.url{position:absolute;left:96px;top:10px;width:820px;height:30px;border-radius:15px;background:#fff;border:1px solid #E1E4E9;
 font-family:'Inter',sans-serif;font-size:15px;color:#5B6572;line-height:28px;padding-left:36px;white-space:nowrap;overflow:hidden;}
.url svg{position:absolute;left:13px;top:7px;}
.url b{color:#1E2833;font-weight:500;}
.vp{position:absolute;left:0;top:50px;width:1100px;height:758px;overflow:hidden;background:#fff;}
.scr{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden;opacity:0;}
.scr img{position:absolute;left:0;display:block;}
.hl{position:absolute;border:3px solid #CE003A;border-radius:10px;opacity:0;box-sizing:border-box;z-index:30;}
.loupe{position:absolute;overflow:hidden;border-radius:18px;border:3px solid #CE003A;background:#fff;opacity:0;z-index:35;
 box-shadow:0 24px 50px rgba(20,30,45,.25);}
.loupe img{position:absolute;display:block;}
.cursor{position:absolute;left:0;top:0;width:34px;height:34px;opacity:0;transform-origin:5px 3px;z-index:50;filter:drop-shadow(0 3px 4px rgba(0,0,0,.28));}
.typed{position:absolute;font-family:'Inter',sans-serif;white-space:nowrap;color:#1E2833;}
.typed span{opacity:0;}
.cover{position:absolute;background:#fff;}
.chap{position:absolute;left:110px;top:230px;font-size:30px;font-weight:600;color:#CE003A;}
.stepn{position:absolute;left:110px;top:280px;font-size:28px;font-weight:500;color:#5B6572;}
.head{position:absolute;left:110px;top:342px;width:540px;font-size:66px;font-weight:700;line-height:1.08;letter-spacing:-0.015em;opacity:0;}
.body{position:absolute;left:110px;width:520px;font-size:33px;font-weight:400;line-height:1.36;color:#4B5563;opacity:0;}
.body b{color:#1E2833;font-weight:600;}
.prog{position:absolute;left:110px;top:950px;width:520px;height:6px;border-radius:3px;background:#E5E7EB;overflow:hidden;}
.prog i{position:absolute;left:0;top:0;height:6px;width:520px;background:#CE003A;transform-origin:0 0;}
.w{display:inline-block;}
.gfx{position:absolute;left:676px;top:0;width:1244px;height:1080px;overflow:hidden;}
"""

DOTS = '<div class="dots"><i></i><i></i><i></i></div>'
LOCK = ('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A8390" stroke-width="2.6" stroke-linecap="round">'
        '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>')
CURSOR = ('<svg viewBox="0 0 40 40"><path d="M6 4 L6 32 L13 25 L18 36 L23 34 L18 23 L28 23 Z" fill="#fff" stroke="#1E2833" '
          'stroke-width="2.4" stroke-linejoin="round"/></svg>')
STAR = ('<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" '
        'fill="#F5B301" stroke="#E0A000" stroke-width="1.6" stroke-linejoin="round"/></svg>')


def nwords(html):
    return len(re.sub(r"<[^>]+>", " ", html).split())


def body_top(head):
    lines = math.ceil(len(re.sub(r"<[^>]+>", "", head)) * 33 / 540)
    return 342 + lines * 72 + 36


class Screen:
    def __init__(self, img, W, H, crop=0, url=("editor.signavio.com", "/p/hub/home"), scale=None, bg="#fff"):
        self.img, self.W, self.H, self.crop, self.url, self.bg = img, W, H - crop, crop, url, bg
        self.Hfull = H
        self.s = scale or min(1.0, VW / W)


class Chapter:
    """One sub-composition: a run of steps sharing the left panel and the mockup."""

    def __init__(self, cid, chapter_title, total_steps, first_step=1):
        self.cid, self.title, self.total, self.k = cid, chapter_title, total_steps, first_step
        self.t = 0.0
        self.html, self.js, self.sfx = [], [], []
        self.n = 0
        self.screen = None
        self.sid = None
        self.cam = None
        self.cur_on = False
        self.head_id = self.body_id = None
        self.in_mock = []  # elements inside the viewport (screens)
        self.over = []     # elements over the frame (loupes, cursor)
        self.mock_in = False
        self.urls = []

    def _id(self, k):
        self.n += 1
        return f"{self.cid}-{k}{self.n}"

    # ------------------------------------------------ camera on the current screen (never above native)
    def _cam(self, z, fx, fy):
        sc = min(max(1.0, self.screen.s), self.screen.s * z)
        W, H = self.screen.W, self.screen.H
        x = VW / 2 - fx * sc
        y = VH / 2 - fy * sc
        x = min(0, max(VW - W * sc, x))
        y = min(0, max(min(0, VH - H * sc), y))
        if W * sc < VW:
            x = (VW - W * sc) / 2
        return {"x": x, "y": y, "scale": sc}

    def to_frame(self, px, py):
        c = self.cam
        return VX + c["x"] + px * c["scale"], VY + c["y"] + py * c["scale"]

    def show(self, screen, cam=(1, None, 0), at=None):
        """Swap the screen inside the mockup."""
        t = self.t if at is None else at
        old = self.sid
        self.screen = screen
        self.sid = self._id("s")
        z, fx, fy = cam
        self.cam = self._cam(z, screen.W / 2 if fx is None else fx, fy)
        c = self.cam
        self.in_mock.append(
            f'<div class="scr" id="{self.sid}" style="width:{screen.W}px;height:{screen.H}px;background:{screen.bg}">'
            f'<img src="assets/img/{screen.img}" style="top:{-screen.crop}px;width:{screen.W}px;height:{screen.Hfull}px" alt="">'
            f'<!--{self.sid}--></div>')
        self.js.append(f"tl.set('#{self.sid}',{{x:{c['x']:.1f},y:{c['y']:.1f},scale:{c['scale']:.4f}}},0);")
        if old:
            self.js.append(f"tl.to('#{old}',{{opacity:0,filter:'blur(6px)',duration:.18,ease:'power2.in'}},{t:.2f});")
            self.js.append(f"tl.fromTo('#{self.sid}',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.22,ease:'power2.out'}},{t + .12:.2f});")
            self.sfx.append((t, "whoosh-short.mp3", .57, .35, False))
        else:
            self.js.append(f"tl.fromTo('#{self.sid}',{{opacity:0}},{{opacity:1,duration:.01}},{t:.2f});")
        host, path = screen.url
        uid = self._id("u")
        self.urls.append(f'<div id="{uid}" style="position:absolute;left:36px;top:0;opacity:0"><b style="color:#1E2833;font-weight:500">{host}</b>{path}</div>')
        self.js.append(f"tl.set('#{uid}',{{opacity:1}},{t + .12:.2f});")
        self._last_url = uid
        if hasattr(self, "_prev_url") and self._prev_url:
            self.js.append(f"tl.set('#{self._prev_url}',{{opacity:0}},{t + .12:.2f});")
        self._prev_url = uid
        return self

    def _add_to_screen(self, html):
        self.in_mock[-1] = self.in_mock[-1].replace(f"<!--{self.sid}-->", html + f"<!--{self.sid}-->")

    def cam_to(self, z, fx, fy, d=0.9):
        self.cam = self._cam(z, fx, fy)
        c = self.cam
        self.js.append(f"tl.to('#{self.sid}',{{x:{c['x']:.1f},y:{c['y']:.1f},scale:{c['scale']:.4f},duration:{d},ease:'power2.inOut'}},{self.t:.2f});")
        self.t += d
        return self

    # ------------------------------------------------ left panel
    def step(self, head, body):
        """New step: heading + body on the left. Holds are added by actions / wait."""
        t = self.t
        if self.head_id:
            self.js.append(f"tl.to('#{self.head_id}, #{self.body_id}, #{self.cid}-n{self.k - 1}',{{opacity:0,filter:'blur(8px)',duration:.18,ease:'power2.in'}},{t:.2f});")
            t += 0.2
        hid, bid = self._id("h"), self._id("b")
        words = "".join(f'<span class="w">{w}</span> ' for w in head.split())
        self.html.append(f'<div class="stepn" id="{self.cid}-n{self.k}" style="opacity:0">Paso {self.k} de {self.total}</div>')
        self.html.append(f'<div class="head" data-hold id="{hid}">{words}</div>')
        self.html.append(f'<div class="body" id="{bid}" style="top:{body_top(head)}px">{body}</div>')
        self.js.append(f"tl.fromTo('#{self.cid}-n{self.k}',{{opacity:0}},{{opacity:1,duration:.2}},{t:.2f});")
        self.js.append(f"tl.set('#{hid}',{{opacity:1}},{t:.2f});")
        self.js.append(f"tl.fromTo('#{hid} .w',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.14,stagger:.07,ease:'power2.out'}},{t:.2f});")
        self.js.append(f"tl.fromTo('#{bid}',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.25,ease:'power2.out'}},{t + .35:.2f});")
        frac = self.k / self.total
        self.js.append(f"tl.to('#{self.cid}-prog',{{scaleX:{frac:.3f},duration:.6,ease:'power2.inOut'}},{t:.2f});")
        self.head_id, self.body_id = hid, bid
        self.step_start = t
        self.step_min = t + 0.6 + 0.3 * nwords(head + " " + body)
        self.k += 1
        self.t = t + 0.5
        return self

    def hold(self):
        """Make sure the current step's text has been readable long enough."""
        self.t = max(self.t, self.step_min)
        return self

    # ------------------------------------------------ actions on the screen
    def box(self, rect, until=None):
        x, y, w, h = rect
        bid = self._id("x")
        bw = 3 / self.cam["scale"]
        p = 5 / self.cam["scale"]
        self._add_to_screen(f'<div class="hl" id="{bid}" style="left:{x - p:.1f}px;top:{y - p:.1f}px;width:{w + 2 * p:.1f}px;height:{h + 2 * p:.1f}px;border-width:{bw:.2f}px;border-radius:{8 / self.cam["scale"]:.1f}px"></div>')
        self.js.append(f"tl.fromTo('#{bid}',{{opacity:0,scale:1.08}},{{opacity:1,scale:1,duration:.3,ease:'expo.out'}},{self.t:.2f});")
        self.last_box = bid
        if until is not None:
            self.js.append(f"tl.to('#{bid}',{{opacity:0,duration:.15}},{until:.2f});")
        return bid

    def unbox(self, bid=None):
        self.js.append(f"tl.to('#{bid or self.last_box}',{{opacity:0,duration:.15}},{self.t:.2f});")
        return self

    def loupe(self, rect, w=500, h=260, pos=None, mag=1.0, hold=2.6):
        """1:1 crop of rect's area (from the same screenshot) in a card near the target."""
        x, y, rw, rh = rect
        cx, cy = x + rw / 2, y + rh / 2
        fx, fy = self.to_frame(cx, cy)
        lid = self._id("l")
        sc = mag  # native pixels
        img_left = w / 2 - cx * sc
        img_top = h / 2 - (cy + self.screen.crop) * sc
        if pos is None:
            lx = fx - w / 2
            ly = fy + 60 if fy < 560 else fy - h - 60
            lx = max(MX + 30, min(MX + MW - w - 30, lx))
        else:
            lx, ly = pos
        self.over.append(f'<div class="loupe" id="{lid}" style="left:{lx:.0f}px;top:{ly:.0f}px;width:{w}px;height:{h}px">'
                         f'<img src="assets/img/{self.screen.img}" style="left:{img_left:.1f}px;top:{img_top:.1f}px;'
                         f'width:{self.screen.W * sc:.1f}px;height:{self.screen.Hfull * sc:.1f}px" alt=""></div>')
        ox = (fx - lx) / w * 100
        oy = (fy - ly) / h * 100
        self.js.append(f"tl.fromTo('#{lid}',{{opacity:0,scale:.2,transformOrigin:'{ox:.0f}% {oy:.0f}%'}},{{opacity:1,scale:1,duration:.5,ease:'expo.out'}},{self.t:.2f});")
        self.js.append(f"tl.to('#{lid}',{{opacity:0,scale:.9,duration:.2,ease:'power2.in'}},{self.t + hold:.2f});")
        self.sfx.append((self.t, "pop.mp3", .7, .45, True))
        self.t += hold + 0.25
        return self

    def click(self, px, py, move=0.7, sound="click-soft.mp3"):
        tx, ty = self.to_frame(px, py)
        cid = f"{self.cid}-cur"
        t = self.t
        if not self.cur_on:
            self.js.append(f"tl.fromTo('#{cid}',{{opacity:0,x:{tx + 180:.0f},y:{ty + 160:.0f}}},{{opacity:1,duration:.2}},{t:.2f});")
            self.cur_on = True
            t += .15
        self.js.append(f"tl.to('#{cid}',{{x:{tx - 5:.0f},y:{ty - 3:.0f},duration:{move},ease:'power2.inOut'}},{t:.2f});")
        t += move + .12
        self.js.append(f"tl.to('#{cid}',{{scale:.82,duration:.08}},{t:.2f});tl.to('#{cid}',{{scale:1,duration:.12}},{t + .08:.2f});")
        self.sfx.append((t, sound, .36, 1, True))
        self.t = t + .3
        return self

    def point(self, px, py, move=0.8):
        """Move the cursor onto something without clicking."""
        tx, ty = self.to_frame(px, py)
        cid = f"{self.cid}-cur"
        if not self.cur_on:
            self.js.append(f"tl.fromTo('#{cid}',{{opacity:0,x:{tx + 180:.0f},y:{ty + 160:.0f}}},{{opacity:1,duration:.2}},{self.t:.2f});")
            self.cur_on = True
            self.t += .15
        self.js.append(f"tl.to('#{cid}',{{x:{tx - 5:.0f},y:{ty - 3:.0f},duration:{move},ease:'power2.inOut'}},{self.t:.2f});")
        self.t += move + .1
        return self

    def cursor_off(self):
        if self.cur_on:
            self.js.append(f"tl.to('#{self.cid}-cur',{{opacity:0,duration:.15}},{self.t:.2f});")
            self.cur_on = False
        return self

    def type_text(self, text, x, y, size, cover=None, step=.09):
        if cover:
            cx, cy, cw, ch = cover
            self._add_to_screen(f'<div class="cover" style="left:{cx}px;top:{cy}px;width:{cw}px;height:{ch}px"></div>')
        tid = self._id("q")
        sp = "".join(f"<span>{c}</span>" for c in text)
        self._add_to_screen(f'<div class="typed" data-layout-ignore id="{tid}" style="left:{x}px;top:{y}px;font-size:{size}px">{sp}</div>')
        for i in range(len(text)):
            self.js.append(f"tl.set('#{tid} span:nth-child({i + 1})',{{opacity:1}},{self.t + i * step:.2f});")
        self.sfx.append((self.t, "typing.mp3", min(1.5, len(text) * step + .1), .5, True))
        self.t += len(text) * step + .3
        return self

    def cover(self, rect, reveal=False):
        cid = self._id("c")
        x, y, w, h = rect
        self._add_to_screen(f'<div class="cover" id="{cid}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px"></div>')
        if reveal:
            self.js.append(f"tl.to('#{cid}',{{opacity:0,duration:.25}},{self.t:.2f});")
            self.t += .3
        return cid

    def star(self, px, py, size):
        sid = self._id("st")
        self._add_to_screen(f'<div id="{sid}" style="position:absolute;left:{px - size / 2:.1f}px;top:{py - size / 2:.1f}px;width:{size}px;height:{size}px;opacity:0">{STAR}</div>')
        self.js.append(f"tl.fromTo('#{sid}',{{opacity:0,scale:.3}},{{opacity:1,scale:1,duration:.45,ease:'back.out(2.2)'}},{self.t - .2:.2f});")
        self.sfx.append((self.t - .2, "pop.mp3", .7, .6, True))
        return self

    def badge(self, n, px, py):
        """Numbered red marker on the screen (like the guide's 1-2-3 circles)."""
        bid = self._id("bd")
        r = 22 / self.cam["scale"]
        self._add_to_screen(f'<div id="{bid}" style="position:absolute;left:{px - r:.1f}px;top:{py - r:.1f}px;width:{2 * r:.1f}px;height:{2 * r:.1f}px;'
                            f'border-radius:50%;background:#CE003A;color:#fff;font-weight:700;font-size:{26 / self.cam["scale"]:.1f}px;'
                            f'line-height:{2 * r:.1f}px;text-align:center;opacity:0;z-index:31;box-shadow:0 4px 10px rgba(0,0,0,.25)">{n}</div>')
        self.js.append(f"tl.fromTo('#{bid}',{{opacity:0,scale:.3}},{{opacity:1,scale:1,duration:.4,ease:'back.out(2.2)'}},{self.t:.2f});")
        self.sfx.append((self.t, "pop.mp3", .7, .45, True))
        self.badges = getattr(self, 'badges', []) + [bid]
        return bid

    def unbadge(self):
        for b in getattr(self, 'badges', []):
            self.js.append(f"tl.to('#{b}',{{opacity:0,duration:.15}},{self.t:.2f});")
        self.badges = []
        return self

    def wait(self, d):
        self.t += d
        return self

    # ------------------------------------------------ graphics instead of a screenshot
    def graphic(self, html, js, dur, at=None):
        """Full-panel designed graphic (vector) over the right side; js uses {t} for its start."""
        t = self.t if at is None else at
        gid = self._id("g")
        self.over.append(f'<div class="gfx" data-hold id="{gid}" style="opacity:0;z-index:25">{html}</div>')
        self.js.append(f"tl.fromTo('#{gid}',{{opacity:0}},{{opacity:1,duration:.25}},{t:.2f});")
        for line in js:
            self.js.append(line.replace("{t}", f"{t:.2f}").replace("{gid}", gid))
        self.js.append(f"tl.to('#{gid}',{{opacity:0,filter:'blur(8px)',duration:.2}},{t + dur:.2f});")
        self.t = t + dur + .25
        return gid

    # ------------------------------------------------ output
    def build(self, enter=True, leave=True):
        cid = self.cid
        self.js.insert(0, f"tl.set('#{cid}-prog',{{scaleX:0}},0);")
        end = max(self.t, getattr(self, "step_min", 0)) + 0.3
        if enter:
            self.js.insert(0, f"tl.fromTo('#{cid}-mock',{{y:900,opacity:0}},{{y:0,opacity:1,duration:.9,ease:'expo.out'}},0);")
            self.js.insert(0, f"tl.fromTo('#{cid}-panel',{{xPercent:100}},{{xPercent:0,duration:.8,ease:'expo.out'}},0);")
        self.cursor_off()
        if leave:
            self.js.append(f"tl.to('#{cid}-mock',{{y:900,opacity:0,duration:.6,ease:'power3.in'}},{end:.2f});")
            self.js.append(f"tl.to('#{cid}-left',{{opacity:0,filter:'blur(8px)',duration:.25}},{end:.2f});")
            end += 0.65
        body = (f'<div class="panel" id="{cid}-panel"></div>'
                f'<div id="{cid}-left"><div class="chap">{self.title}</div>' + "".join(self.html) +
                f'<div class="prog"><i id="{cid}-prog"></i></div></div>'
                f'<div class="mock" id="{cid}-mock"><div class="bar">{DOTS}<div class="url" data-layout-ignore>{LOCK}' + "".join(self.urls) + '</div></div>'
                f'<div class="vp">' + "".join(self.in_mock) + '</div></div>' + "".join(self.over) +
                f'<div class="cursor" id="{cid}-cur">{CURSOR}</div>')
        return round(end, 2), body, "\n    ".join(self.js)


class Card:
    """Full-frame designed scene (title card, end card, diagrams)."""

    def __init__(self, cid, body, js, dur, sfx=None):
        self.cid, self.body, self.js, self.dur, self.sfx = cid, body, js, dur, sfx or []

    def build(self, **_):
        return self.dur, self.body, "\n    ".join(self.js)


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


def build_video(root, slug, title, scenes, template_dir):
    proj = os.path.join(root, slug)
    os.makedirs(os.path.join(proj, "compositions"), exist_ok=True)
    for f in ("hyperframes.json", "package.json", "CLAUDE.md", "AGENTS.md"):
        src = os.path.join(template_dir, f)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(proj, f))
    json.dump({"id": f"bms-{slug}", "name": title}, open(os.path.join(proj, "meta.json"), "w"), ensure_ascii=False, indent=2)
    link = os.path.join(proj, "assets")
    if not os.path.lexists(link):
        os.symlink("../assets", link)
    for f in os.listdir(os.path.join(proj, "compositions")):
        os.remove(os.path.join(proj, "compositions", f))
    t, hosts, audio, counts = 0.0, [], [], {}
    for sc in scenes:
        dur, body, js = sc.build()
        open(os.path.join(proj, "compositions", f"{sc.cid}.html"), "w").write(scene_file(sc.cid, dur, body, js))
        hosts.append(f'      <div id="{sc.cid}" data-composition-id="{sc.cid}" data-composition-src="compositions/{sc.cid}.html" '
                     f'data-start="{t:.2f}" data-duration="{dur}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>')
        lanes = {}
        for (lt, f, d, v, al, *ms) in sorted(sc.sfx, key=lambda e: e[0]):
            st = t + lt + (FR if al else 0)
            lane = 2
            while lanes.get(lane, -1) > st:
                lane += 1
            lanes[lane] = st + d
            k = f.split(".")[0]
            counts[k] = counts.get(k, 0) + 1
            m = f' data-media-start="{ms[0]}"' if ms else ""
            audio.append(f'      <audio id="sfx-{k}-{counts[k]}" class="clip" src="assets/sfx/{f}" data-start="{st:.3f}" data-duration="{d}" data-volume="{v}" data-track-index="{lane}"{m}></audio>')
        t += dur
    total = round(t, 2)
    html = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #fff; }}
      #root {{ width: 100%; height: 100%; font-family: "Outfit", sans-serif; background: #fff; }}
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
    open(os.path.join(proj, "index.html"), "w").write(html)
    return total


def title_card(cid, number, title, accent, subtitle):
    words = " ".join(f'<span class="w"{" style=\"color:#CE003A\"" if w in accent else ""}>{w}</span>' for w in title.split())
    body = (f'<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;background:#fff"></div>'
            f'<div id="{cid}-bar" style="position:absolute;left:110px;top:330px;width:10px;height:300px;background:#CE003A;border-radius:5px;transform-origin:50% 0"></div>'
            f'<img src="assets/img/brose-logo.png" alt="Brose" style="position:absolute;left:150px;top:120px;width:250px;height:88px">'
            f'<div style="position:absolute;left:156px;top:330px;font-size:34px;font-weight:600;color:#5B6572">BMS en un clic · video {number} de 4</div>'
            f'<div id="{cid}-t" data-hold style="position:absolute;left:150px;top:390px;width:1600px;font-size:128px;font-weight:700;line-height:1.04;letter-spacing:-0.025em">{words}</div>'
            f'<div id="{cid}-s" style="position:absolute;left:156px;top:690px;width:1400px;font-size:38px;font-weight:400;color:#4B5563">{subtitle}</div>')
    js = [f"tl.fromTo('#{cid}-bar',{{scaleY:0}},{{scaleY:1,duration:.7,ease:'expo.out'}},0);",
          f"tl.fromTo('#{cid}-s',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.3}},.5);",
          f"tl.to('#{cid}-t, #{cid}-s, #{cid}-bar',{{opacity:0,filter:'blur(10px)',duration:.25,ease:'power2.in'}},4.2);"]
    return Card(cid, body, js, 4.5, sfx=[(0, "whoosh.mp3", .57, .5, False)])


def end_card(cid, claim, accent, next_title=None):
    words = " ".join(f'<span class="w"{" style=\"color:#CE003A\"" if w in accent else ""}>{w}</span>' for w in claim.split())
    nxt = (f'<div id="{cid}-n" style="position:absolute;left:0;top:820px;width:1920px;text-align:center;font-size:36px;font-weight:500;color:#5B6572">'
           f'Siguiente video: <span style="color:#1E2833;font-weight:600">{next_title}</span></div>') if next_title else ""
    body = (f'<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;background:#fff"></div>'
            f'<div id="{cid}-c" style="position:absolute;left:0;top:420px;width:1920px;text-align:center;font-size:120px;font-weight:700;letter-spacing:-0.025em">{words}</div>'
            f'<img id="{cid}-logo" src="assets/img/brose-logo.png" alt="Brose" style="position:absolute;left:600px;top:330px;width:720px;height:253px">'
            f'<div id="{cid}-sub" style="position:absolute;left:0;top:640px;width:1920px;text-align:center;font-size:40px;font-weight:500;color:#5B6572">Brose Management System</div>' + nxt)
    js = [f"tl.fromTo('#{cid}-c .w',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.14,stagger:.1}},.1);",
          f"tl.to('#{cid}-c',{{opacity:0,filter:'blur(12px)',duration:.25,ease:'power2.in'}},2.7);",
          f"tl.fromTo('#{cid}-logo',{{clipPath:'inset(0% 100% 0% 0%)'}},{{clipPath:'inset(0% 0% 0% 0%)',duration:.85,ease:'power3.inOut'}},3.0);",
          f"tl.fromTo('#{cid}-sub',{{opacity:0}},{{opacity:1,duration:.3}},3.8);"]
    if next_title:
        js.append(f"tl.fromTo('#{cid}-n',{{opacity:0,filter:'blur(6px)'}},{{opacity:1,filter:'blur(0px)',duration:.25}},4.3);")
    return Card(cid, body, js, 7.2, sfx=[(1.8, "riser.mp3", 1.4, .35, False, 2.27), (3.0, "impact-bass-1.mp3", 2.1, .6, True)])
