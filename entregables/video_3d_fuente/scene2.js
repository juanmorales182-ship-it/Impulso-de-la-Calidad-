import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// =====================================================================================
//  basics
// =====================================================================================
const Q = new URLSearchParams(location.search);
const TEXT = Q.get('text') !== '0';
const DURATION = 125;
window.DURATION = DURATION;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1920, 1080, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd9e2ea);
scene.fog = new THREE.Fog(0xd9e2ea, 170, 360);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(40, 1920 / 1080, 0.1, 800);

const W = (x, y, h = 0) => new THREE.Vector3(x - 180, h, -(y - 205));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = u => u * u * u * (u * (u * 6 - 15) + 10);
const ease = u => (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const prog = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
const sprog = (t, a, b) => smooth(clamp((t - a) / (b - a), 0, 1));
const lin = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const T = (px, py) => [0.0961930509 * px - 6.85976048e-05 * py + 124.289885,
                       2.90413940e-04 * px - 0.0963294995 * py + 249.134654];

// lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96a3, 0.55));
const sun = new THREE.DirectionalLight(0xfff3e0, 2.1);
sun.position.copy(W(148, 168, 95));
sun.target.position.copy(W(182, 206, 0));
scene.add(sun, sun.target);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 10, far: 260 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;

// =====================================================================================
//  helpers
// =====================================================================================
const matCache = {};
function mat(color, opacity = 1, extra = {}) {
  const k = color + ':' + opacity + ':' + JSON.stringify(extra);
  if (!matCache[k]) matCache[k] = new THREE.MeshStandardMaterial({
    color, roughness: .78, metalness: .05, envMapIntensity: .6, transparent: opacity < 1, opacity, ...extra });
  return matCache[k];
}
const metal = c => mat(c, 1, { roughness: .45, metalness: .55 });
function box(x0, y0, x1, y1, h, color, o = {}) {
  const z = o.z || 0;
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), h, Math.abs(y1 - y0)), o.material || mat(color, o.opacity ?? 1));
  m.position.copy(W((x0 + x1) / 2, (y0 + y1) / 2, z + h / 2));
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  (o.parent || scene).add(m); return m;
}
function lb(parent, sx, sy, sz, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof material === 'number' ? mat(material) : material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cyl(parent, r, h, material, x, y, z, axis = 'y', seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), typeof material === 'number' ? mat(material) : material);
  if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}
const WALL = 0xcfd6de, WALL_IN = 0xdfe4ea;
function wallH(y, x0, x1, gaps = [], h = 3.6, color = WALL, th = .22) {
  let cur = x0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) { if (a > cur) box(cur, y - th / 2, a, y + th / 2, h, color); cur = Math.max(cur, b); }
  if (x1 > cur) box(cur, y - th / 2, x1, y + th / 2, h, color);
}
function wallV(x, y0, y1, gaps = [], h = 3.6, color = WALL, th = .22) {
  let cur = y0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) { if (a > cur) box(x - th / 2, cur, x + th / 2, a, h, color); cur = Math.max(cur, b); }
  if (y1 > cur) box(x - th / 2, cur, x + th / 2, y1, h, color);
}
function flat(x0, y0, x1, y1, material, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0)), material);
  m.rotation.x = -Math.PI / 2; m.position.copy(W((x0 + x1) / 2, (y0 + y1) / 2, h)); m.receiveShadow = true;
  scene.add(m); return m;
}
function area(x0, y0, x1, y1, color, opacity = .2) {
  return flat(x0, y0, x1, y1, new THREE.MeshStandardMaterial({ color, transparent: true, opacity, depthWrite: false, roughness: .35, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -1 }), .012);
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// smooth path: fillet corners (radius r) and sample densely
function fillet(pts, r = 1.0) {
  if (pts.length < 3) return pts.map(p => [...p]);
  const out = [[...pts[0]]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], [cx, cy] = pts[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by);
    const d = Math.min(r, l1 / 2, l2 / 2);
    const p0 = [bx + (ax - bx) / l1 * d, by + (ay - by) / l1 * d], p2 = [bx + (cx - bx) / l2 * d, by + (cy - by) / l2 * d];
    out.push(p0);
    for (let k = 1; k < 10; k++) {
      const u = k / 10, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      out.push([a * p0[0] + b * bx + c * p2[0], a * p0[1] + b * by + c * p2[1]]);
    }
    out.push(p2);
  }
  out.push([...pts[pts.length - 1]]);
  return out;
}
function polyAt(pts, u) {
  const seg = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let s = clamp(u, 0, 1) * L;
  for (let i = 0; i < seg.length; i++) {
    if (s <= seg[i] + 1e-9 || i === seg.length - 1) {
      const k = seg[i] ? clamp(s / seg[i], 0, 1) : 0;
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, hd: Math.atan2(by - ay, bx - ax), L };
    }
    s -= seg[i];
  }
}

// =====================================================================================
//  ground, floor plan, areas, tape, walkways
// =====================================================================================
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat(0xb9c2ca, 1, { roughness: .95 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.03; ground.receiveShadow = true; scene.add(ground);
const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, metalness: 0, envMapIntensity: .35 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const ready = new Promise(res => new THREE.TextureLoader().load('./floor.jpg', tex => {
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; floorMat.map = tex; floorMat.needsUpdate = true; res();
}));

area(159.4, 215.3, 170.4, 223.3, 0x3d7fd1);            // recibo
area(170.4, 215.3, 186.3, 223.3, 0x1f9e8f);            // MP
area(186.3, 215.3, 193.4, 223.3, 0x7a8590);            // mantenimiento
area(193.4, 215.3, 202.5, 223.3, 0x5d6670);            // compresor
area(162.47, 199.35, 188.47, 212.35, 0x2f9e5b, .26);   // produccion (piso epóxico)
area(188.5, 199.35, 194.4, 212.35, 0xe08a2c);          // empaque
area(194.4, 199.35, 202.5, 212.35, 0x8455c7);          // PT
area(196.4, 189.2, 202.5, 196.3, 0xd9a521);            // embarques
area(159.4, 189.2, 196.4, 196.3, 0xa7b1bb, .15);       // oficinas
area(155.5, 201.8, 159.4, 208.9, 0x8a6a3e, .25);       // residuos

const TAPE = 0xf5c400, TW = .1;
const tapeMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .5, polygonOffset: true, polygonOffsetFactor: -3 });
function tapeH(y, x0, x1, c = TAPE) { flat(x0, y - TW / 2, x1, y + TW / 2, tapeMat(c), .026); }
function tapeV(x, y0, y1, c = TAPE) { flat(x - TW / 2, y0, x + TW / 2, y1, tapeMat(c), .026); }
function tapeRect(x0, y0, x1, y1, c = TAPE) { tapeH(y0, x0, x1, c); tapeH(y1, x0, x1, c); tapeV(x0, y0, y1, c); tapeV(x1, y0, y1, c); }
// open areas delimited by yellow tape
tapeH(215.45, 159.5, 167.4); tapeH(215.45, 168.55, 186.2); tapeV(170.4, 215.5, 223.2);
tapeRect(160.5, 215.6, 162.5, 218.5, 0xd93a3a);                                   // cuarentena (roja)
tapeRect(162.47, 199.35, 188.47, 212.35);                                         // producción
tapeH(212.2, 188.6, 202.4); tapeV(194.4, 199.45, 212.15);
tapeH(199.45, 188.6, 202.4); tapeV(196.5, 196.4, 199.4);
tapeH(196.4, 196.5, 202.4);
// ESD zone (magenta tape)
{ const [x0, y0] = T(517, 414), [x1, y1] = T(566, 503); tapeRect(x0, y1, x1, y0, 0xc23ac2); }

