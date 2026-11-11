import * as THREE from 'three';

// ---------------------------------------------------------------- basics
const Q = new URLSearchParams(location.search);
const TEXT = Q.get('text') !== '0';
const SHADOWS = Q.get('shadows') !== '0';
const DURATION = 215;
window.DURATION = DURATION;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1920, 1080, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = SHADOWS;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdde4ea);
scene.fog = new THREE.Fog(0xdde4ea, 160, 340);
const camera = new THREE.PerspectiveCamera(40, 1920 / 1080, 0.1, 800);

const W = (x, y, h = 0) => new THREE.Vector3(x - 180, h, -(y - 205));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = u => (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const prog = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
const lin = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
// PDF-overlay -> DXF metres (same affine used for the CAD files)
const T = (px, py) => [0.0961930509 * px - 6.85976048e-05 * py + 124.289885,
                       2.90413940e-04 * px - 0.0963294995 * py + 249.134654];

// ---------------------------------------------------------------- lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x7c8794, 0.95));
const sun = new THREE.DirectionalLight(0xfff6e8, 1.35);
sun.position.copy(W(150, 165, 95));
sun.target.position.copy(W(182, 206, 0));
scene.add(sun, sun.target);
if (SHADOWS) {
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 10; sc.far = 260;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
}

// ---------------------------------------------------------------- materials / helpers
const matCache = {};
function mat(color, opacity = 1, extra = {}) {
  const k = color + ':' + opacity + ':' + JSON.stringify(extra);
  if (!matCache[k]) {
    matCache[k] = new THREE.MeshStandardMaterial({
      color, roughness: .85, metalness: .05, transparent: opacity < 1, opacity, ...extra });
  }
  return matCache[k];
}
function box(x0, y0, x1, y1, h, color, o = {}) {
  const z = o.z || 0;
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), h, Math.abs(y1 - y0));
  const m = new THREE.Mesh(g, o.material || mat(color, o.opacity ?? 1));
  m.position.copy(W((x0 + x1) / 2, (y0 + y1) / 2, z + h / 2));
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  (o.parent || scene).add(m);
  return m;
}
function localBox(parent, sx, sy, sz, color, x, y, z, opacity = 1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(color, opacity));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
const WALL = 0xc9d1da, WALL_IN = 0xd6dde4;
function wallH(y, x0, x1, gaps = [], h = 3.2, color = WALL, th = .22) {
  let cur = x0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > cur) box(cur, y - th / 2, a, y + th / 2, h, color);
    cur = Math.max(cur, b);
  }
  if (x1 > cur) box(cur, y - th / 2, x1, y + th / 2, h, color);
}
function wallV(x, y0, y1, gaps = [], h = 3.2, color = WALL, th = .22) {
  let cur = y0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > cur) box(x - th / 2, cur, x + th / 2, a, h, color);
    cur = Math.max(cur, b);
  }
  if (y1 > cur) box(x - th / 2, cur, x + th / 2, y1, h, color);
}
function area(x0, y0, x1, y1, color, opacity = .17) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.copy(W((x0 + x1) / 2, (y0 + y1) / 2, .015));
  m.renderOrder = 1;
  scene.add(m); return m;
}

// ---------------------------------------------------------------- ground + floor plan texture
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat(0xc5ccd3));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.03; ground.receiveShadow = true;
scene.add(ground);
const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
scene.add(floor);
const ready = new Promise(res => {
  new THREE.TextureLoader().load('./floor.jpg', tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    floorMat.map = tex; floorMat.needsUpdate = true; res();
  });
});

// area colours
area(159.4, 215.3, 170.4, 223.3, 0x3d7fd1);       // recibo
area(160.5, 215.3, 162.5, 218.5, 0xd13d3d, .28);  // cuarentena
area(170.4, 215.3, 186.3, 223.3, 0x1f9e8f);       // almacen MP
area(186.3, 215.3, 193.4, 223.3, 0x7a8590);       // mantenimiento
area(193.4, 215.3, 202.5, 223.3, 0x5d6670);       // compresor
area(162.47, 199.35, 188.47, 212.35, 0x2f9e5b);   // produccion
area(188.5, 199.35, 194.4, 212.35, 0xe08a2c);     // empaque
area(194.4, 199.35, 202.5, 212.35, 0x8455c7);     // PT
area(196.4, 189.2, 202.5, 199.35, 0xd9a521);      // embarques
area(159.4, 189.2, 196.4, 196.3, 0xa7b1bb, .14);  // oficinas / servicios
area(155.5, 201.8, 159.4, 208.9, 0x8a6a3e, .22);  // residuos

// ---------------------------------------------------------------- building
// exterior
wallH(223.3, 159.4, 202.5, [[175.0, 178.0], [178.6, 181.4], [182.7, 185.7]], 4.2);
wallH(189.2, 159.4, 202.5, [[197.8, 200.8], [188.6, 189.6], [168.6, 169.6]], 4.2);
wallV(159.4, 189.2, 223.3, [[213.9, 215.0], [197.6, 198.8], [190.0, 191.2], [204.5, 206.0]], 4.2);
wallV(202.5, 189.2, 223.3, [[221.0, 222.1], [210.8, 211.9]], 4.2);
// north strip
wallH(215.3, 186.3, 202.5, [[192.6, 194.4]], 3.0, WALL_IN);           // mantenimiento + compresor keep walls
wallH(219.6, 164.8, 168.6, [[167.5, 168.5]], 2.6, WALL_IN);
wallV(164.8, 219.6, 223.3, [], 2.6, WALL_IN);
wallV(168.6, 219.6, 223.3, [], 2.6, WALL_IN);
wallV(186.3, 215.3, 223.3, [], 3.0, WALL_IN);
wallV(193.4, 215.3, 223.3, [], 3.0, WALL_IN);

// production room
wallH(212.35, 162.47, 188.47, [[169.4, 170.6]], 2.8, WALL_IN);
wallH(199.35, 162.47, 188.47, [[165.0, 166.6]], 2.8, WALL_IN);
wallV(162.47, 199.35, 212.35, [[206.0, 207.6]], 2.8, WALL_IN);
wallV(188.47, 199.35, 212.35, [[203.6, 204.8]], 2.8, WALL_IN);
// empaque / PT / embarques
wallV(196.4, 189.2, 196.3, [], 2.8, WALL_IN);                         // oficinas | embarques
// south strip
wallH(196.3, 159.4, 196.4, [[168.6, 169.6], [174.0, 175.0], [185.5, 186.5]], 2.8, WALL_IN);
wallV(169.4, 189.2, 196.3, [], 2.8, WALL_IN);
wallV(179.4, 189.2, 196.3, [], 2.8, WALL_IN);
wallV(183.4, 189.2, 196.3, [], 2.8, WALL_IN);

