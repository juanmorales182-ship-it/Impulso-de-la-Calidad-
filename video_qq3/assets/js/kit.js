/* QQ3 tutorial helpers. Every effect is a function of timeline time (seek-safe). */
(function () {
  const QK = {};

  /* ---- Typing: one onUpdate per timeline drives every typing job from tl.time() ---- */
  QK.typing = function (tl) {
    const jobs = [];
    const run = () => {
      const t = tl.time();
      for (const j of jobs) {
        const p = Math.max(0, Math.min(1, (t - j.start) / j.dur));
        const n = Math.round(p * j.text.length);
        const showCaret = t >= j.start - 0.3 && t < j.start + j.dur + 0.6;
        const s = t < j.start - 0.3 ? j.orig : j.text.slice(0, n);
        if (j.el.__last !== s + showCaret) {
          j.el.textContent = s;
          if (showCaret) { const c = document.createElement("span"); c.className = "caret"; j.el.appendChild(c); }
          j.el.__last = s + showCaret;
        }
      }
    };
    tl.eventCallback("onUpdate", run);
    const sets = [];
    const runSets = () => {
      const t = tl.time();
      for (const j of sets) {
        const v = t >= j.t ? j.text : j.old;
        if (j.el.__lastSet !== v) { j.el.innerHTML = v; j.el.__lastSet = v; }
      }
    };
    tl.eventCallback("onUpdate", () => { run(); runSets(); });
    return {
      set(sel, text, t) {
        const el = document.querySelector(sel);
        sets.push({ el, text, t, old: el.innerHTML });
        runSets();
      },
      add(sel, text, start, cps) {
        const el = document.querySelector(sel);
        const dur = Math.max(0.2, text.length / (cps || 22));
        jobs.push({ el, text, start, dur, orig: el.textContent });
        run();
        return start + dur;
      },
      run,
    };
  };

  /* ---- Measure an element in stage px (call before any tween is built) ---- */
  QK.box = function (sel) {
    const el = document.querySelector(sel);
    const host = el.closest("[data-composition-id]") || document.documentElement;
    const hr = host.getBoundingClientRect();
    const k = 1920 / (hr.width || 1920);
    const r = el.getBoundingClientRect();
    const b = { x: (r.left - hr.left) * k, y: (r.top - hr.top) * k, w: r.width * k, h: r.height * k };
    b.cx = b.x + b.w / 2; b.cy = b.y + b.h / 2;
    return b;
  };
  /* place a highlight box around a measured box */
  QK.place = function (sel, b, pad) {
    pad = pad == null ? 8 : pad;
    gsap.set(sel, { left: b.x - pad, top: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2 });
  };

  /* ---- Camera: focus stage point (px,py) at scale s, landing it at (cx,cy) ---- */
  QK.focus = function (tl, sel, px, py, s, t, dur, cx, cy, ease) {
    cx = cx == null ? 960 : cx; cy = cy == null ? 470 : cy;
    tl.to(sel, { scale: s, x: cx - s * px, y: cy - s * py, duration: dur, ease: ease || "power2.inOut" }, t);
  };
  QK.camReset = function (tl, sel, t, dur) {
    tl.to(sel, { scale: 1, x: 0, y: 0, duration: dur || 0.9, ease: "power2.inOut" }, t);
  };

  /* ---- Cursor ---- */
  QK.move = function (tl, sel, x, y, t, dur, ease) {
    tl.to(sel, { x: x, y: y, duration: dur || 0.8, ease: ease || "power3.inOut" }, t);
  };
  QK.click = function (tl, sel, t, ringSel) {
    tl.to(sel, { scale: 0.82, duration: 0.07, ease: "power2.in", transformOrigin: "4px 4px" }, t);
    tl.to(sel, { scale: 1, duration: 0.14, ease: "back.out(3)" }, t + 0.07);
    if (ringSel) {
      tl.fromTo(ringSel, { scale: 0.3, opacity: 0.95 }, { scale: 1.5, opacity: 0, duration: 0.45, ease: "power2.out" }, t);
    }
  };
  QK.dblclick = function (tl, sel, t, ringSel) {
    QK.click(tl, sel, t, ringSel);
    QK.click(tl, sel, t + 0.22, null);
  };

  /* ---- Highlight box drawn in ---- */
  QK.hl = function (tl, sel, t, out) {
    tl.fromTo(sel, { opacity: 0, scale: 1.18 }, { opacity: 1, scale: 1, duration: 0.45, ease: "expo.out" }, t);
    if (out != null) tl.to(sel, { opacity: 0, duration: 0.25, ease: "power2.in" }, out);
  };

  /* ---- Instruction card ---- */
  QK.instr = function (tl, sel, t, out) {
    tl.fromTo(sel, { y: 190, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out" }, t);
    tl.fromTo(sel + " .num", { scale: 0.2, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2.2)" }, t + 0.15);
    tl.fromTo(sel + " .txt:not(.alt)", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.35, ease: "power2.out" }, t + 0.25);
    if (out != null) tl.to(sel, { y: 190, opacity: 0, duration: 0.4, ease: "power3.in" }, out);
  };
  /* swap the text inside an instruction card */
  QK.instrSwap = function (tl, fromSel, toSel, t) {
    tl.to(fromSel, { opacity: 0, filter: "blur(8px)", duration: 0.18, ease: "power2.in" }, t);
    tl.fromTo(toSel, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.3, ease: "power2.out" }, t + 0.16);
  };

  /* ---- Chapter card: blue flood in, text, then the card shrinks away ---- */
  QK.chapter = function (tl, p, t, hold) {
    const c = "#" + p + "-chap";
    tl.fromTo(c, { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(80% at 50% 50%)", duration: 0.55, ease: "power2.inOut" }, t);
    tl.fromTo(c + " .step", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" }, t + 0.35);
    tl.fromTo(c + " .big", { opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.35, ease: "power2.out" }, t + 0.45);
    tl.fromTo(c + " .sub", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, t + 0.75);
    tl.fromTo(c + " .stripe", { x: -300 }, { x: 0, duration: 1.2, ease: "expo.out" }, t);
    const end = t + hold;
    tl.to(c, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.55, ease: "power3.in" }, end);
    return end + 0.55;
  };

  /* ---- Mascot rig ---- */
  QK.quali = function (tl, p) {
    const q = (s) => "#" + p + "-" + s;
    const api = {
      pop(t, fromY) {
        tl.fromTo(q("rig"), { opacity: 0 }, { opacity: 1, duration: 0.05 }, t);
        tl.fromTo(q("shadow"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 0.16, duration: 0.5, ease: "expo.out", svgOrigin: "100 232" }, t + 0.25);
        tl.fromTo(q("rig"), { y: fromY == null ? 260 : fromY, scaleY: 1.25, scaleX: 0.8 },
          { y: 0, scaleY: 1, scaleX: 1, duration: 0.75, ease: "back.out(1.6)", transformOrigin: "50% 100%" }, t);
        tl.fromTo(q("armR"), { rotation: 0 }, { rotation: -150, duration: 0.35, ease: "back.out(2)", svgOrigin: "150 158" }, t + 0.35);
        tl.to(q("armR"), { rotation: -120, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut", svgOrigin: "150 158" }, t + 0.7);
        tl.to(q("armR"), { rotation: 0, duration: 0.4, ease: "power2.inOut", svgOrigin: "150 158" }, t + 1.45);
        return api;
      },
      leave(t) {
        tl.to(q("shadow"), { scale: 0, opacity: 0, duration: 0.3, ease: "power2.in", svgOrigin: "100 232" }, t + 0.12);
        tl.to(q("rig"), { scaleY: 0.85, scaleX: 1.1, duration: 0.12, ease: "power2.out", transformOrigin: "50% 100%" }, t);
        tl.to(q("rig"), { y: 700, scaleY: 1.15, scaleX: 0.9, duration: 0.45, ease: "power3.in" }, t + 0.12);
        tl.to(q("rig"), { opacity: 0, duration: 0.05 }, t + 0.57);
        return api;
      },
      idle(t0, t1) {
        const cyc = 2.4, n = Math.max(1, Math.floor((t1 - t0) / cyc));
        tl.fromTo(q("body"), { y: 0 }, { y: 4, duration: cyc / 2, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut" }, t0);
        tl.fromTo(q("headbob"), { y: 0 }, { y: 5, duration: cyc / 2, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut" }, t0 + 0.15);
        tl.fromTo(q("bulb"), { scale: 1 }, { scale: 1.12, duration: cyc / 2, yoyo: true, repeat: n * 2 - 1, ease: "sine.inOut", svgOrigin: "100 16" }, t0 + 0.3);
        return api;
      },
      blink(times) {
        for (const t of times) {
          tl.to(q("eyes"), { scaleY: 0.1, duration: 0.06, ease: "power2.in", svgOrigin: "100 96" }, t);
          tl.to(q("eyes"), { scaleY: 1, duration: 0.1, ease: "power2.out", svgOrigin: "100 96" }, t + 0.08);
        }
        return api;
      },
      point(t, dur, side) {
        const arm = side === "L" ? q("armL") : q("armR");
        const org = side === "L" ? "50 158" : "150 158";
        const ang = side === "L" ? 75 : -75;
        tl.to(arm, { rotation: ang * 1.15, duration: 0.25, ease: "power3.out", svgOrigin: org }, t);
        tl.to(arm, { rotation: ang, duration: 0.3, ease: "back.out(2)", svgOrigin: org }, t + 0.25);
        tl.to(q("head"), { rotation: side === "L" ? -6 : 6, duration: 0.4, ease: "power2.out", svgOrigin: "100 150" }, t + 0.05);
        tl.to(arm, { rotation: 0, duration: 0.4, ease: "power2.inOut", svgOrigin: org }, t + dur);
        tl.to(q("head"), { rotation: 0, duration: 0.4, ease: "power2.inOut", svgOrigin: "100 150" }, t + dur + 0.05);
        return api;
      },
      happy(t) {
        tl.to(q("eyes"), { opacity: 0, duration: 0.08 }, t);
        tl.to(q("eyesHappy"), { opacity: 1, duration: 0.08 }, t);
        tl.to(q("rig"), { scaleY: 0.86, scaleX: 1.08, duration: 0.12, ease: "power2.out", transformOrigin: "50% 100%" }, t);
        tl.to(q("rig"), { y: -70, scaleY: 1.1, scaleX: 0.93, duration: 0.28, ease: "power2.out" }, t + 0.12);
        tl.to(q("rig"), { y: 0, scaleY: 1, scaleX: 1, duration: 0.42, ease: "bounce.out" }, t + 0.4);
        tl.to(q("armL"), { rotation: 140, duration: 0.3, ease: "back.out(2)", svgOrigin: "50 158" }, t + 0.1);
        tl.to(q("armR"), { rotation: -140, duration: 0.3, ease: "back.out(2)", svgOrigin: "150 158" }, t + 0.16);
        tl.to(q("armL"), { rotation: 0, duration: 0.4, ease: "power2.inOut", svgOrigin: "50 158" }, t + 1.0);
        tl.to(q("armR"), { rotation: 0, duration: 0.4, ease: "power2.inOut", svgOrigin: "150 158" }, t + 1.05);
        tl.to(q("eyesHappy"), { opacity: 0, duration: 0.08 }, t + 1.3);
        tl.to(q("eyes"), { opacity: 1, duration: 0.08 }, t + 1.3);
        return api;
      },
      worry(t, dur) {
        tl.to(q("mouth"), { opacity: 0, duration: 0.06 }, t);
        tl.to(q("mouthOh"), { opacity: 1, duration: 0.06 }, t);
        tl.to(q("rig"), { x: -10, duration: 0.05, yoyo: true, repeat: 5, ease: "sine.inOut" }, t);
        tl.to(q("sweat"), { opacity: 1, y: 10, duration: 0.5, ease: "power2.in" }, t + 0.1);
        tl.to(q("armL"), { rotation: 30, duration: 0.25, ease: "back.out(2)", svgOrigin: "50 158" }, t);
        tl.to(q("armR"), { rotation: -30, duration: 0.25, ease: "back.out(2)", svgOrigin: "150 158" }, t + 0.04);
        tl.to(q("mouthOh"), { opacity: 0, duration: 0.06 }, t + dur);
        tl.to(q("mouth"), { opacity: 1, duration: 0.06 }, t + dur);
        tl.to(q("sweat"), { opacity: 0, duration: 0.2 }, t + dur);
        tl.to(q("armL"), { rotation: 0, duration: 0.35, ease: "power2.inOut", svgOrigin: "50 158" }, t + dur);
        tl.to(q("armR"), { rotation: 0, duration: 0.35, ease: "power2.inOut", svgOrigin: "150 158" }, t + dur);
        return api;
      },
      say(sel, t, out) {
        tl.fromTo(sel, { opacity: 0, scale: 0.6, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.8)" }, t);
        if (out != null) tl.to(sel, { opacity: 0, scale: 0.9, duration: 0.22, ease: "power2.in" }, out);
        return api;
      },
    };
    return api;
  };

  window.QK = QK;
})();