// pedestrian walkways (layer PASILLOS)
const WALK = 0x3f9a4a;
const walkMat = new THREE.MeshStandardMaterial({ color: WALK, roughness: .55, transparent: true, opacity: .9, polygonOffset: true, polygonOffsetFactor: -2 });
const pedTex = canvasTex(256, 256, g => {
  g.fillStyle = '#ffffff'; g.lineCap = 'round'; g.lineWidth = 20; g.strokeStyle = '#fff';
  g.beginPath(); g.arc(140, 46, 24, 0, 7); g.fill();
  g.beginPath(); g.moveTo(132, 82); g.lineTo(118, 150); g.lineTo(80, 222); g.moveTo(118, 150); g.lineTo(160, 222);
  g.moveTo(130, 96); g.lineTo(88, 128); g.moveTo(130, 96); g.lineTo(172, 132); g.stroke();
});
const pedMat = new THREE.MeshBasicMaterial({ map: pedTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -4 });
for (const [x0, y0, x1, y1] of [
  [160.47, 214.35, 202.4, 215.25], [159.5, 197.35, 160.47, 214.35], [160.47, 196.35, 196.4, 197.35], [167.47, 215.36, 168.47, 219.25],
  [158.47, 188.25, 159.4, 198.76], [155.86, 197.76, 158.47, 198.76], [160.52, 188.25, 196.47, 189.2],
  [159.47, 178.25, 160.52, 188.25], [149.47, 178.25, 159.47, 179.25], [149.47, 179.25, 150.47, 182.25], [145.47, 181.25, 149.47, 182.25],
]) {
  flat(x0, y0, x1, y1, walkMat, .02);
  const horiz = (x1 - x0) > (y1 - y0);
  if (horiz) { tapeH(y0 + .05, x0, x1, 0xffffff); tapeH(y1 - .05, x0, x1, 0xffffff); }
  else { tapeV(x0 + .05, y0, y1, 0xffffff); tapeV(x1 - .05, y0, y1, 0xffffff); }
  const L = Math.max(x1 - x0, y1 - y0), n = Math.floor(L / 7);
  for (let i = 0; i < n; i++) {
    const u = (i + .5) / n, cx = horiz ? x0 + (x1 - x0) * u : (x0 + x1) / 2, cy = horiz ? (y0 + y1) / 2 : y0 + (y1 - y0) * u;
    const p = flat(cx - .4, cy - .4, cx + .4, cy + .4, pedMat, .03);
    if (!horiz) p.rotation.z = Math.PI / 2;
  }
}

// =====================================================================================
//  building: only exterior + enclosed rooms (production, recibo, MP, empaque, PT, embarques are open)
// =====================================================================================
wallH(223.3, 159.4, 202.5, [[175.0, 178.0], [178.6, 181.4], [182.7, 185.7]]);
wallH(189.2, 159.4, 202.5, [[197.8, 200.8], [188.6, 189.6], [168.6, 169.6]]);
wallV(159.4, 189.2, 223.3, [[213.9, 215.0], [197.6, 198.8], [190.0, 191.2], [204.5, 206.0]]);
wallV(202.5, 189.2, 223.3, [[221.0, 222.1], [210.8, 211.9]]);
wallH(215.3, 186.3, 202.5, [[192.6, 194.4]], 3.0, WALL_IN);                 // mantenimiento + compresor
wallV(186.3, 215.3, 223.3, [], 3.0, WALL_IN);
wallV(193.4, 215.3, 223.3, [], 3.0, WALL_IN);
wallH(219.6, 164.8, 168.6, [[167.5, 168.5]], 2.6, WALL_IN);                  // oficinas de recibo
wallV(164.8, 219.6, 223.3, [], 2.6, WALL_IN); wallV(168.6, 219.6, 223.3, [], 2.6, WALL_IN);
wallH(196.3, 159.4, 196.4, [[168.6, 169.6], [174.0, 175.0], [185.5, 186.5]], 2.8, WALL_IN);   // oficinas / servicios
wallV(169.4, 189.2, 196.3, [], 2.8, WALL_IN); wallV(179.4, 189.2, 196.3, [], 2.8, WALL_IN);
wallV(183.4, 189.2, 196.3, [], 2.8, WALL_IN); wallV(196.4, 189.2, 196.3, [], 2.8, WALL_IN);
wallV(155.5, 201.8, 208.9, [], 2.2, 0xb79e7c); wallH(201.8, 155.5, 159.4, [], 2.2, 0xb79e7c); wallH(208.9, 155.5, 159.4, [], 2.2, 0xb79e7c);
for (const [x, c] of [[156.8, 0x2d6db5], [156.8, 0x3b9a4c], [156.8, 0xc94a4a], [156.8, 0xf0b429]].map((v, i) => [v[0], v[1], i]))
  0;
[[202.4, 0x2d6db5], [204.0, 0x3b9a4c], [205.6, 0xc94a4a], [207.2, 0xf0b429]].forEach(([y, c]) => box(156.2, y, 157.4, y + 1.2, 1.1, c));
// dock doors: frames + bumpers
for (const [a, b] of [[175.0, 178.0], [178.6, 181.4], [182.7, 185.7], [197.8, 200.8]]) {
  const y = a > 190 ? 189.2 : 223.3;
  box(a, y - .15, a + .12, y + .15, 3.6, 0x59636e); box(b - .12, y - .15, b, y + .15, 3.6, 0x59636e);
  box(a, y - .15, b, y + .15, .5, 0x59636e, { z: 3.1 });
  box(a + .3, y - .3, a + .55, y + .3, .35, 0x111111, { z: .9 }); box(b - .55, y - .3, b - .3, y + .3, .35, 0x111111, { z: .9 });
}

// =====================================================================================
//  props
// =====================================================================================
const LOADS = [0x2d6db5, 0x3b8fd4, 0x2a9d8f, 0x5a7ec9, 0x4a90a4];
const wrapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .22, roughness: .15, metalness: 0, envMapIntensity: 1.2, depthWrite: false });
function pallet(load = 0x2d6db5, loadH = .9, cartons = false) {
  const g = new THREE.Group();
  for (const z of [-.42, 0, .42]) lb(g, 1.2, .1, .14, 0xa97b4b, 0, .05, z);
  lb(g, 1.2, .04, 1.0, 0xc19363, 0, .12, 0);
  if (loadH > 0) {
    const rows = cartons ? 2 : 3;
    for (const dx of [-.29, .29]) for (const dz of [-.24, .24]) for (let r = 0; r < rows; r++)
      lb(g, .56, loadH / rows - .02, .47, cartons ? 0xc8955c : load, dx, .14 + (r + .5) * loadH / rows, dz);
    if (!cartons) { const w = new THREE.Mesh(new THREE.BoxGeometry(1.18, loadH + .02, .99), wrapMat); w.position.y = .14 + loadH / 2; g.add(w); }
    else for (const dx of [-.29, .29]) for (const dz of [-.24, .24]) lb(g, .57, .012, .06, 0xd9b48a, dx, .14 + loadH + .003, dz);
  }
  scene.add(g); return g;
}
function place(obj, x, y, h = 0, rot = 0) { obj.position.copy(W(x, y, h)); obj.rotation.y = rot; }
function rack(cx, cy, lx, ly, h, levels, upright = 0x1f4f99, beam = 0xe8742a) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) lb(g, .08, h, .08, metal(upright), sx * (lx / 2 - .05), h / 2, sy * (ly / 2 - .05));
  for (const sx of [-1, 1]) for (let k = 1; k < 6; k++) lb(g, .03, .03, ly - .1, metal(upright), sx * (lx / 2 - .05), k * h / 6, 0);
  for (const lv of levels) { if (lv < .2) continue; for (const sy of [-1, 1]) lb(g, lx, .1, .06, metal(beam), 0, lv - .05, sy * (ly / 2 - .05)); }
  g.position.copy(W(cx, cy, 0)); scene.add(g); return g;
}

// people with limbs
function person(shirt = 0x2f6fb3, hat = 0xf2c230, vest = true) {
  const g = new THREE.Group();
  const legM = mat(0x2b3440);
  const mkLimb = (r, len, m) => { const p = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .9, len, 10), m); c.position.y = -len / 2; c.castShadow = true; p.add(c); return p; };
  const legL = mkLimb(.08, .82, legM), legR = mkLimb(.08, .82, legM);
  legL.position.set(0, .84, -.1); legR.position.set(0, .84, .1); g.add(legL, legR);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(.19, .17, .62, 14), mat(shirt)); torso.position.y = 1.15; torso.castShadow = true; g.add(torso);
  if (vest) { const v = new THREE.Mesh(new THREE.CylinderGeometry(.2, .18, .4, 14), mat(0xf0f23a, 1, { emissive: 0x2a2a00 })); v.position.y = 1.2; g.add(v); }
  const armM = mat(shirt);
  const armL = mkLimb(.06, .6, armM), armR = mkLimb(.06, .6, armM);
  armL.position.set(0, 1.42, -.24); armR.position.set(0, 1.42, .24); g.add(armL, armR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), mat(0xd9a77f)); head.position.y = 1.6; head.castShadow = true; g.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.145, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(hat, 1, { roughness: .4 }));
  helmet.position.y = 1.63; g.add(helmet);
  g.userData = { legL, legR, armL, armR };
  scene.add(g); return g;
}
function walkPose(p, phase, amp = .5) { p.userData.legL.rotation.z = Math.sin(phase) * amp; p.userData.legR.rotation.z = -Math.sin(phase) * amp;
  p.userData.armL.rotation.z = -Math.sin(phase) * amp * .8; p.userData.armR.rotation.z = Math.sin(phase) * amp * .8; }
function workPose(p, t, active) { const a = active ? .6 + .25 * Math.sin(t * 7) : .15; p.userData.armL.rotation.z = a; p.userData.armR.rotation.z = active ? .6 + .25 * Math.sin(t * 7 + 1.7) : .15;
  p.userData.legL.rotation.z = 0; p.userData.legR.rotation.z = 0; }