// ---------------------------------------------------------------- floor tape + pedestrian walkways
function strip(x0, y0, x1, y1, color, h = .022, opacity = 1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0)),
    new THREE.MeshStandardMaterial({ color, roughness: .7, transparent: opacity < 1, opacity, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.copy(W((x0 + x1) / 2, (y0 + y1) / 2, h)); m.receiveShadow = true;
  scene.add(m); return m;
}
const TAPE = 0xf5c400, TW = .1;
function tapeH(y, x0, x1, c = TAPE) { strip(x0, y - TW / 2, x1, y + TW / 2, c, .025); }
function tapeV(x, y0, y1, c = TAPE) { strip(x - TW / 2, y0, x + TW / 2, y1, c, .025); }
function tapeRect(x0, y0, x1, y1, c = TAPE) { tapeH(y0, x0, x1, c); tapeH(y1, x0, x1, c); tapeV(x0, y0, y1, c); tapeV(x1, y0, y1, c); }
// recibo / almacen MP (no walls)
tapeH(215.45, 159.5, 167.4); tapeH(215.45, 168.55, 186.2);
tapeV(170.4, 215.5, 223.2);
tapeRect(160.5, 215.6, 162.5, 218.5, 0xd93a3a);                        // cuarentena (cinta roja)
// empaque / PT / embarques (no walls)
tapeH(212.2, 188.6, 202.4); tapeV(194.4, 199.45, 204.0); tapeV(194.4, 204.9, 212.15);
tapeH(199.45, 188.6, 196.3); tapeH(199.45, 196.5, 199.7); tapeH(199.45, 201.9, 202.4);
tapeV(196.5, 196.45, 199.4);
// pedestrian walkways (layer PASILLOS, 1 m wide)
const WALK = 0x43a047;
for (const [x0, y0, x1, y1] of [
  [160.47, 214.35, 202.4, 215.25], [159.5, 197.35, 160.47, 214.35], [160.47, 196.35, 196.4, 197.35],
  [167.47, 215.36, 168.47, 219.25],
  [158.47, 188.25, 159.4, 198.76], [155.86, 197.76, 158.47, 198.76], [160.52, 188.25, 196.47, 189.2],
  [159.47, 178.25, 160.52, 188.25], [149.47, 178.25, 159.47, 179.25], [149.47, 179.25, 150.47, 182.25], [145.47, 181.25, 149.47, 182.25],
]) {
  strip(x0, y0, x1, y1, WALK, .02, .85);
  const horiz = (x1 - x0) > (y1 - y0);
  if (horiz) { tapeH(y0 + .05, x0, x1, 0xffffff); tapeH(y1 - .05, x0, x1, 0xffffff); }
  else { tapeV(x0 + .05, y0, y1, 0xffffff); tapeV(x1 - .05, y0, y1, 0xffffff); }
}

// residuos
wallV(155.5, 201.8, 208.9, [], 2.2, 0xb79e7c);
wallH(201.8, 155.5, 159.4, [], 2.2, 0xb79e7c);
wallH(208.9, 155.5, 159.4, [], 2.2, 0xb79e7c);
box(156.2, 202.4, 157.4, 203.6, 1.1, 0x2d6db5); box(156.2, 204.0, 157.4, 205.2, 1.1, 0x3b9a4c);
box(156.2, 205.6, 157.4, 206.8, 1.1, 0xc94a4a); box(156.2, 207.2, 157.4, 208.4, 1.1, 0xf0b429);

// ---------------------------------------------------------------- props
const LOADS = [0x2d6db5, 0x3b8fd4, 0x2a9d8f, 0x5a7ec9, 0x4a90a4];
function pallet(load = 0x2d6db5, loadH = .9, cartons = false) {
  const g = new THREE.Group();
  localBox(g, 1.2, .14, 1.0, 0xb98a55, 0, .07, 0);
  if (loadH > 0) {
    if (cartons) {
      for (const dx of [-.29, .29]) for (const dz of [-.24, .24]) for (const dy of [0, 1])
        localBox(g, .55, loadH / 2 - .02, .46, load, dx, .14 + (dy + .5) * loadH / 2, dz);
    } else {
      localBox(g, 1.12, loadH, .94, load, 0, .14 + loadH / 2, 0);
    }
  }
  scene.add(g); return g;
}
function place(obj, x, y, h = 0, rot = 0) { obj.position.copy(W(x, y, h)); obj.rotation.y = rot; }

function rack(cx, cy, lx, ly, h, levels, upright = 0x2c5aa0, beam = 0xe8742a) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sy of [-1, 1])
    localBox(g, .09, h, .09, upright, sx * (lx / 2 - .05), h / 2, sy * (ly / 2 - .05));
  for (const lv of levels) {
    if (lv < .2) continue;
    for (const sy of [-1, 1]) localBox(g, lx, .1, .08, beam, 0, lv - .05, sy * (ly / 2 - .05));
  }
  g.position.copy(W(cx, cy, 0)); scene.add(g); return g;
}

function person(color = 0x2f6fb3, hat = 0xf2c230) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, .95, 12), mat(color));
  body.position.y = .95; body.castShadow = true; g.add(body);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .5, 10), mat(0x2b3440));
  legs.position.y = .25; legs.castShadow = true; g.add(legs);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.15, 16, 12), mat(0xe1b48c));
  head.position.y = 1.58; head.castShadow = true; g.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(hat));
  helmet.position.y = 1.62; g.add(helmet);
  scene.add(g); return g;
}

function forklift(color = 0xf2b705) {
  const g = new THREE.Group();
  localBox(g, 1.5, .55, 1.0, color, -.1, .5, 0);          // chassis
  localBox(g, .45, .7, .98, 0x3a3f46, -.75, .7, 0);        // counterweight
  for (const sx of [-.55, .35]) for (const sz of [-.42, .42]) localBox(g, .06, 1.25, .06, 0x2b2f35, sx, 1.4, sz);
  localBox(g, 1.0, .06, .96, 0x2b2f35, -.1, 2.03, 0);      // guard roof
  localBox(g, .35, .35, .4, 0x2b2f35, -.25, .95, 0);       // seat
  const drv = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 10), mat(0xe1b48c)); drv.position.set(-.2, 1.45, 0); g.add(drv);
  const hel = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2c230)); hel.position.set(-.2, 1.49, 0); g.add(hel);
  for (const sz of [-.35, .35]) localBox(g, .08, 2.35, .08, 0x2b2f35, .7, 1.2, sz);  // mast
  for (const [x, z] of [[.45, -.5], [.45, .5], [-.6, -.5], [-.6, .5]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .18, 16), mat(0x22262b));
    w.rotation.x = Math.PI / 2; w.position.set(x, .24, z); g.add(w);
  }
  const carriage = new THREE.Group();
  localBox(carriage, .06, .5, .8, 0x2b2f35, .76, .25, 0);
  for (const sz of [-.25, .25]) localBox(carriage, 1.1, .05, .1, 0x2b2f35, 1.3, .02, sz);
  g.add(carriage);
  g.userData.carriage = carriage;
  scene.add(g); return g;
}