function forklift(color = 0xf2b705) {
  const g = new THREE.Group();
  const body = mat(color, 1, { roughness: .45, metalness: .2 });
  lb(g, 1.35, .5, .98, body, -.05, .52, 0);
  const cw = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .98, 20, 1, false, Math.PI, Math.PI), mat(0x30353b, 1, { roughness: .5, metalness: .4 }));
  cw.rotation.x = Math.PI / 2; cw.position.set(-.65, .72, 0); cw.scale.set(.75, 1, 1); cw.castShadow = true; g.add(cw);
  lb(g, .4, .45, .98, 0x30353b, -.62, .6, 0);
  for (const sx of [-.6, .3]) for (const sz of [-.42, .42]) lb(g, .05, 1.25, .05, metal(0x24282d), sx, 1.4, sz);
  lb(g, .98, .05, .94, metal(0x24282d), -.15, 2.04, 0);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff8a00, emissive: 0xff6a00, emissiveIntensity: 1 }));
  beacon.position.set(-.5, 2.12, 0); g.add(beacon);
  lb(g, .4, .1, .45, 0x1d2126, -.25, .82, 0); lb(g, .1, .45, .45, 0x1d2126, -.45, 1.05, 0);
  const drv = person(0x34495e, 0xf2c230, true); scene.remove(drv); drv.scale.setScalar(.92); drv.position.set(-.25, .1, 0); drv.rotation.y = 0;
  drv.userData.legL.rotation.z = 1.4; drv.userData.legR.rotation.z = 1.4; drv.userData.armL.rotation.z = 1.0; drv.userData.armR.rotation.z = 1.0; g.add(drv);
  lb(g, .05, .35, .05, 0x111111, .15, 1.1, .1);  // steering column
  const wheels = [];
  for (const [x, z, r] of [[.42, -.47, .26], [.42, .47, .26], [-.55, -.45, .2], [-.55, .45, .2]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .2, 18), mat(0x1b1e22)); w.rotation.x = Math.PI / 2; w.position.set(x, r, z); w.castShadow = true;
    g.add(w); wheels.push(w);
  }
  for (const sz of [-.33, .33]) lb(g, .09, 2.4, .07, metal(0x2b2f35), .68, 1.22, sz);
  const carriage = new THREE.Group();
  lb(carriage, .05, .55, .85, metal(0x2b2f35), .74, .28, 0);
  for (const sz of [-.25, .25]) lb(carriage, 1.1, .045, .1, metal(0x2b2f35), 1.3, .02, sz);
  g.add(carriage);
  g.userData = { carriage, beacon, wheels };
  scene.add(g); return g;
}
function trailer(cx, rearY, dir, opacity = 1) {
  const g = new THREE.Group();
  const L = 13, Wd = 2.6, H = 3.5, z0 = .15, c = 0xf4f6f8;
  lb(g, Wd, .1, L, mat(0x9aa3ad, opacity), 0, z0, -L / 2);
  lb(g, Wd, .08, L, mat(c, opacity), 0, z0 + H, -L / 2);
  lb(g, .06, H, L, mat(c, opacity), -Wd / 2, z0 + H / 2, -L / 2);
  lb(g, .06, H, L, mat(c, opacity), Wd / 2, z0 + H / 2, -L / 2);
  lb(g, Wd, H, .06, mat(c, opacity), 0, z0 + H / 2, -L);
  for (const s of [-1, 1]) lb(g, .02, .25, L - .4, mat(0x1f4f99, opacity), s * (Wd / 2 + .04), z0 + H - .5, -L / 2);
  lb(g, 2.5, 2.6, 2.6, mat(0xc0392b, 1, { roughness: .35, metalness: .3 }), 0, 1.75, -L - 1.6);
  lb(g, 2.3, .9, 1.0, mat(0x9fb6c9, 1, { roughness: .1, metalness: .5 }), 0, 2.45, -L - .25);
  lb(g, 2.4, .9, 1.6, 0x22262b, 0, .55, -L - 3.3);
  for (const zz of [-1.0, -2.2, -L - .8, -L - 3.0]) for (const xx of [-1.05, 1.05]) cyl(g, .5, .35, 0x1b1e22, xx, .5, zz, 'x', 18);
  g.position.copy(W(cx, rearY, 0)); g.rotation.y = dir > 0 ? 0 : Math.PI;
  scene.add(g); return g;
}
trailer(176.5, 223.5, 1); trailer(184.2, 223.5, 1);
const southTrailer = trailer(199.3, 189.0, -1, .5);
const southTrailerBase = southTrailer.position.clone();

for (const [x, y, c] of [[166.2, 180.0, 0x9aa3ad], [168.9, 180.0, 0xb03a2e], [186.6, 180.4, 0x2c3e50], [174.0, 184.6, 0xecf0f1], [191.2, 184.6, 0x34495e]]) {
  const car = new THREE.Group();
  lb(car, 1.8, .7, 4.4, mat(c, 1, { roughness: .3, metalness: .5 }), 0, .55, 0);
  lb(car, 1.6, .55, 2.2, mat(0x2b3440, 1, { roughness: .1, metalness: .6 }), 0, 1.15, -.2);
  for (const zz of [-1.4, 1.4]) for (const xx of [-.9, .9]) cyl(car, .33, .25, 0x15181b, xx, .33, zz, 'x');
  car.position.copy(W(x, y)); scene.add(car);
}
box(152.3, 189.5, 154.9, 198.6, 3.0, 0xf1f3f5);

// =====================================================================================
//  areas content
// =====================================================================================
const MPX = [172.2, 174.7, 177.2, 179.7, 182.2], MPY = [216.25, 219.75];
for (const x of MPX) for (const y of MPY) {
  rack(x, y, 2.4, 1.25, 3.3, [.12, 1.65, 3.2]);
  for (const lv of [.12, 1.65]) {
    if (x === 172.2 && y === 219.75 && lv === 1.65) continue;
    const p = pallet(LOADS[(Math.round(x * 3 + y + lv * 7)) % LOADS.length], .85); place(p, x, y, lv);
  }
}
for (const [x, y] of [[160.4, 222.6], [161.8, 222.6], [163.2, 222.6]]) place(pallet(0x4a90a4, .8), x, y);
for (const x of [190.2, 191.6, 193.0]) { rack(x, 218.6, .5, 2.6, 2.2, [.6, 1.3, 2.0], 0x5c6773, 0x8d99a6); for (const lv of [.62, 1.32]) box(x - .2, 217.5, x + .2, 219.7, .3, 0x9aa7b4, { z: lv }); }
box(188.4, 221.4, 189.8, 222.2, .9, 0x7b8794); box(191.2, 221.6, 192.2, 222.4, .9, 0x7b8794);
for (const y of [221.5, 222.0, 222.5, 223.0]) box(186.6, y - .18, 187.1, y + .18, .9, 0xc0392b);
for (const [a, b] of [[194.6, 195.9], [196.9, 198.2], [199.4, 200.7]]) { box(a, 216.4, b, 218.3, 1.6, 0x4f6d8a, { material: metal(0x4f6d8a) }); box(a + .2, 216.6, b - .2, 218.1, .25, 0x8fa3b5, { z: 1.6 }); }
cyl(scene, .9, 2.6, metal(0x9aa7b4), ...W(201.4, 219.8, 1.3).toArray(), 'y', 28);