function trailer(cx, rearY, dir, opacity = 1) {
  const g = new THREE.Group();
  const L = 13, Wd = 2.6, H = 3.5, z0 = .15;
  const c = 0xf3f5f7;
  // container built from panels (rear open)
  localBox(g, Wd, .1, L, 0xa9b0b8, 0, z0, -L / 2, opacity);
  localBox(g, Wd, .08, L, c, 0, z0 + H, -L / 2, opacity);
  localBox(g, .06, H, L, c, -Wd / 2, z0 + H / 2, -L / 2, opacity);
  localBox(g, .06, H, L, c, Wd / 2, z0 + H / 2, -L / 2, opacity);
  localBox(g, Wd, H, .06, c, 0, z0 + H / 2, -L, opacity);
  localBox(g, 2.5, 2.8, 3.0, 0xc0392b, 0, 1.6, -L - 1.8);      // tractor
  localBox(g, 2.4, .9, 1.3, 0x22262b, 0, .45, -L - 2.6);
  for (const zz of [-1.2, -2.6, -L - 1.0, -L - 3.0]) for (const xx of [-1.05, 1.05]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .35, 16), mat(0x22262b));
    w.rotation.z = Math.PI / 2; w.position.set(xx, .5, zz); g.add(w);
  }
  // local -Z is "away from dock"; dir=+1 means trailer extends to +y (north)
  g.position.copy(W(cx, rearY, 0));
  g.rotation.y = dir > 0 ? 0 : Math.PI;
  scene.add(g); return g;
}

// trailers
trailer(176.5, 223.5, 1); trailer(184.2, 223.5, 1);
const southTrailer = trailer(199.3, 189.0, -1, .55);
const southTrailerBase = southTrailer.position.clone();

// parking cars + bus
for (const [x, y, c] of [[166.2, 180.0, 0x9aa3ad], [168.9, 180.0, 0xc0392b], [186.6, 180.4, 0x2c3e50], [174.0, 184.6, 0xecf0f1], [191.2, 184.6, 0x34495e]]) {
  box(x - .9, y - 2.2, x + .9, y + 2.2, 1.0, c, { z: .25 }); box(x - .85, y - 1.2, x + .85, y + 1.0, .55, 0x2b3440, { z: 1.25 });
}
box(152.3, 189.5, 154.9, 198.6, 3.0, 0xf1f3f5);

// ---------------------------------------------------------------- recibo / MP / mantenimiento / compresor
const MPX = [172.2, 174.7, 177.2, 179.7, 182.2], MPY = [216.25, 219.75];
const staticPallets = [];
for (const x of MPX) for (const y of MPY) {
  rack(x, y, 2.4, 1.25, 3.3, [.12, 1.65, 3.2]);
  for (const lv of [.12, 1.65]) {
    if (x === 172.2 && y === 219.75 && lv === 1.65) continue;   // slot filled during video
    if (x === 174.7 && y === 219.75 && lv === .12) continue;    // pallet taken to production
    const p = pallet(LOADS[(Math.round(x * 3 + y + lv * 7)) % LOADS.length], .85);
    place(p, x, y, lv);
  }
}
// recibo pallets (static decor)
for (const [x, y] of [[160.4, 222.6], [161.8, 222.6]]) place(pallet(0x4a90a4, .8), x, y);
// mantenimiento
for (const x of [190.2, 191.6, 193.0]) {
  rack(x, 218.6, .5, 2.6, 2.2, [.6, 1.3, 2.0], 0x5c6773, 0x8d99a6);
  for (const lv of [.62, 1.32]) box(x - .2, 217.5, x + .2, 219.7, .3, 0x9aa7b4, { z: lv });
}
box(188.4, 221.4, 189.8, 222.2, .9, 0x7b8794); box(191.2, 221.6, 192.2, 222.4, .9, 0x7b8794);
for (const y of [221.5, 222.0, 222.5, 223.0]) box(186.6, y - .18, 187.1, y + .18, .9, 0xc0392b);
box(186.6, 219.6, 187.0, 220.6, 1.6, 0xe0b84a);
// compresores
for (const [a, b] of [[194.6, 195.9], [196.9, 198.2], [199.4, 200.7]]) {
  box(a, 216.4, b, 218.3, 1.6, 0x4f6d8a); box(a + .2, 216.6, b - .2, 218.1, .25, 0x8fa3b5, { z: 1.6 });
}
{ const tank = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 2.6, 24), mat(0x9aa7b4));
  tank.position.copy(W(201.4, 219.8, 1.3)); tank.castShadow = true; scene.add(tank); }

// ---------------------------------------------------------------- production line
const ST = [167.2, 171.25, 175.3, 179.4, 183.3];
const stationRings = [];
ST.forEach((s, i) => {
  if (i < 4) {
    box(s - .7, 204.2, s + .7, 206.7, 1.9, 0x4e6fae);            // press body
    box(s - .55, 204.6, s + .55, 206.3, .5, 0x37507f, { z: 1.9 }); // press head
    box(s - .2, 205.1, s + .2, 205.9, .25, 0xd8dde3, { z: 1.12 }); // ram
  } else {
    box(s - .4, 204.2, s + .4, 206.5, 1.7, 0xd35d3b);
    box(s - .1, 205.4, s + .1, 205.9, .5, 0x2b2f35, { z: 1.2 });
  }
  box(s - .7, 209.9, s + .7, 211.4, 1.0, 0x2f8f5f);               // material bin
  box(s - .2, 206.7, s + .2, 209.9, .78, 0x8a9099);               // feeder conveyor
  box(s + .6, 203.3, s + 1.5, 204.1, .9, 0xe6e9ec);               // table
  const op = person(0x2f6fb3); place(op, s, 203.75, 0, Math.PI / 2);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.85, 48),
    new THREE.MeshBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.copy(W(s, 205.2, .03)); scene.add(ring);
  stationRings.push(ring);
});
for (let i = 0; i < 4; i++) {                                     // conveyor bands
  const a = ST[i] + (i < 4 ? .7 : .4), b = ST[i + 1] - (i + 1 < 4 ? .7 : .4);
  box(a, 205.3, b, 206.1, .82, 0x3a3f46);
  box(a, 205.38, b, 206.02, .04, 0x1f2328, { z: .82 });
}
// ESD zone outline
{
  const [x0, y0] = T(517, 414), [x1, y1] = T(566, 503);
  const pts = [W(x0, y0, .04), W(x1, y0, .04), W(x1, y1, .04), W(x0, y1, .04), W(x0, y0, .04)];
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xb03ab0 })));
}

// empaque
box(189.0, 207.0, 192.0, 209.5, .9, 0xe6d3b3); box(189.0, 200.1, 192.0, 202.6, .9, 0xe6d3b3);
for (const [x, y] of [[189.5, 208.6], [190.2, 208.6], [190.9, 207.8], [191.4, 208.7]]) box(x - .25, y - .2, x + .25, y + .2, .35, 0xc8955c, { z: .9 });
// PT racks
const PTX = [[194.7, 195.9], [196.0, 197.2], [197.3, 198.5]];
PTX.forEach(([a, b], i) => {
  const cx = (a + b) / 2;
  rack(cx, 202.45, 1.2, 4.9, 4.4, [.12, 1.65, 3.2], 0x2c5aa0, 0xe8742a);
  for (const lv of [.12, 1.65, 3.2]) for (const y of [200.6, 201.8, 203.0, 204.3]) {
    if (i === 1 && lv === 1.65 && y === 204.3) continue;   // filled in video
    if (i === 2 && lv === .12 && y === 204.3) continue;    // shipped in video
    if ((i + y * 2 + lv) % 3 < .6) continue;
    place(pallet(0xc8955c, .8, true), cx, y, lv, Math.PI / 2);
  }
});
// embarques racks
for (const x of [197.2, 198.4, 199.6]) for (const y of [195.7, 194.4, 193.1]) {
  rack(x, y, 1.05, 1.05, 2.3, [.12, 1.2, 2.25], 0x2c5aa0, 0xe8742a);
  box(x - .4, y - .4, x + .4, y + .4, .7, 0xc8955c, { z: .14 });
  box(x - .4, y - .4, x + .4, y + .4, .6, 0xc8955c, { z: 1.25 });
}

// exits + assembly points
const EXITS = [[159.76, 214.47, 'w'], [159.94, 198.19, 'w'], [159.94, 190.58, 'w'], [189.08, 189.61, 's'], [202.67, 221.53, 'e'], [202.66, 211.32, 'e']];
const exitSigns = [];
for (const [x, y, side] of EXITS) {
  const horiz = side === 's';
  const s = box(horiz ? x - .45 : x - .08, horiz ? y - .08 : y - .45, horiz ? x + .45 : x + .08, horiz ? y + .08 : y + .45, .32, 0x16a34a, { z: 2.65 });
  s.material = new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x16a34a, emissiveIntensity: .25 });
  exitSigns.push(s);
}
const PRS = [[150.6, 210.0, 155.5, 214.9], [152.3, 180.6, 157.3, 185.4], [205.5, 203.4, 210.5, 208.4]];
const prPads = PRS.map(([a, b, c, d]) => {
  const m = box(a, b, c, d, .06, 0x22c55e, { cast: false });
  m.material = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: .1 });
  // marker post
  box((a + c) / 2 - .06, (b + d) / 2 - .06, (a + c) / 2 + .06, (b + d) / 2 + .06, 2.4, 0xe5e7eb);
  box((a + c) / 2 - .6, (b + d) / 2 - .05, (a + c) / 2 + .6, (b + d) / 2 + .05, .9, 0x16a34a, { z: 2.0 });
  return m;
});