// production line
const ST = [167.2, 171.25, 175.3, 179.4, 183.3];
const stationRings = [], rams = [], andons = [], operators = [];
ST.forEach((s, i) => {
  if (i < 4) {
    box(s - .7, 204.2, s + .7, 206.7, 1.9, 0, { material: metal(0x3f5f9e) });
    box(s - .55, 204.6, s + .55, 206.3, .5, 0, { material: metal(0x2e4675), z: 1.9 });
    rams.push(box(s - .18, 205.15, s + .18, 205.85, .35, 0, { material: metal(0xc9d1d9), z: 1.05 }));
    box(s - .62, 204.15, s + .62, 204.2, .9, 0xffd400, { z: .6, opacity: .9 });     // guard
  } else {
    box(s - .4, 204.2, s + .4, 206.5, 1.7, 0, { material: metal(0xc8553a) });
    rams.push(box(s - .06, 205.4, s + .06, 205.9, .45, 0, { material: metal(0x2b2f35), z: 1.15 }));
  }
  const pole = box(s + .55, 206.35, s + .6, 206.4, 2.3, 0x2b2f35);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .22, 14), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: .2 }));
  lamp.position.copy(W(s + .575, 206.375, 2.42)); scene.add(lamp); andons.push(lamp);
  box(s - .7, 209.9, s + .7, 211.4, 1.0, 0, { material: mat(0x2f8f5f, 1, { roughness: .4 }) });
  for (let k = 0; k < 6; k++) box(s - .6 + k * .22, 210.0, s - .45 + k * .22, 211.3, .12, LOADS[k % 5], { z: 1.0 });
  box(s - .2, 206.7, s + .2, 209.9, .78, 0, { material: metal(0x8a9099) });
  box(s + .6, 203.3, s + 1.5, 204.1, .06, 0xe8ebee, { z: .84, material: metal(0xd5dbe1) });
  for (const [dx, dy] of [[.62, 203.35], [1.45, 203.35], [.62, 204.05], [1.45, 204.05]]) box(s + dx - .02, dy - .02, s + dx + .02, dy + .02, .84, 0x6b7280);
  const op = person(0x2563eb, 0xf2c230, false); place(op, s + 1.05, 202.95, 0, Math.PI / 2); operators.push(op);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.8, 48), new THREE.MeshBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.copy(W(s + .5, 204.6, .04)); scene.add(ring); stationRings.push(ring);
});
const beltTex = canvasTex(64, 64, g => { g.fillStyle = '#25292e'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3a4048'; for (let i = 0; i < 64; i += 16) g.fillRect(i, 0, 6, 64); });
beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping; beltTex.repeat.set(12, 1);
const beltMat = new THREE.MeshStandardMaterial({ map: beltTex, roughness: .7 });
for (let i = 0; i < 4; i++) {
  const a = ST[i] + .7, b = ST[i + 1] - (i + 1 < 4 ? .7 : .4);
  box(a, 205.3, b, 206.1, .78, 0, { material: metal(0x59626d) });
  const belt = flat(a, 205.36, b, 206.04, beltMat, .79); belt.castShadow = false;
  for (const x of [a + .2, b - .2]) for (const y of [205.32, 206.08]) box(x - .03, y - .03, x + .03, y + .03, .78, 0x2b2f35);
}
// empaque
box(189.0, 207.0, 192.0, 209.5, .9, 0, { material: metal(0xcfd5db) }); box(189.0, 200.1, 192.0, 202.6, .9, 0, { material: metal(0xcfd5db) });
for (const [x, y] of [[189.5, 208.6], [190.2, 208.6], [190.9, 207.8], [191.4, 208.7]]) box(x - .25, y - .2, x + .25, y + .2, .35, 0xc8955c, { z: .9 });
const packer = person(0x0f766e, 0xf2c230, false); place(packer, 191.0, 199.6, 0, Math.PI / 2);
// PT racks
const PTX = [[194.7, 195.9], [196.0, 197.2], [197.3, 198.5]];
PTX.forEach(([a, b], i) => {
  const cx = (a + b) / 2; rack(cx, 202.45, 1.2, 4.9, 4.4, [.12, 1.65, 3.2]);
  for (const lv of [.12, 1.65, 3.2]) for (const y of [200.6, 201.8, 203.0, 204.3]) {
    if (i === 1 && lv === 1.65 && y === 204.3) continue;
    if ((i + y * 2 + lv) % 3 < .6) continue;
    place(pallet(0xc8955c, .8, true), cx, y, lv, Math.PI / 2);
  }
});
for (const x of [197.2, 198.4, 199.6]) for (const y of [195.7, 194.4, 193.1]) {
  rack(x, y, 1.05, 1.05, 2.3, [.12, 1.2, 2.25]);
  box(x - .4, y - .4, x + .4, y + .4, .7, 0xc8955c, { z: .14 }); box(x - .4, y - .4, x + .4, y + .4, .6, 0xc8955c, { z: 1.25 });
}

// exits + assembly points
const EXITS = [[159.76, 214.47, 'w'], [159.94, 198.19, 'w'], [159.94, 190.58, 'w'], [189.08, 189.61, 's'], [202.67, 221.53, 'e'], [202.66, 211.32, 'e']];
const exitTex = canvasTex(256, 128, g => {
  g.fillStyle = '#0f8a3c'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#fff';
  g.fillRect(150, 22, 64, 84); g.fillStyle = '#0f8a3c'; g.fillRect(160, 32, 44, 74);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(92, 30, 12, 0, 7); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round';
  g.beginPath(); g.moveTo(88, 46); g.lineTo(80, 76); g.lineTo(60, 104); g.moveTo(80, 76); g.lineTo(104, 100); g.moveTo(86, 54); g.lineTo(62, 62); g.moveTo(86, 54); g.lineTo(112, 64); g.stroke();
  g.beginPath(); g.moveTo(26, 64); g.lineTo(52, 64); g.stroke();
});
const exitSigns = [];
for (const [x, y, side] of EXITS) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .5), new THREE.MeshStandardMaterial({ map: exitTex, emissive: 0xffffff, emissiveMap: exitTex, emissiveIntensity: .35, side: THREE.DoubleSide }));
  m.position.copy(W(x, y, 2.9));
  m.rotation.y = side === 's' ? 0 : Math.PI / 2;
  scene.add(m); exitSigns.push(m);
}
const PRS = [[150.6, 210.0, 155.5, 214.9], [152.3, 180.6, 157.3, 185.4], [205.5, 203.4, 210.5, 208.4]];
const prTex = canvasTex(256, 256, g => {
  g.fillStyle = '#16a34a'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff';
  for (const [x, y] of [[96, 96], [160, 96], [96, 160], [160, 160]]) { g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); }
  g.strokeStyle = '#fff'; g.lineWidth = 14;
  for (const [x0, y0, x1, y1] of [[20, 20, 70, 70], [236, 20, 186, 70], [20, 236, 70, 186], [236, 236, 186, 186]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
});
const prPads = PRS.map(([a, b, c, d]) => {
  const m = box(a, b, c, d, .06, 0, { cast: false, material: new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: .08 }) });
  const cx = (a + c) / 2, cy = (b + d) / 2;
  box(cx - .05, cy - .05, cx + .05, cy + .05, 2.6, 0xe5e7eb);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshStandardMaterial({ map: prTex, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: prTex, emissiveIntensity: .2 }));
  s.position.copy(W(cx, cy, 2.6)); s.rotation.y = .5; scene.add(s);
  return m;
});

// =====================================================================================
//  signage (NOM-026) – bigger, on posts, plus EPP boards at production accesses
// =====================================================================================
const SIGN = {
  O1: ['O', 'EPP'], O2: ['O', 'OÍDO'], O3: ['O', 'CARETA'], O4: ['O', 'ESD'], O5: ['O', 'CHALECO'], O6: ['O', 'GUANTE'],
  A1: ['A', 'MONTAC.'], A2: ['A', 'MANOS'], A4: ['A', 'PRESIÓN'], A5: ['A', 'PARTÍC.'], A6: ['A', 'QUÍMICO'], A7: ['A', 'DESNIVEL'], A8: ['A', 'ESD'], A9: ['A', 'CORTE'],
  P1: ['P', 'NO PASAR'], P2: ['P', 'NO FUMAR'], P3: ['P', 'NO OBST.'], P4: ['P', 'NO SUBIR'], P5: ['P', 'RETENIDO'],
  E4: ['E', '+'], E5: ['E', 'LAVAOJOS'], F1: ['F', 'EXTINTOR'], F2: ['F', 'CO2'], F4: ['F', 'LÁMPARA'], F5: ['F', 'CLASE K'],
};
function signTexture(kind, label) {
  return canvasTex(256, 256, g => {
    if (kind === 'O') { g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.fillStyle = '#0b57b5'; g.beginPath(); g.arc(128, 128, 114, 0, 7); g.fill(); g.fillStyle = '#fff'; }
    else if (kind === 'A') { g.fillStyle = '#ffd400'; g.strokeStyle = '#111'; g.lineWidth = 16; g.beginPath(); g.moveTo(128, 14); g.lineTo(246, 230); g.lineTo(10, 230); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#111'; }
    else if (kind === 'P') { g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.fill(); g.strokeStyle = '#d61f1f'; g.lineWidth = 22; g.stroke(); g.beginPath(); g.moveTo(52, 52); g.lineTo(204, 204); g.stroke(); g.fillStyle = '#111'; }
    else { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); g.fillStyle = kind === 'E' ? '#12924a' : '#d61f1f'; g.fillRect(8, 8, 240, 240); g.fillStyle = '#fff'; }
    const big = label === '+';
    g.font = `bold ${big ? 170 : (label.length > 6 ? 40 : 50)}px DejaVu Sans, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, 128, kind === 'A' ? 168 : 130);
  });
}
const signTexCache = {};
function signAt(code, x, y, h = 2.5, size = .95) {
  const [kind, label] = SIGN[code];
  signTexCache[code] ||= signTexture(kind, label);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexCache[code], transparent: true, alphaTest: .08 }));
  s.position.copy(W(x, y, h)); s.scale.set(size, size, 1); scene.add(s);
  box(x - .03, y - .03, x + .03, y + .03, h - size / 2, 0, { material: metal(0x8a939d) });
  return s;
}
const SROWS = [
  [470, 292, ['O5', 'A7']], [560, 292, ['A1']], [387, 312, ['P5']], [398, 312, ['P1']],
  [672, 328, ['A6', 'E5', 'E4']], [415, 370, ['A1']], [700, 370, ['A1']], [610, 532, ['A1']], [420, 532, ['A1']],
  [414, 400, ['O1', 'O2']], [452, 432, ['A2']], [494, 432, ['A2']], [583, 424, ['A2']], [625, 432, ['A2']], [560, 395, ['P4']],
  [538, 432, ['O4', 'A8', 'F2']], [645, 505, ['E4', 'F1']], [720, 412, ['A9']], [760, 532, ['O5', 'A7', 'E4']],
  [333, 470, ['P1', 'P2']], [333, 481, ['A6', 'O6']], [400, 552, ['F5']],
];
for (const [px, py, codes] of SROWS) codes.forEach((c, i) => { const [x, y] = T(px + i * 11, py); signAt(c, x, y); });
for (const [x, y, codes] of [[188.8, 221.15, ['O3', 'A5']], [195.4, 218.9, ['O2', 'A4']], [193.0, 214.85, ['P1', 'P2']]])
  codes.forEach((c, i) => signAt(c, x + i * 1.05, y));
// EPP boards at production accesses
const eppBoard = canvasTex(1024, 512, g => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 512); g.fillStyle = '#0b57b5'; g.fillRect(0, 0, 1024, 130);
  g.fillStyle = '#fff'; g.font = 'bold 66px DejaVu Sans, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('USO OBLIGATORIO DE EPP', 512, 68);
  const items = [['LENTES', '👓'], ['CALZADO', ''], ['AUDITIVA', ''], ['BATA ESD', '']];
  items.forEach(([t], i) => {
    const x = 128 + i * 256; g.fillStyle = '#0b57b5'; g.beginPath(); g.arc(x, 290, 92, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 34px DejaVu Sans, Arial'; g.fillText(t, x, 290);
  });
  g.fillStyle = '#111'; g.font = 'bold 34px DejaVu Sans, Arial'; g.fillText('NOM-017-STPS-2008  ·  NOM-026-STPS-2008', 512, 455);
});
for (const [x, y, rot] of [[171.4, 212.75, 0], [166.4, 198.95, 0], [188.85, 204.2, Math.PI / 2]]) {
  const b = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshStandardMaterial({ map: eppBoard, side: THREE.DoubleSide, roughness: .5 }));
  b.position.copy(W(x, y, 2.4)); b.rotation.y = rot; scene.add(b);
  const dx = rot ? 0 : .9, dy = rot ? .9 : 0;
  for (const s of [-1, 1]) box(x + s * dx - .03, y + s * dy - .03, x + s * dx + .03, y + s * dy + .03, 1.9, 0, { material: metal(0x8a939d) });
}
// extinguishers (from DXF) with red floor square and wall sign
for (const [x, y] of [[159.5, 222.3], [170.9, 216.9], [182.9, 216.9], [186.5, 216.6], [193.5, 216.3], [194.6, 211.5], [194.6, 199.4], [201.9, 198.6],
  [196.5, 189.4], [189.9, 189.3], [176.0, 195.3], [172.5, 195.3], [159.5, 192.0], [167.9, 192.2], [159.5, 208.9], [176.5, 211.6], [187.9, 201.7], [174.6, 200.6], [179.6, 194.7]]) {
  const e = new THREE.Group();
  cyl(e, .11, .55, mat(0xd61f1f, 1, { roughness: .35, metalness: .2 }), 0, .32, 0);
  cyl(e, .04, .1, 0x222222, 0, .64, 0);
  e.position.copy(W(x, y)); scene.add(e);
  flat(x - .3, y - .3, x + .3, y + .3, tapeMat(0xd61f1f), .022);
}

// area name labels
function labelTexture(text) {
  return canvasTex(1024, 192, g => {
    g.font = 'bold 92px DejaVu Sans, Arial';
    const w = Math.min(1000, g.measureText(text).width + 90);
    g.fillStyle = 'rgba(17,28,44,.86)'; g.beginPath(); g.roundRect((1024 - w) / 2, 22, w, 148, 34); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 98);
  });
}
const areaLabels = [
  ['RECIBO', 163.4, 217.6], ['ALMACÉN MP', 178.2, 219.5], ['MANTENIMIENTO', 189.8, 222.0], ['COMPRESORES', 198.0, 221.5],
  ['PRODUCCIÓN', 175.5, 208.2], ['EMPAQUE', 191.4, 206.0], ['PROD. TERMINADO', 198.4, 208.3], ['EMBARQUES', 199.4, 194.0],
  ['OFICINAS Y SERVICIOS', 176.0, 192.8], ['RESIDUOS', 157.4, 205.3],
].map(([txt, x, y]) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(txt), transparent: true, depthTest: false, opacity: 0, fog: false }));
  s.position.copy(W(x, y, 9)); s.scale.set(13, 13 * 192 / 1024, 1); s.renderOrder = 10; scene.add(s); return s;
});

// =====================================================================================
//  flow-diagram symbols
// =====================================================================================
function symbolTexture(kind, label) {
  return canvasTex(256, 256, g => {
    g.lineWidth = 12; g.strokeStyle = '#1f2937';
    if (kind === 'O') { g.fillStyle = '#8dc63f'; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.fill(); g.stroke(); }
    else if (kind === 'I') { g.fillStyle = '#9b8cf0'; g.fillRect(24, 24, 208, 208); g.strokeRect(24, 24, 208, 208); }
    else if (kind === 'T') { g.fillStyle = '#8cc4f2'; g.beginPath(); g.moveTo(14, 92); g.lineTo(150, 92); g.lineTo(150, 40); g.lineTo(244, 128); g.lineTo(150, 216); g.lineTo(150, 164); g.lineTo(14, 164); g.closePath(); g.fill(); g.stroke(); }
    else if (kind === 'S') { g.fillStyle = '#2b8cff'; g.beginPath(); g.moveTo(20, 34); g.lineTo(236, 34); g.lineTo(128, 236); g.closePath(); g.fill(); g.stroke(); }
    else if (kind === 'OK') { g.fillStyle = '#22c55e'; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 26; g.beginPath(); g.moveTo(70, 132); g.lineTo(112, 176); g.lineTo(188, 86); g.stroke(); }
    else if (kind === 'NO') { g.fillStyle = '#ef4444'; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 26; g.beginPath(); g.moveTo(80, 80); g.lineTo(176, 176); g.moveTo(176, 80); g.lineTo(80, 176); g.stroke(); }
    if (label) { g.fillStyle = kind === 'S' ? '#fff' : '#111827'; g.font = 'bold 96px DejaVu Sans, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, kind === 'T' ? 108 : 128, kind === 'S' ? 100 : 132); }
  });
}
function sprite(kind, label, x, y, h, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: symbolTexture(kind, label), transparent: true, opacity: 0, alphaTest: .08, fog: false }));
  s.position.copy(W(x, y, h)); s.scale.set(size, size, 1); s.userData.size = size; s.visible = false; scene.add(s); return s;
}
const DIAG = [
  ['S1', 172.2, 219.75, 37.5, 3.9, 1.0], ['T1', 170.1, 207.6, 41],
  ['I1', 168.8, 202.9, 46.5], ['O1', 168.8, 202.28, 47.5], ['O2', 168.8, 201.66, 48.5], ['O3', 168.8, 201.04, 49.5], ['O4', 168.8, 200.42, 50.5], ['I2', 168.8, 199.8, 51.8],
  ['T2', 170.68, 199.8, 53],
  ['O5', 172.55, 199.8, 55], ['O6', 172.55, 200.42, 56], ['O7', 172.55, 201.04, 57], ['O8', 172.55, 201.66, 58], ['O9', 172.55, 202.28, 59], ['I3', 172.55, 202.9, 60.3],
  ['T3', 175.0, 202.9, 61.5], ['O10', 177.4, 202.28, 63.8], ['I4', 177.4, 201.66, 65.5], ['T4', 179.45, 199.8, 67],
  ['O11', 181.5, 199.8, 69], ['O12', 181.5, 200.42, 70], ['O13', 181.5, 201.04, 71], ['O14', 181.5, 201.66, 72], ['I5', 181.5, 202.28, 73.3],
  ['T5', 183.4, 202.9, 75], ['O15', 185.3, 202.9, 77.3], ['I6', 185.3, 203.52, 79], ['T6', 190.8, 204.2, 81], ['S2', 196.6, 204.3, 101.5, 5.3, 1.0],
];
const diagSprites = DIAG.map(([code, x, y, t0, h = 1.15, size = .5]) => { const s = sprite(code[0], code.slice(1), x, y, h, size); s.userData.t0 = t0; s.userData.code = code; return s; });
const okSprite = sprite('OK', '', 0, 0, 2.2, .7), noSprite = sprite('NO', '', 0, 0, 2.2, .7), qcSprite = sprite('OK', '', 184.35, 203.7, 1.9, .5);
const ringMk = c => { const r = new THREE.Mesh(new THREE.RingGeometry(.85, 1.05, 40), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false })); r.rotation.x = -Math.PI / 2; scene.add(r); return r; };
const okRing = ringMk(0x22c55e), noRing = ringMk(0xef4444);

const PATH = [[172.25, 218.0, 39], [170.0, 218.0, 40], [170.0, 202.9, 43], [168.8, 202.9, 46], [168.8, 199.8, 52], [172.55, 199.8, 54.5],
  [172.55, 202.9, 60.5], [177.4, 202.9, 63], [177.4, 199.8, 66.5], [181.5, 199.8, 68.5], [181.5, 202.9, 73.5], [185.3, 202.9, 76.5],
  [185.3, 204.2, 79.5], [196.3, 204.2, 96]];
const pathMat = new THREE.MeshBasicMaterial({ color: 0x1f2937, transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide });
let pathMesh = null;
function ribbon(points, width, h, material) {
  const pos = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i], [bx, by] = points[i + 1];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L * width / 2, ny = dx / L * width / 2;
    const p = [W(ax + nx, ay + ny, h), W(ax - nx, ay - ny, h), W(bx + nx, by + ny, h), W(bx - nx, by - ny, h)];
    for (const v of [p[0], p[1], p[2], p[1], p[3], p[2]]) pos.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.Mesh(g, material); m.renderOrder = 2; return m;
}
function updatePath(t, fade) {
  if (pathMesh) { scene.remove(pathMesh); pathMesh.geometry.dispose(); pathMesh = null; }
  if (t < PATH[0][2] || fade <= 0) return;
  const pts = [[PATH[0][0], PATH[0][1]]];
  for (let i = 1; i < PATH.length; i++) {
    const [x, y, ti] = PATH[i], [px, py, tp] = PATH[i - 1];
    if (t >= ti) pts.push([x, y]); else { const u = lin(t, tp, ti); pts.push([px + (x - px) * u, py + (y - py) * u]); break; }
  }
  pathMat.opacity = .9 * fade; pathMesh = ribbon(pts, .09, .05, pathMat); scene.add(pathMesh);
}
const ROUTES = [[[360, 361], [330, 380]], [[360, 528], [318, 500], [306, 412]], [[360, 609], [350, 645], [330, 662]],
  [[674, 632], [674, 650], [420, 650], [380, 690], [345, 690]], [[826, 296], [870, 340], [870, 420]], [[826, 400], [860, 425]]].map(r => r.map(p => T(...p)));
const evacMat = new THREE.MeshBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
let evacMeshes = [];
function updateEvac(t) {
  for (const m of evacMeshes) { scene.remove(m); m.geometry.dispose(); } evacMeshes = [];
  const u = lin(t, 120.3, 123), op = lin(t, 119.8, 120.6) * (1 - lin(t, 124.2, 125));
  if (op <= 0) return; evacMat.opacity = op;
  for (const r of ROUTES) {
    const L = r.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - r[i][0], p[1] - r[i][1]), 0);
    let left = L * u; const pts = [r[0]];
    for (let i = 1; i < r.length && left > 0; i++) {
      const d = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
      if (left >= d) { pts.push(r[i]); left -= d; } else { const k = left / d; pts.push([r[i - 1][0] + (r[i][0] - r[i - 1][0]) * k, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * k]); left = 0; }
    }
    if (pts.length > 1) { const m = ribbon(pts, .55, .08, evacMat); scene.add(m); evacMeshes.push(m); }
  }
}

// =====================================================================================
//  forklift motion (smoothed paths, forward / reverse)
// =====================================================================================
function mkTimeline(start, steps) {
  // steps: {t0,t1, path:[..], rev, r}  or {t0,t1, lift:[a,b]}
  for (const s of steps) if (s.path) s.dense = fillet(s.path, s.r ?? 1.0);
  return { start, steps };
}
function fkState(tl, t) {
  const st = { ...tl.start, speed: 0 };
  for (const s of tl.steps) {
    if (t < s.t0) break;
    const u = sprog(t, s.t0, s.t1);
    if (s.dense) { const p = polyAt(s.dense, u); st.x = p.x; st.y = p.y; st.hd = s.rev ? p.hd + Math.PI : p.hd;
      if (t < s.t1) { const du = sprog(t + .04, s.t0, s.t1) - u; st.speed = (s.rev ? -1 : 1) * du * p.L / .04; } }
    if (s.lift) st.lift = s.lift[0] + (s.lift[1] - s.lift[0]) * u;
    if (t < s.t1) break;
  }
  return st;
}
const front = (st, d = 1.32) => ({ x: st.x + Math.cos(st.hd) * d, y: st.y + Math.sin(st.hd) * d });

const F1 = forklift(0xf2b705), F2 = forklift(0xf2b705), F3 = forklift(0xf28c05);
// F1: trailer -> recibo staging -> rack (K-turns, stays in aisles)
const F1tl = mkTimeline({ x: 176.5, y: 224.9, hd: Math.PI / 2, lift: .3 }, [
  { t0: 7, t1: 10.2, path: [[176.5, 224.9], [176.5, 222.2], [177.9, 221.7]], rev: true, r: 1.1 },
  { t0: 10.2, t1: 16.6, path: [[177.9, 221.7], [169.8, 221.7], [169.8, 217.6], [167.9, 217.6]], r: 1.2 },
  { t0: 16.6, t1: 17.6, lift: [.3, .05] },
  { t0: 17.6, t1: 19.2, path: [[167.9, 217.6], [169.9, 217.6]], rev: true },
  { t0: 28, t1: 29.4, path: [[169.9, 217.6], [167.9, 217.6]] },
  { t0: 29.4, t1: 30.2, lift: [.05, .3] },
  { t0: 30.2, t1: 32.4, path: [[167.9, 217.6], [169.2, 217.6], [169.9, 218.9]], rev: true, r: .9 },
  { t0: 32.4, t1: 35.8, path: [[169.9, 218.9], [169.9, 217.45], [172.2, 217.45], [172.2, 218.43]], r: .85 },
  { t0: 35.8, t1: 37.3, lift: [.3, 1.78] },
  { t0: 37.3, t1: 37.9, lift: [1.78, 1.66] },
  { t0: 37.9, t1: 39.0, path: [[172.2, 218.43], [172.2, 217.6]], rev: true },
  { t0: 37.9, t1: 39.6, lift: [1.66, .05] },
]);
// F2: components along the north corridor into production (open area)
const F2tl = mkTimeline({ x: 178.5, y: 213.35, hd: Math.PI, lift: .3 }, [
  { t0: 39, t1: 44.4, path: [[178.5, 213.35], [165.4, 213.35], [165.4, 212.2]], r: 1.0 },
  { t0: 44.4, t1: 45.2, lift: [.3, .05] },
  { t0: 45.2, t1: 46.4, path: [[165.4, 212.2], [165.4, 213.3]], rev: true },
]);
// F3: empaque -> PT rack -> staging -> trailer
const F3tl = mkTimeline({ x: 199.6, y: 207.1, hd: Math.PI, lift: .05 }, [
  { t0: 90, t1: 94.4, path: [[199.6, 207.1], [192.8, 207.1], [192.8, 205.52]], r: 1.1 },
  { t0: 94.4, t1: 95.2, lift: [.05, .3] },
  { t0: 95.2, t1: 96.7, path: [[192.8, 205.52], [192.8, 208.0]], rev: true },
  { t0: 96.7, t1: 99.9, path: [[192.8, 208.0], [192.8, 207.2], [193.8, 206.9], [196.6, 206.9], [196.6, 205.62]], r: .9 },
  { t0: 99.9, t1: 101.4, lift: [.3, 1.78] },
  { t0: 101.4, t1: 102, lift: [1.78, 1.66] },
  { t0: 102, t1: 103.2, path: [[196.6, 205.62], [196.6, 207.2]], rev: true },
  { t0: 102, t1: 103.6, lift: [1.66, .05] },
  { t0: 103.6, t1: 107.6, path: [[196.6, 207.2], [196.6, 206.6], [200.6, 206.6], [200.6, 199.22]], r: 1.1 },
  { t0: 107.6, t1: 108.4, lift: [.05, .3] },
  { t0: 108.4, t1: 110.0, path: [[200.6, 199.22], [200.6, 200.4], [201.5, 201.4], [201.5, 201.9]], rev: true, r: .7 },
  { t0: 110.0, t1: 113.4, path: [[201.5, 201.9], [201.5, 191.6], [199.3, 191.6], [199.3, 187.85]], r: 1.0 },
  { t0: 113.4, t1: 114.1, lift: [.3, .14] },
  { t0: 114.1, t1: 115.6, path: [[199.3, 187.85], [199.3, 191.0]], rev: true },
]);
const WHEEL_SPIN = {};

const PA = pallet(0x4a90a4, .8), PB = pallet(0x2d6db5, .85), PC = pallet(0x2a9d8f, .85);
const PE = pallet(0xc8955c, .8, true), PF = pallet(0xc8955c, .8, true);
const jackWorker = person(0x6b7280), inspector = person(0xffffff, 0x2563eb, false);
const jack = new THREE.Group(); lb(jack, 1.1, .06, .55, 0xd61f1f, 0, .08, 0); lb(jack, .06, .9, .06, 0x222222, -.62, .5, 0); scene.add(jack);

function setFk(obj, st, t) {
  place(obj, st.x, st.y, 0, st.hd);
  obj.userData.carriage.position.y = st.lift;
  obj.userData.beacon.material.emissiveIntensity = Math.abs(st.speed) > .05 ? (Math.sin(t * 12) > 0 ? 2.2 : .3) : .3;
  const key = obj.uuid; WHEEL_SPIN[key] = (st.x + st.y) * 2.4;
  obj.userData.wheels.forEach(w => { w.rotation.y = WHEEL_SPIN[key]; });
}
function carry(p, st, rot = 0) { const f = front(st); place(p, f.x, f.y, st.lift + .02, st.hd + rot); }
function moverPose(p, path, t0, t1, t, idleHd) {
  const u = sprog(t, t0, t1), q = polyAt(fillet(path, .6), u);
  place(p, q.x, q.y, 0, (t > t0 && t < t1) ? q.hd : idleHd ?? q.hd);
  if (t > t0 && t < t1) walkPose(p, (q.L * u) * 3.2, .45); else walkPose(p, 0, 0);
  return q;
}

// product
const product = new THREE.Group();
lb(product, .34, .12, .22, 0x2b2f35, 0, .06, 0);
const pButtons = lb(product, .12, .04, .08, 0x22c55e, .08, .14, 0);
const pFront = lb(product, .36, .05, .24, 0x111827, 0, .15, 0);
const pPCB = lb(product, .3, .02, .18, 0x16a34a, 0, .2, 0);
const pBack = lb(product, .37, .06, .25, 0x374151, 0, .24, 0);
const pScrew = lb(product, .05, .05, .05, 0xd1d5db, -.14, .29, .08);
scene.add(product);
const carton = new THREE.Group(); lb(carton, .5, .32, .4, 0xc8955c, 0, .16, 0); lb(carton, .51, .01, .06, 0xd9b48a, 0, .32, 0); scene.add(carton);

// =====================================================================================
//  camera
// =====================================================================================
const ST_CAM = (s, a, b) => [[a, s - 3.6, 197.6, 6.4, s + 1.0, 204.2, .7], [b, s - 3.3, 197.7, 6.3, s + 1.2, 204.2, .7]];
const CAM = [
  [0, 180, 132, 98, 181, 205, 0],
  [6, 214, 150, 72, 180, 206, 0],
  [8.6, 172.5, 207.5, 17, 172.5, 220, 0],
  [17, 170.5, 209.5, 13, 170.5, 220.5, 0],
  [20, 168.5, 210.5, 11, 166.5, 218.2, 0],
  [28, 168.2, 210.8, 11, 166.2, 218.2, 0],
  [31, 169.5, 210.8, 11, 170.5, 218.6, 0],
  [38.5, 170.5, 211.0, 10, 171.5, 218.6, 1],
  [41, 177, 207.5, 11, 171, 212.6, 0],
  [45, 169, 202.8, 9, 167, 209.6, 0],
  ...ST_CAM(167.2, 46.5, 53), ...ST_CAM(171.25, 54.5, 61.5), ...ST_CAM(175.3, 63, 67), ...ST_CAM(179.4, 68.5, 75), ...ST_CAM(183.3, 76.5, 81),
  [85, 185.5, 197, 8.5, 190.8, 203.5, 0],
  [89.5, 186.5, 197, 9, 192, 204.5, 0],
  [92.5, 198.5, 214.5, 11, 195, 205.5, 0],
  [102.5, 199.3, 213.5, 10, 196.5, 204.8, 0],
  [105, 205.2, 206, 12, 199.8, 201, 0],
  [108.4, 205.4, 204.5, 11, 200.8, 198.6, 0],
  [113.6, 205.6, 194.5, 10, 200.0, 191.0, 0],
  [115.5, 205.8, 191.0, 9, 199.6, 189.5, 0],
  [119, 209.5, 180, 13, 199.4, 178, 0],
  [120.6, 180, 152, 78, 180, 204, 0],
  [125, 180, 147, 84, 180, 204, 0],
];
function cameraAt(t) {
  let i = 0; while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1], u = sprog(t, a[0], b[0]);
  const v = k => a[k] + (b[k] - a[k]) * u;
  camera.position.copy(W(v(1), v(2), v(3))); camera.lookAt(W(v(4), v(5), v(6)));
}

// =====================================================================================
//  overlay
// =====================================================================================
const CARDS = [
  [0, 6, 'Layout de planta', 'Ensamble de control de videojuego', ''],
  [6.5, 18.6, '1 · Recibo', 'Recibo de materia prima', 'Descarga de tráiler en andén → zona de recibo'],
  [19, 27.8, '2 · Calidad', 'Inspección de recibo', 'Aceptado → almacén · No conforme → cuarentena'],
  [28.3, 38.6, '3 · Almacén de materia prima', 'Almacenamiento en racks', 'Almacenar componentes inyectados (▽1)'],
  [39, 84.5, '4 · Producción', 'Línea de ensamble · 5 estaciones', '15 operaciones · 6 inspecciones · zona ESD en Estación 3'],
  [85, 90.5, '5 · Empaque', 'Empaque del producto', 'Producto aprobado por control de calidad'],
  [91, 103, '6 · Producto terminado', 'Almacén de producto terminado', 'Almacenar producto terminado (▽2)'],
  [103.5, 119.6, '7 · Embarque', 'Carga de tráiler y salida', 'Staging → andén de embarques'],
  [120.2, 125, 'Seguridad', 'Rutas de evacuación', '6 salidas de emergencia · 3 puntos de reunión'],
];
const STEPS = [
  [39, 45.5, 'T1 · Transporte', 'Componentes del almacén de MP a la Estación 1'],
  [45.5, 53, 'Estación 1 · Botones', 'I1 Inspeccionar componentes<br>O1–O4 Ensamblar A-EB-001 a A-EB-005<br>I2 Inspeccionar sub-ensamble 1'],
  [53, 61.5, 'Estación 2 · Carcasa frontal', 'O5–O9 Ensamblar B-CF-001 a B-CF-005<br>I3 Inspeccionar sub-ensamble 2'],
  [61.5, 67, 'Estación 3 · PCB (zona ESD)', 'O10 Ensamblar C-EP-001 con C-EP-002<br>I4 Inspeccionar sub-ensamble'],
  [67, 75, 'Estación 4 · Carcasa trasera', 'O11–O14 Ensamblar D-EP-001, D-CF-002, D-CF-003, D-EC-004<br>I5 Inspeccionar sub-ensamble'],
  [75, 81, 'Estación 5 · Tornillería', 'O15 Atornillar D-EC-002<br>I6 Inspección de control de calidad'],
  [81, 85, 'T6 · Transporte', 'Producto aprobado hacia empaque'],
];
function overlay(t) {
  const card = document.getElementById('card'), title = document.getElementById('title'), stepEl = document.getElementById('step');
  if (!TEXT) { card.style.opacity = 0; title.style.opacity = 0; stepEl.style.opacity = 0; return; }
  const c = CARDS.find(c => t >= c[0] && t < c[1]);
  if (c && c[0] === 0) {
    title.style.opacity = Math.min(lin(t, .3, 1.2), 1 - lin(t, 4.8, 5.8));
    document.getElementById('tt').textContent = c[1] === 6 ? c[2] : c[2]; document.getElementById('ts').textContent = c[3];
    card.style.opacity = 0;
  } else {
    title.style.opacity = 0;
    if (!c) card.style.opacity = 0;
    else {
      card.style.opacity = Math.min(lin(t, c[0] + .2, c[0] + .9), 1 - lin(t, c[1] - .8, c[1] - .1));
      document.getElementById('ck').textContent = c[2]; document.getElementById('ch').textContent = c[3]; document.getElementById('cs').textContent = c[4];
    }
  }
  const st = STEPS.find(s => t >= s[0] && t < s[1]);
  if (st) { stepEl.innerHTML = `<b>${st[2]}</b><br>${st[3]}`; stepEl.style.opacity = Math.min(lin(t, st[0] + .15, st[0] + .6), 1 - lin(t, st[1] - .4, st[1])); }
  else stepEl.style.opacity = 0;
}

// =====================================================================================
//  per-frame update
// =====================================================================================
const SCHED = [[46, 53], [54.5, 61.5], [63, 67], [68.5, 75], [76.5, 81]];
function update(t) {
  cameraAt(t); overlay(t);
  const f1 = fkState(F1tl, t), f2 = fkState(F2tl, t), f3 = fkState(F3tl, t);
  setFk(F1, f1, t); setFk(F2, f2, t); setFk(F3, f3, t);

  // PB: trailer -> staging -> rack
  const dropB = front(fkState(F1tl, 17.6));
  if (t < 17.6) carry(PB, f1);
  else if (t < 30.2) place(PB, dropB.x, dropB.y, .02, Math.PI);
  else if (t < 37.9) carry(PB, f1);
  else place(PB, 172.2, 219.75, 1.65, 0);
  // PA: rejected pallet (already in staging) -> cuarentena with pallet jack
  {
    const u = sprog(t, 24.2, 27.6);
    const p = polyAt([[164.6, 217.5], [161.5, 217.2]], u);
    place(PA, p.x, p.y, 0, 0);
    place(jack, p.x + .1, p.y, 0, 0); jack.visible = t > 22.5;
    if (t < 22.5) place(jackWorker, 163.6, 219.0, 0, -Math.PI / 2), walkPose(jackWorker, 0, 0);
    else if (t < 24.2) moverPose(jackWorker, [[163.6, 219.0], [163.6, 218.2], [164.0, 217.5]], 22.5, 24.2, t, Math.PI);
    else moverPose(jackWorker, [[164.0, 217.5], [160.9, 217.2]], 24.2, 27.6, t, Math.PI);
  }
  // inspector
  if (t < 19.6) { place(inspector, 167.9, 219.0, 0, -Math.PI / 2); walkPose(inspector, 0, 0); }
  else if (t < 21.6) moverPose(inspector, [[167.9, 219.0], [167.9, 218.6], [166.4, 218.6]], 19.6, 21.6, t, -Math.PI / 2);
  else if (t < 23) { place(inspector, 166.4, 218.6, 0, -Math.PI / 2); walkPose(inspector, 0, 0); inspector.userData.armR.rotation.z = .9; }
  else moverPose(inspector, [[166.4, 218.6], [165.0, 218.5]], 23, 24.2, t, -Math.PI / 2);
  // QC marks
  const okOp = lin(t, 22.0, 22.6) * (1 - lin(t, 28.5, 29.2));
  okRing.position.copy(W(dropB.x, dropB.y, .04)); okRing.material.opacity = okOp;
  okSprite.position.copy(W(dropB.x, dropB.y, 2.25)); okSprite.visible = okOp > 0; okSprite.material.opacity = okOp;
  const noOp = lin(t, 23.6, 24.2) * (1 - lin(t, 28.5, 29.2));
  noRing.position.copy(PA.position).setY(.04); noRing.material.opacity = noOp;
  noSprite.position.copy(PA.position).setY(2.2); noSprite.visible = noOp > 0; noSprite.material.opacity = noOp;
  // PC: carried by F2 into production
  if (t < 44.4) carry(PC, f2); else { const d = front(fkState(F2tl, 45.2)); place(PC, d.x, d.y, .02, -Math.PI / 2); }
  // PE / PF
  PE.visible = t >= 86;
  if (t < 94.4) { PE.scale.setScalar(Math.max(sprog(t, 86, 88), .001)); place(PE, 192.8, 204.2, 0, Math.PI / 2); }
  else if (t < 102) { PE.scale.setScalar(1); carry(PE, f3, Math.PI / 2); }
  else { PE.scale.setScalar(1); place(PE, 196.6, 204.3, 1.65, Math.PI / 2); }
  let trailerDy = 0; if (t > 115.6) trailerDy = -32 * prog(t, 115.6, 120.5);
  southTrailer.position.copy(southTrailerBase); southTrailer.position.z -= trailerDy;
  if (t < 107.6) place(PF, 200.6, 197.9, 0, Math.PI / 2);
  else if (t < 114.1) carry(PF, f3, Math.PI / 2);
  else { const d = front(fkState(F3tl, 114.1)); place(PF, d.x, d.y + trailerDy, .3, Math.PI / 2 - Math.PI / 2 + d.hd); }

  // production: product, presses, andons, operators
  product.visible = t >= 45.6 && t < 84.6;
  carton.visible = t >= 83.5 && t < 88.2;
  if (product.visible) {
    let x = ST[0] + 1.05, y = 203.7, h = .9;
    for (let i = 0; i < 5; i++) {
      const [a, b] = SCHED[i];
      if (t >= a && t < b) { x = ST[i] + 1.05; y = 203.7; break; }
      if (i < 4 && t >= b && t < SCHED[i + 1][0]) {
        const p = polyAt([[ST[i] + 1.05, 203.7], [ST[i] + 1.05, 205.7], [ST[i + 1] + 1.05, 205.7], [ST[i + 1] + 1.05, 203.7]], sprog(t, b, SCHED[i + 1][0]));
        x = p.x; y = p.y; break;
      }
    }
    if (t >= 81) { const p = polyAt(fillet([[184.35, 203.7], [185.3, 204.2], [190.0, 204.2], [190.5, 201.8]], .5), sprog(t, 81, 83.5)); x = p.x; y = p.y; }
    place(product, x, y, h, 0);
    pButtons.visible = t >= 48; pFront.visible = t >= 57; pPCB.visible = t >= 64; pBack.visible = t >= 71; pScrew.visible = t >= 78;
    product.scale.setScalar(1 - .9 * lin(t, 83.5, 84.6));
  }
  if (carton.visible) {
    carton.scale.setScalar(Math.max(lin(t, 83.5, 84.6), .001));
    const p = polyAt(fillet([[190.5, 201.8], [191.6, 203.6], [192.8, 204.2]], .5), sprog(t, 86, 88));
    place(carton, p.x, p.y, t < 86 ? .9 : .9 * (1 - sprog(t, 86, 88)) + .14, 0);
  }
  SCHED.forEach(([a, b], i) => {
    const active = t >= a && t < b;
    stationRings[i].material.opacity = .8 * Math.min(lin(t, a - .3, a + .3), 1 - lin(t, b - .3, b + .3));
    rams[i].position.y = (i < 4 ? 1.05 + .35 / 2 : 1.15 + .45 / 2) - (active ? .22 * Math.max(0, Math.sin((t - a) * 4.2)) : 0);
    andons[i].material.color.setHex(active ? 0x22c55e : 0xf59e0b); andons[i].material.emissive.setHex(active ? 0x22c55e : 0xf59e0b);
    andons[i].material.emissiveIntensity = active ? 1.6 : .5;
    workPose(operators[i], t + i, active);
  });
  workPose(packer, t, t > 83 && t < 89);
  const qc = lin(t, 79.1, 79.6) * (1 - lin(t, 81.5, 82.2)); qcSprite.visible = qc > 0; qcSprite.material.opacity = qc;
  beltTex.offset.x = -t * .6;

  // diagram sprites + path
  const fade = 1 - lin(t, 103, 105);
  for (const s of diagSprites) {
    const t0 = s.userData.t0; let op = lin(t, t0, t0 + .4) * fade;
    if (s.userData.code === 'S1') op *= 1 - lin(t, 41, 43);
    s.visible = op > 0; s.material.opacity = op;
    const pop = 1 + .45 * Math.sin(Math.PI * lin(t, t0, t0 + .55)); s.scale.set(s.userData.size * pop, s.userData.size * pop, 1);
  }
  updatePath(t, fade);

  // area labels (aerial only)
  const lop = TEXT ? clamp((camera.position.y - 24) / 12, 0, 1) : 0;
  areaLabels.forEach(l => { l.material.opacity = lop; l.visible = lop > .01; });

  // safety finale
  const glow = lin(t, 119.6, 120.6) * (1 - lin(t, 124.2, 125)), puls = .5 + .5 * Math.sin(t * 6);
  exitSigns.forEach(s => { s.material.emissiveIntensity = .35 + glow * (1.2 + puls); });
  prPads.forEach(p => { p.material.emissiveIntensity = .08 + glow * (.6 + .5 * puls); });
  updateEvac(t);
  document.getElementById('c').style.opacity = Math.min(lin(t, 0, 1.0), 1 - lin(t, DURATION - 1.2, DURATION));
}

window.renderAt = async t => { await ready; update(t); renderer.render(scene, camera); return true; };
window.__ready = ready.then(() => true);