// ---------------------------------------------------------------- signage (NOM-026) + extinguishers
const SIGN = {
  O1: ['O', 'EPP'], O2: ['O', 'OÍDO'], O3: ['O', 'CARETA'], O4: ['O', 'ESD'], O5: ['O', 'CHALECO'], O6: ['O', 'GUANTE'],
  A1: ['A', 'MONTAC.'], A2: ['A', 'MANOS'], A4: ['A', 'PRESIÓN'], A5: ['A', 'PARTÍC.'], A6: ['A', 'QUÍMICO'], A7: ['A', 'DESNIVEL'], A8: ['A', 'ESD'], A9: ['A', 'CORTE'],
  P1: ['P', 'NO PASAR'], P2: ['P', 'NO FUMAR'], P3: ['P', 'NO OBST.'], P4: ['P', 'NO SUBIR'], P5: ['P', 'RETENIDO'],
  E4: ['E', '+'], E5: ['E', 'LAVAOJOS'], F1: ['F', 'EXTINTOR'], F2: ['F', 'CO2'], F4: ['F', 'LÁMPARA'], F5: ['F', 'CLASE K'],
};
function signTexture(kind, label) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  if (kind === 'O') { g.fillStyle = '#0b57b5'; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.fillStyle = '#fff'; }
  else if (kind === 'A') { g.fillStyle = '#ffd400'; g.strokeStyle = '#111'; g.lineWidth = 16; g.beginPath(); g.moveTo(128, 14); g.lineTo(246, 230); g.lineTo(10, 230); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#111'; }
  else if (kind === 'P') { g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.fill(); g.strokeStyle = '#d61f1f'; g.lineWidth = 22; g.stroke();
    g.beginPath(); g.moveTo(52, 52); g.lineTo(204, 204); g.stroke(); g.fillStyle = '#111'; }
  else { g.fillStyle = kind === 'E' ? '#12924a' : '#d61f1f'; g.fillRect(8, 8, 240, 240); g.fillStyle = '#fff'; }
  const big = label === '+';
  g.font = `bold ${big ? 170 : (label.length > 6 ? 40 : 50)}px DejaVu Sans, Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, 128, kind === 'A' ? 168 : 130);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const signTexCache = {};
function signAt(code, x, y, h = 2.35, size = .62) {
  const [kind, label] = SIGN[code];
  signTexCache[code] ||= signTexture(kind, label);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexCache[code], transparent: true, alphaTest: .08 }));
  s.position.copy(W(x, y, h)); s.scale.set(size, size, 1); scene.add(s);
  box(x - .025, y - .025, x + .025, y + .025, h - size / 2, 0x9aa3ad, { cast: false });   // small post
  return s;
}
const SROWS = [
  [470, 292, ['O5', 'A7']], [560, 292, ['A1']], [520, 342, ['A1']], [387, 312, ['P5']], [398, 312, ['P1']],
  [672, 328, ['A6', 'E5', 'E4']], [415, 370, ['A1']], [700, 370, ['A1']], [610, 532, ['A1']], [420, 532, ['A1']],
  [414, 400, ['O1', 'O2']], [452, 432, ['A2']], [494, 432, ['A2']], [583, 424, ['A2']], [625, 432, ['A2']], [560, 395, ['P4']],
  [538, 432, ['O4', 'A8', 'F2']], [645, 505, ['E4', 'F1']], [720, 412, ['A9']], [760, 532, ['O5', 'A7', 'E4']],
  [333, 470, ['P1', 'P2']], [333, 481, ['A6', 'O6']], [400, 552, ['F5']],
];
for (const [px, py, codes] of SROWS) codes.forEach((c, i) => { const [x, y] = T(px + i * 9.5, py); signAt(c, x, y); });
for (const [x, y, codes] of [[188.8, 221.15, ['O3', 'A5']], [195.4, 218.9, ['O2', 'A4']], [193.0, 214.85, ['P1', 'P2']]])
  codes.forEach((c, i) => signAt(c, x + i * .91, y));
// extinguishers already in the plan (block positions from the DXF)
for (const [x, y] of [[159.5, 222.3], [170.9, 216.9], [182.9, 216.9], [186.5, 216.6], [193.5, 216.3], [194.6, 211.5], [194.6, 199.4], [201.9, 198.6],
  [196.5, 189.4], [189.9, 189.3], [176.0, 195.3], [172.5, 195.3], [159.5, 192.0], [167.9, 192.2], [159.5, 208.9], [176.5, 211.6], [187.9, 201.7], [174.6, 200.6], [179.6, 194.7]]) {
  const e = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .6, 14), mat(0xd61f1f));
  e.position.copy(W(x, y, .3)); e.castShadow = true; scene.add(e);
  box(x - .13, y - .13, x + .13, y + .13, .02, 0xd61f1f, { cast: false });
}

// area name labels (shown in aerial shots)
function labelTexture(text) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 192;
  const g = c.getContext('2d');
  g.font = 'bold 92px DejaVu Sans, Arial';
  const w = Math.min(1000, g.measureText(text).width + 90);
  g.fillStyle = 'rgba(17,28,44,.86)';
  const x0 = (1024 - w) / 2; g.beginPath(); g.roundRect(x0, 22, w, 148, 34); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 98);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const areaLabels = [
  ['RECIBO', 162.6, 220.4], ['ALMACÉN MP', 178.2, 219.5], ['MANTENIMIENTO', 189.8, 222.0], ['COMPRESORES', 198.0, 221.5],
  ['PRODUCCIÓN', 175.5, 208.2], ['EMPAQUE', 191.4, 206.0], ['PROD. TERMINADO', 198.4, 208.3], ['EMBARQUES', 199.4, 194.0],
  ['OFICINAS Y SERVICIOS', 176.0, 192.8], ['RESIDUOS', 157.4, 205.3], ['CUARENTENA', 161.5, 216.9],
].map(([txt, x, y]) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(txt), transparent: true, depthTest: false, opacity: 0, fog: false }));
  s.position.copy(W(x, y, 9)); s.scale.set(13, 13 * 192 / 1024, 1); s.renderOrder = 10; s.userData.small = txt === 'CUARENTENA';
  scene.add(s); return s;
});

// ---------------------------------------------------------------- sprites (flow diagram symbols)
function symbolTexture(kind, label) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.lineWidth = 12; g.strokeStyle = '#1f2937';
  if (kind === 'O') { g.fillStyle = '#8dc63f'; g.beginPath(); g.arc(128, 128, 108, 0, Math.PI * 2); g.fill(); g.stroke(); }
  else if (kind === 'I') { g.fillStyle = '#9b8cf0'; g.fillRect(24, 24, 208, 208); g.strokeRect(24, 24, 208, 208); }
  else if (kind === 'T') {
    g.fillStyle = '#8cc4f2'; g.beginPath();
    g.moveTo(14, 92); g.lineTo(150, 92); g.lineTo(150, 40); g.lineTo(244, 128); g.lineTo(150, 216); g.lineTo(150, 164); g.lineTo(14, 164); g.closePath();
    g.fill(); g.stroke();
  } else if (kind === 'S') { g.fillStyle = '#2b8cff'; g.beginPath(); g.moveTo(20, 34); g.lineTo(236, 34); g.lineTo(128, 236); g.closePath(); g.fill(); g.stroke(); }
  else if (kind === 'OK') { g.fillStyle = '#22c55e'; g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 26; g.beginPath(); g.moveTo(70, 132); g.lineTo(112, 176); g.lineTo(188, 86); g.stroke(); }
  else if (kind === 'NO') { g.fillStyle = '#ef4444'; g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 26; g.beginPath(); g.moveTo(80, 80); g.lineTo(176, 176); g.moveTo(176, 80); g.lineTo(80, 176); g.stroke(); }
  if (label) {
    g.fillStyle = kind === 'S' ? '#fff' : '#111827';
    g.font = 'bold 96px DejaVu Sans, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, kind === 'T' ? 108 : 128, kind === 'S' ? 100 : 132);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function sprite(kind, label, x, y, h, size) {
  const m = new THREE.SpriteMaterial({ map: symbolTexture(kind, label), transparent: true, depthTest: true, opacity: 0, alphaTest: .08, fog: false });
  const s = new THREE.Sprite(m); s.position.copy(W(x, y, h)); s.scale.set(size, size, 1);
  s.userData.size = size; s.visible = false; scene.add(s); return s;
}

// diagram symbols: [code, x, y, appearTime]
const DIAG = [
  ['S1', 172.2, 219.75, 74, 3.9, 1.0], ['T1', 170.1, 207.6, 86],
  ['I1', 168.8, 202.9, 93], ['O1', 168.8, 202.28, 94.4], ['O2', 168.8, 201.66, 95.8], ['O3', 168.8, 201.04, 97.2], ['O4', 168.8, 200.42, 98.6], ['I2', 168.8, 199.8, 100],
  ['T2', 170.68, 199.8, 101],
  ['O5', 172.55, 199.8, 104], ['O6', 172.55, 200.42, 105.4], ['O7', 172.55, 201.04, 106.8], ['O8', 172.55, 201.66, 108.2], ['O9', 172.55, 202.28, 109.6], ['I3', 172.55, 202.9, 111],
  ['T3', 175.0, 202.9, 112.5],
  ['O10', 177.4, 202.28, 115.5], ['I4', 177.4, 201.66, 118],
  ['T4', 179.45, 199.8, 120],
  ['O11', 181.5, 199.8, 123], ['O12', 181.5, 200.42, 124.5], ['O13', 181.5, 201.04, 126], ['O14', 181.5, 201.66, 127.5], ['I5', 181.5, 202.28, 129],
  ['T5', 183.4, 202.9, 130.5],
  ['O15', 185.3, 202.9, 133.5], ['I6', 185.3, 203.52, 136.5],
  ['T6', 190.8, 204.2, 139], ['S2', 196.6, 204.3, 170, 5.3, 1.0],
];
const diagSprites = DIAG.map(([code, x, y, t0, h = 1.15, size = .5]) => {
  const s = sprite(code[0], code.slice(1), x, y, h, size);
  s.userData.t0 = t0; s.userData.code = code;
  return s;
});
const okSprite = sprite('OK', '', 162.4, 220.6, 2.2, .7);
const noSprite = sprite('NO', '', 160.6, 221.6, 2.2, .7);
const okRing = new THREE.Mesh(new THREE.RingGeometry(.85, 1.05, 40), new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0, depthWrite: false }));
okRing.rotation.x = -Math.PI / 2; scene.add(okRing);
const noRing = okRing.clone(); noRing.material = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0, depthWrite: false }); scene.add(noRing);
const qcSprite = sprite('OK', '', 184.35, 203.7, 1.9, .5);

// diagram path ribbon (built progressively)
const PATH = [[172.25, 218.0, 84], [170.0, 218.0, 86], [170.0, 202.9, 91], [168.8, 202.9, 93], [168.8, 199.8, 100], [172.55, 199.8, 103],
  [172.55, 202.9, 111], [177.4, 202.9, 115], [177.4, 199.8, 119], [181.5, 199.8, 122], [181.5, 202.9, 129.5], [185.3, 202.9, 133],
  [185.3, 204.2, 138], [196.3, 204.2, 168]];
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
    if (t >= ti) pts.push([x, y]);
    else { const u = lin(t, tp, ti); pts.push([px + (x - px) * u, py + (y - py) * u]); break; }
  }
  pathMat.opacity = .9 * fade;
  pathMesh = ribbon(pts, .09, .05, pathMat); scene.add(pathMesh);
}

// evacuation routes (final)
const ROUTES = [[[360, 361], [330, 380]], [[360, 528], [318, 500], [306, 412]], [[360, 609], [350, 645], [330, 662]],
  [[674, 632], [674, 650], [420, 650], [380, 690], [345, 690]], [[826, 296], [870, 340], [870, 420]], [[826, 400], [860, 425]]].map(r => r.map(p => T(...p)));
// prepend the inside exit point so routes start at the door
const evacMat = new THREE.MeshBasicMaterial({ color: 0x16a34a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
let evacMeshes = [];
function updateEvac(t) {
  for (const m of evacMeshes) { scene.remove(m); m.geometry.dispose(); }
  evacMeshes = [];
  const u = lin(t, 202, 207.5), op = lin(t, 201, 202.5) * (1 - lin(t, 213.5, 215));
  if (op <= 0) return;
  evacMat.opacity = op;
  for (const r of ROUTES) {
    const L = r.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - r[i][0], p[1] - r[i][1]), 0);
    let left = L * u; const pts = [r[0]];
    for (let i = 1; i < r.length && left > 0; i++) {
      const d = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]);
      if (left >= d) { pts.push(r[i]); left -= d; }
      else { const k = left / d; pts.push([r[i - 1][0] + (r[i][0] - r[i - 1][0]) * k, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * k]); left = 0; }
    }
    if (pts.length > 1) { const m = ribbon(pts, .55, .08, evacMat); scene.add(m); evacMeshes.push(m); }
  }
}

// ---------------------------------------------------------------- moving actors
function polyAt(pts, u) {
  const seg = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let s = u * L;
  for (let i = 0; i < seg.length; i++) {
    if (s <= seg[i] || i === seg.length - 1) {
      const k = seg[i] ? clamp(s / seg[i], 0, 1) : 0;
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, hd: Math.atan2(by - ay, bx - ax) };
    }
    s -= seg[i];
  }
  const n = pts.length - 1;
  return { x: pts[n][0], y: pts[n][1], hd: Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][0] - pts[n - 1][0]) };
}
// forklift timeline: {t0,t1,pts,rev,lift:[a,b]}  (pts empty => stationary at last pose)
function fkState(tl, start, t) {
  let st = { ...start };
  for (const s of tl) {
    if (t < s.t0) break;
    const u = prog(t, s.t0, s.t1);
    if (s.pts) {
      const p = polyAt(s.pts, u);
      st.x = p.x; st.y = p.y; st.hd = s.rev ? p.hd + Math.PI : p.hd;
    }
    if (s.lift) st.lift = s.lift[0] + (s.lift[1] - s.lift[0]) * u;
    if (t < s.t1) break;
  }
  return st;
}
const front = (st, d = 1.32) => ({ x: st.x + Math.cos(st.hd) * d, y: st.y + Math.sin(st.hd) * d });

const F1 = forklift(0xf2b705), F3 = forklift(0xf28c05);
const F1start = { x: 176.5, y: 225.2, hd: -Math.PI / 2, lift: .3 };
const F1tl = [
  { t0: 14, t1: 26, pts: [[176.5, 225.2], [176.5, 218.0], [164.4, 218.0], [162.9, 219.6]] },
  { t0: 26, t1: 27.5, lift: [.3, .05] },
  { t0: 27.5, t1: 30, pts: [[162.9, 219.6], [164.4, 218.0]], rev: true },
  { t0: 58, t1: 61, pts: [[164.4, 218.0], [162.9, 219.6]] },
  { t0: 61, t1: 62, lift: [.05, .3] },
  { t0: 62, t1: 64, pts: [[162.9, 219.6], [164.4, 218.0]], rev: true },
  { t0: 64, t1: 71, pts: [[164.4, 218.0], [170.8, 217.6], [172.2, 217.9], [172.2, 218.43]] },
  { t0: 71, t1: 74, lift: [.3, 1.78] },
  { t0: 74, t1: 75, lift: [1.78, 1.66] },
  { t0: 75, t1: 77, pts: [[172.2, 218.43], [172.2, 217.6]], rev: true },
  { t0: 75, t1: 78, lift: [1.66, .05] },
  { t0: 78.5, t1: 81, pts: [[172.2, 217.6], [173.9, 217.5], [174.7, 217.9], [174.7, 218.43]] },
  { t0: 81, t1: 82, lift: [.05, .3] },
  { t0: 82, t1: 83.5, pts: [[174.7, 218.43], [174.7, 217.6]], rev: true },
  { t0: 83.5, t1: 92, pts: [[174.7, 217.6], [171.0, 217.7], [170.1, 216.6], [170.1, 213.4], [170.0, 211.1]] },
  { t0: 92, t1: 93, lift: [.3, .05] },
  { t0: 93, t1: 95, pts: [[170.0, 211.1], [170.0, 213.3]], rev: true },
];
const F3start = { x: 199.6, y: 207.0, hd: Math.PI, lift: .05 };
const F3tl = [
  { t0: 156, t1: 160, pts: [[199.6, 207.0], [196.2, 206.7], [195.1, 204.4], [194.13, 204.2]] },
  { t0: 160, t1: 161, lift: [.05, .3] },
  { t0: 161, t1: 163.5, pts: [[194.13, 204.2], [195.2, 204.6], [196.0, 206.9]], rev: true },
  { t0: 163.5, t1: 166, pts: [[196.0, 206.9], [196.6, 206.7], [196.6, 205.62]] },
  { t0: 166, t1: 169, lift: [.3, 1.78] },
  { t0: 169, t1: 170, lift: [1.78, 1.66] },
  { t0: 170, t1: 172, pts: [[196.6, 205.62], [196.6, 207.0]], rev: true },
  { t0: 170, t1: 173, lift: [1.66, .05] },
  { t0: 173, t1: 176, pts: [[196.6, 207.0], [197.6, 206.9], [197.9, 206.4], [197.9, 205.62]] },
  { t0: 176, t1: 177, lift: [.05, .3] },
  { t0: 177, t1: 178.5, pts: [[197.9, 205.62], [197.9, 207.0]], rev: true },
  { t0: 178.5, t1: 188, pts: [[197.9, 207.0], [200.9, 206.6], [201.0, 199.4], [201.2, 193.0], [200.6, 191.2], [199.3, 190.3], [199.3, 187.85]] },
  { t0: 188, t1: 189, lift: [.3, .14] },
  { t0: 189, t1: 191.5, pts: [[199.3, 187.85], [199.3, 191.3]], rev: true },
];

// pallets that move
const PA = pallet(0x4a90a4, .8);                // goes to cuarentena
const PB = pallet(0x2d6db5, .85);               // recibo -> rack
const PC = pallet(0x2a9d8f, .85);               // rack -> production
const PE = pallet(0xc8955c, .8, true);          // packed product -> PT rack
const PF = pallet(0xc8955c, .8, true);          // PT -> trailer
const jackWorker = person(0x6b7280);
const inspector = person(0xffffff, 0x2563eb);

function setFk(obj, st) {
  place(obj, st.x, st.y, 0, st.hd);
  obj.userData.carriage.position.y = st.lift;
}
function carry(p, st, rot = 0) {
  const f = front(st);
  place(p, f.x, f.y, st.lift + .02, st.hd + rot);
}
function dropPose(tl, start, t) { return fkState(tl, start, t); }

// product being assembled
const product = new THREE.Group();
localBox(product, .34, .12, .22, 0x2b2f35, 0, .06, 0);
const pButtons = localBox(product, .12, .04, .08, 0x22c55e, .08, .14, 0);
const pFront = localBox(product, .36, .05, .24, 0x111827, 0, .15, 0);
const pPCB = localBox(product, .3, .02, .18, 0x16a34a, 0, .2, 0);
const pBack = localBox(product, .37, .06, .25, 0x374151, 0, .24, 0);
const pScrew = localBox(product, .05, .05, .05, 0xd1d5db, -.14, .29, .08);
scene.add(product);
const carton = new THREE.Group(); localBox(carton, .5, .32, .4, 0xc8955c, 0, .16, 0); scene.add(carton);

// ---------------------------------------------------------------- camera keyframes [t, px,py,ph, tx,ty,th]
const CAM = [
  [0, 180, 132, 98, 181, 204, 0],
  [9, 224, 156, 74, 181, 205, 0],
  [13, 166, 205, 24, 174, 220, 0],
  [22, 167, 211, 15, 168, 220, 0],
  [30, 167.5, 212, 12, 163, 219.5, 0],
  [38, 167, 213, 10, 162, 220, 0],
  [56, 167, 213, 10, 162, 220, 0],
  [60, 167, 211, 11, 170, 219, 1],
  [76, 168, 211.5, 9.5, 173, 219, 1],
  [83, 176, 210.5, 12, 172, 215, 0],
  [90, 165, 197, 10, 169, 209, 0],
  [92, 163.6, 197.6, 6.4, 168.2, 204.2, .7],
  [101, 163.9, 197.7, 6.3, 168.4, 204.2, .7],
  [104, 167.7, 197.6, 6.4, 172.3, 204.2, .7],
  [112.5, 168, 197.7, 6.3, 172.5, 204.2, .7],
  [115, 171.8, 197.6, 6.4, 176.3, 204.2, .7],
  [120, 172.1, 197.7, 6.3, 176.5, 204.2, .7],
  [122.5, 175.9, 197.6, 6.4, 180.4, 204.2, .7],
  [130.5, 176.2, 197.7, 6.3, 180.6, 204.2, .7],
  [133, 179.8, 197.6, 6.4, 184.3, 204.2, .7],
  [139, 180.1, 197.7, 6.3, 184.5, 204.2, .7],
  [145, 185.2, 195.6, 8, 190, 203.2, 0],
  [152, 186.2, 195.2, 9, 191.5, 204.2, 0],
  [158, 189, 214, 11, 195, 205, 0],
  [166, 192.5, 211.5, 8.5, 196.8, 204.3, .8],
  [174, 193, 211, 8.5, 197.2, 204.0, .8],
  [180, 201.5, 208, 14, 199.8, 197.5, 0],
  [188, 201.6, 200.5, 12, 199.6, 190.5, 0],
  [193, 207.5, 186, 10, 199.5, 186, 0],
  [201, 210, 166, 15, 199.5, 166, 0],
  [206, 180, 152, 74, 180, 204, 0],
  [212, 180, 152, 76, 180, 204, 0],
  [215, 180, 148, 82, 180, 204, 0],
];
function cameraAt(t) {
  let i = 0;
  while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1];
  const u = prog(t, a[0], b[0]);
  const v = k => a[k] + (b[k] - a[k]) * u;
  camera.position.copy(W(v(1), v(2), v(3)));
  camera.lookAt(W(v(4), v(5), v(6)));
}

// ---------------------------------------------------------------- overlay text (optional)
const CARDS = [
  [0, 9, 'Layout de planta', 'Ensamble de control de videojuego', ''],
  [12, 37, '1 · Recibo', 'Recibo de materia prima', 'Descarga de tráiler en andén y traslado al área de recibo'],
  [38, 57, '2 · Calidad', 'Inspección de recibo', 'Material aceptado → almacén · No conforme → cuarentena'],
  [58, 80, '3 · Almacén de materia prima', 'Almacenamiento en racks', 'Componentes inyectados (▽1)'],
  [80, 145, '4 · Producción', 'Línea de ensamble · 5 estaciones', '15 operaciones · 6 inspecciones · bandas transportadoras'],
  [145, 157, '5 · Empaque', 'Empaque del producto', 'Producto aprobado por control de calidad'],
  [157, 176, '6 · Producto terminado', 'Almacén de producto terminado', 'Almacenar producto terminado (▽2)'],
  [176, 200, '7 · Embarque', 'Carga de tráiler y salida', 'Andén de embarques'],
  [200, 215, 'Seguridad', 'Rutas de evacuación', '6 salidas de emergencia · 3 puntos de reunión'],
];
function overlay(t) {
  const card = document.getElementById('card'), title = document.getElementById('title');
  if (!TEXT) { card.style.opacity = 0; title.style.opacity = 0; return; }
  const c = CARDS.find(c => t >= c[0] && t < c[1]);
  if (c && c[0] === 0) {
    title.style.opacity = Math.min(lin(t, .3, 1.5), 1 - lin(t, 7.5, 9));
    document.getElementById('tt').textContent = c[2]; document.getElementById('ts').textContent = c[3];
    card.style.opacity = 0; return;
  }
  title.style.opacity = 0;
  if (!c) { card.style.opacity = 0; return; }
  card.style.opacity = Math.min(lin(t, c[0] + .4, c[0] + 1.4), 1 - lin(t, c[1] - 1.2, c[1] - .2));
  document.getElementById('ck').textContent = c[2];
  document.getElementById('ch').textContent = c[3];
  document.getElementById('cs').textContent = c[4];
}

// ---------------------------------------------------------------- per-frame update
function stationPos(i) { return ST[i]; }
const SCHED = [[92, 101], [103.5, 112.5], [115, 120], [122.5, 130.5], [133, 139]];

function update(t) {
  cameraAt(t);
  overlay(t);

  // forklifts
  const f1 = fkState(F1tl, F1start, t); setFk(F1, f1);
  const f3 = fkState(F3tl, F3start, t); setFk(F3, f3);

  // PA: recibo static -> cuarentena by jack
  {
    const u = prog(t, 49, 56);
    const p = polyAt([[160.6, 221.6], [161.0, 219.4], [161.5, 216.9]], u);
    place(PA, p.x, p.y, 0, Math.PI / 2);
    const w = polyAt([[160.6, 222.6], [161.0, 220.4], [161.5, 217.9]], u);
    place(jackWorker, t < 48 ? 163.5 : w.x, t < 48 ? 223.0 : w.y, 0, t < 48 ? Math.PI : -Math.PI / 2);
    if (t >= 47 && t < 49) { const k = prog(t, 47, 49); place(jackWorker, 163.5 + (160.6 - 163.5) * k, 223.0 + (222.6 - 223.0) * k, 0, Math.PI); }
  }
  // PB: carried by F1 until 27.5, in recibo until 61, carried to rack until 75, then in rack
  if (t < 27.5) carry(PB, f1);
  else if (t < 61) { const d = fkState(F1tl, F1start, 27.5); const f = front(d); place(PB, f.x, f.y, .05, d.hd); }
  else if (t < 75) carry(PB, f1);
  else place(PB, 172.2, 219.75, 1.65, 0);
  // PC: in rack, then carried to production, stays near station 1
  if (t < 82) place(PC, 174.7, 219.75, .12, 0);
  else if (t < 93) carry(PC, f1);
  else { const d = fkState(F1tl, F1start, 93); const f = front(d); place(PC, f.x, f.y, .05, d.hd); }
  // PE: appears at empaque, carried to PT rack
  PE.visible = t >= 149;
  if (t < 160) { const k = prog(t, 149, 151); PE.scale.setScalar(Math.max(k, .001)); place(PE, 192.8, 204.2, 0, Math.PI / 2); }
  else if (t < 170) { PE.scale.setScalar(1); carry(PE, f3, Math.PI / 2); }
  else { PE.scale.setScalar(1); place(PE, 196.6, 204.3, 1.65, 0); }
  // PF: in PT rack, carried to trailer, leaves with trailer
  let trailerDy = 0;
  if (t > 193) trailerDy = -32 * prog(t, 193, 201);
  southTrailer.position.copy(southTrailerBase); southTrailer.position.z -= trailerDy;
  if (t < 176) place(PF, 197.9, 204.3, .12, 0);
  else if (t < 189) carry(PF, f3);
  else { const d = fkState(F3tl, F3start, 189); const f = front(d); place(PF, f.x, f.y + trailerDy, .3, d.hd); }

  // inspector
  {
    let p;
    if (t < 38) p = { x: 163.9, y: 222.5, hd: Math.PI };
    else if (t < 44.5) { const q = polyAt([[163.9, 222.5], [163.3, 221.3]], prog(t, 38, 41.5)); p = { ...q }; }
    else { const q = polyAt([[163.3, 221.3], [161.9, 222.3]], prog(t, 44.5, 46.5)); p = { ...q }; }
    place(inspector, p.x, p.y, 0, p.hd);
  }
  // QC marks
  const okOp = lin(t, 43.5, 44.3) * (1 - lin(t, 57, 58));
  const pb = fkState(F1tl, F1start, 27.5); const pbf = front(pb);
  okRing.position.copy(W(pbf.x, pbf.y, .04)); okRing.material.opacity = okOp;
  okSprite.position.copy(W(pbf.x, pbf.y, 2.25)); okSprite.visible = okOp > 0; okSprite.material.opacity = okOp;
  const noOp = lin(t, 46.5, 47.3) * (1 - lin(t, 57, 58));
  noRing.position.copy(PA.position).setY(.04); noRing.material.opacity = noOp;
  noSprite.position.copy(PA.position).setY(2.2); noSprite.visible = noOp > 0; noSprite.material.opacity = noOp;

  // product along the line
  product.visible = t >= 91.5 && t < 147.5;
  carton.visible = t >= 146 && t < 151;
  if (product.visible) {
    let x = ST[0] + 1.05, y = 203.7, h = .9;
    for (let i = 0; i < 5; i++) {
      const [a, b] = SCHED[i];
      if (t >= a && t < b) { x = ST[i] + 1.05; y = 203.7; break; }
      if (i < 4 && t >= b && t < SCHED[i + 1][0]) {
        const p = polyAt([[ST[i] + 1.05, 203.7], [ST[i] + 1.05, 205.7], [ST[i + 1] + 1.05, 205.7], [ST[i + 1] + 1.05, 203.7]], prog(t, b, SCHED[i + 1][0]));
        x = p.x; y = p.y; h = .9; break;
      }
    }
    if (t < 92) { x = ST[0] + 1.05; y = 203.7; }
    if (t >= 139) {
      const p = polyAt([[184.35, 203.7], [185.3, 204.2], [190.0, 204.2], [190.5, 201.8]], prog(t, 139, 145));
      x = p.x; y = p.y; h = .9;
    }
    place(product, x, y, h, 0);
    pButtons.visible = t >= 96; pFront.visible = t >= 107; pPCB.visible = t >= 116.5;
    pBack.visible = t >= 125; pScrew.visible = t >= 134.5;
    const s = 1 - .9 * lin(t, 146, 147.5); product.scale.setScalar(s);
  }
  if (carton.visible) {
    const k = lin(t, 146, 147.5);
    carton.scale.setScalar(Math.max(k, .001));
    const p = polyAt([[190.5, 201.8], [191.6, 203.6], [192.8, 204.2]], prog(t, 149, 151));
    place(carton, p.x, p.y, t < 149 ? .9 : .9 - .9 * prog(t, 149, 151), 0);
  }

  // station rings
  stationRings.forEach((r, i) => {
    const [a, b] = SCHED[i];
    r.material.opacity = .85 * Math.min(lin(t, a - .3, a + .4), 1 - lin(t, b - .3, b + .4));
  });
  const qc = lin(t, 136.6, 137.3) * (1 - lin(t, 140, 141));
  qcSprite.visible = qc > 0; qcSprite.material.opacity = qc;

  // diagram sprites + path ribbon
  const fade = 1 - lin(t, 176, 178.5);
  for (const s of diagSprites) {
    const t0 = s.userData.t0;
    let op = lin(t, t0, t0 + .45) * fade;
    if (s.userData.code === 'S1') op *= 1 - lin(t, 84, 86);
    s.visible = op > 0; s.material.opacity = op;
    const pop = 1 + .45 * Math.sin(Math.PI * lin(t, t0, t0 + .6));
    s.scale.set(s.userData.size * pop, s.userData.size * pop, 1);
  }
  updatePath(t, fade);

  // safety finale
  const glow = lin(t, 200.5, 202) * (1 - lin(t, 213.5, 215));
  const puls = .5 + .5 * Math.sin(t * 6);
  exitSigns.forEach(s => { s.material.emissiveIntensity = .25 + glow * (1.2 + puls); });
  prPads.forEach(p => { p.material.emissiveIntensity = .1 + glow * (.6 + .5 * puls); });
  updateEvac(t);

  // area labels only when the camera is high
  const camH = camera.position.y;
  const lop = TEXT ? clamp((camH - 24) / 12, 0, 1) : 0;
  areaLabels.forEach(l => { const o = l.userData.small ? 0 : lop; l.material.opacity = o; l.visible = o > 0.01; });
  // production step box
  const stepEl = document.getElementById('step');
  const STEPS = [
    [84, 92, 'T1 · Transporte', 'Componentes del almacén de MP a la Estación 1'],
    [92, 101, 'Estación 1 · Botones', 'I1 Inspeccionar componentes<br>O1–O4 Ensamblar A-EB-001 a A-EB-005<br>I2 Inspeccionar sub-ensamble 1'],
    [101, 112.5, 'Estación 2 · Carcasa frontal', 'O5–O9 Ensamblar B-CF-001 a B-CF-005<br>I3 Inspeccionar sub-ensamble 2'],
    [112.5, 120, 'Estación 3 · PCB (zona ESD)', 'O10 Ensamblar C-EP-001 con C-EP-002<br>I4 Inspeccionar sub-ensamble'],
    [120, 130.5, 'Estación 4 · Carcasa trasera', 'O11–O14 Ensamblar D-EP-001, D-CF-002, D-CF-003, D-EC-004<br>I5 Inspeccionar sub-ensamble'],
    [130.5, 139, 'Estación 5 · Tornillería', 'O15 Atornillar D-EC-002<br>I6 Inspección de control de calidad'],
    [139, 145, 'T6 · Transporte', 'Producto aprobado hacia empaque'],
  ];
  const st = TEXT && STEPS.find(s => t >= s[0] && t < s[1]);
  if (st) {
    stepEl.innerHTML = `<b>${st[2]}</b><br>${st[3]}`;
    stepEl.style.opacity = Math.min(lin(t, st[0] + .2, st[0] + .8), 1 - lin(t, st[1] - .5, st[1]));
  } else stepEl.style.opacity = 0;

  // fades at both ends
  document.getElementById('c').style.opacity = Math.min(lin(t, 0, 1.2), 1 - lin(t, DURATION - 1.5, DURATION));
}

window.renderAt = async (t) => {
  await ready;
  update(t);
  renderer.render(scene, camera);
  return true;
};
window.__ready = ready.then(() => true);
