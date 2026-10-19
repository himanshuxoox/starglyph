// Episode 1 — "The Signal". Deterministic: everything is a function of t (seconds).
import * as THREE from 'three';
import { AsciiEngine, SET, tag, smooth, lerp, v3, fbm, hash2, captionAt, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makeGrass, makePool, burst } from './engine/fx.js';

const EP = await (await fetch('./episodes/ep01.json')).json();
await Promise.all([
  document.fonts.load('800 40px "JetBrains Mono"'), document.fonts.load('600 30px "JetBrains Mono"'),
  document.fonts.load('500 22px "Saira Condensed"'), document.fonts.load('700 50px "Saira Condensed"'),
]);

const engine = new AsciiEngine(document.getElementById('c'));
const scene = new THREE.Scene();
const moonFog = new THREE.Fog(0x05060c, 70, 420), ringFog = new THREE.Fog(0x2a1440, 300, 1400);
const camera = new THREE.PerspectiveCamera(58, 720 / 1280, 0.1, 6000);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1, ...o });
const glow = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false });

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// =====================================================================
// MOON
// =====================================================================
const moon = new THREE.Group(); scene.add(moon);
const SHIP = { x: 0, z: -70 };
const CRATERS = [
  { x: SHIP.x, z: SHIP.z, r: 46, d: 11 }, { x: -42, z: 18, r: 14, d: 3 }, { x: 30, z: 8, r: 9, d: 2 },
  { x: -16, z: 58, r: 7, d: 1.5 }, { x: 24, z: 58, r: 12, d: 2.5 }, { x: -70, z: -30, r: 22, d: 4 },
  { x: 60, z: -45, r: 16, d: 3 }, { x: 12, z: 24, r: 5, d: 1 }, { x: -9, z: 6, r: 6, d: 1.2 },
  { x: 40, z: 40, r: 7, d: 1.4 }, { x: -30, z: 45, r: 9, d: 2 }, { x: 80, z: 30, r: 25, d: 5 },
  { x: -110, z: 60, r: 30, d: 6 }, { x: 15, z: -150, r: 35, d: 6 }, { x: -90, z: -140, r: 28, d: 5 },
];
for (let i = 0; i < 40; i++) CRATERS.push({ x: (hash2(i, 3) - 0.5) * 300, z: (hash2(i, 7) - 0.5) * 300, r: 3 + hash2(i, 9) * 6, d: 0.6 + hash2(i, 11) });
function moonH(x, z) {
  let h = (fbm(x * 0.025, z * 0.025) - 0.5) * 7 + (fbm(x * 0.16, z * 0.16) - 0.5) * 2.0;
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1.8) { if (d < 1) h -= c.d * (1 - d * d); h += c.d * 0.32 * Math.exp(-(((d - 1) / 0.16) ** 2)); }
  }
  return h;
}
{
  const geo = new THREE.PlaneGeometry(900, 900, 440, 440); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, moonH(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, std(0x8f8d96, { roughness: 1, flatShading: true }));
  ground.receiveShadow = true; moon.add(tag(ground, SET.ROCK));
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 320; i++) {
    const x = (hash2(i, 21) - 0.5) * 120, z = 70 - hash2(i, 23) * 150;
    if (Math.hypot(x - SHIP.x, (z - SHIP.z) * 0.9) < 30) continue;
    const s = 0.2 + hash2(i, 25) ** 3 * 2.2;
    const r = new THREE.Mesh(rockGeo, std(0x7d7b84, { roughness: 1, flatShading: true }));
    r.scale.set(s, s * 0.7, s * 1.1); r.rotation.set(hash2(i, 1) * 3, hash2(i, 2) * 3, 0);
    r.position.set(x, moonH(x, z) + s * 0.2, z); r.castShadow = r.receiveShadow = true;
    moon.add(tag(r, SET.ROCK));
  }
}
for (let i = 0; i < 26; i++) {
  const a = (i / 26) * Math.PI * 2 + hash2(i, 81) * 0.2, d = 330 + hash2(i, 83) * 80;
  const m = new THREE.Mesh(new THREE.ConeGeometry(50 + hash2(i, 85) * 90, 18 + hash2(i, 87) * 40, 7, 3), std(0x8a8893, { roughness: 1, flatShading: true }));
  m.position.set(Math.cos(a) * d, -6, Math.sin(a) * d - 40); m.rotation.y = hash2(i, 89) * 3;
  moon.add(tag(m, SET.ROCK));
}
const sun = new THREE.DirectionalLight(0xfff3e2, 3.4);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 400 });
const fill = new THREE.DirectionalLight(0xb7a6ff, 0.9); fill.position.set(40, 30, 80);
moon.add(sun, sun.target, fill, new THREE.HemisphereLight(0x8fa3ff, 0x1a1a1a, 0.3));

// Earth
const earthTex = canvasTex(512, 256, (g, w, h) => {
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x * 0.02, y * 0.03, 5), cl = fbm(x * 0.03 + 50, y * 0.08, 4), lat = Math.abs(y / h - 0.5) * 2;
    let c = [24, 70, 170];
    if (n > 0.52) c = n > 0.62 ? [150, 120, 70] : [50, 130, 60];
    if (lat > 0.85) c = [235, 240, 255];
    if (cl > 0.58) c = c.map(v => lerp(v, 245, 0.85));
    const k = (y * w + x) * 4; img.data.set([...c, 255], k);
  }
  g.putImageData(img, 0, 0);
});
const earth = new THREE.Mesh(new THREE.SphereGeometry(48, 48, 24),
  new THREE.MeshStandardMaterial({ map: earthTex, emissiveMap: earthTex, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 1 }));
earth.position.set(-129, moonH(0, 40) + 262, -378); earth.rotation.set(0.3, 2.2, 0);
earth.material.fog = false; moon.add(tag(earth, SET.PLANET));

// Lander
const lander = new THREE.Group();
{
  const gold = std(0xd8aa3e, { metalness: 0.6, roughness: 0.35 }), silver = std(0xc7cad3, { metalness: 0.5, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.6), gold); body.position.y = 2.3;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 1.3, 8), silver); top.position.y = 3.85;
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.3, 12, 1, true), silver); dish.position.set(0.8, 4.9, 0); dish.rotation.z = 2.4;
  lander.add(body, top, dish);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4), silver);
    leg.position.set(sx * 1.65, 1.0, sz * 1.65); leg.rotation.set(sz * 0.45, 0, -sx * 0.45);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 10), silver); pad.position.set(sx * 2.15, 0.05, sz * 2.15);
    lander.add(leg, pad);
  }
  lander.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  tag(lander, SET.PROP);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3, 12), glow(3, 1.4, 0.4));
  flame.rotation.x = Math.PI; flame.position.y = 0.2; flame.name = 'flame'; lander.add(tag(flame, SET.ENERGY));
}
moon.add(lander);

// Hero: original Vanguard exo-suit (used in both worlds)
const hero = makeHero(); scene.add(hero.root);

// Crashed mothership
const ship = new THREE.Group(); const SHIP_FLOOR = moonH(SHIP.x, SHIP.z);
ship.position.set(SHIP.x, SHIP_FLOOR, SHIP.z); moon.add(ship);
const bands = [];
let spine, panel, runes;
{
  const hullMat = std(0x5b5180, { metalness: 0.55, roughness: 0.5, flatShading: true });
  const hullG = new THREE.Group(); hullG.position.y = 3; hullG.rotation.z = 0.1; ship.add(hullG);
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 28), hullMat); hull.scale.set(36, 8.5, 12.5);
  hull.castShadow = hull.receiveShadow = true; hullG.add(hull);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(52, 1.3, 2.2), hullMat); ridge.position.y = 8.3; hullG.add(ridge);
  const ribGeo = new THREE.TorusGeometry(1, 0.05, 6, 64), ribMat = std(0x3b3456, { metalness: 0.6, roughness: 0.5 });
  for (let k = -7; k <= 7; k++) {
    const x = k * 4.4, f = Math.sqrt(1 - (x / 36) ** 2);
    const rib = new THREE.Mesh(ribGeo, ribMat); rib.rotation.y = Math.PI / 2; rib.scale.set(12.7 * f, 8.7 * f, 8); rib.position.x = x; hullG.add(rib);
    const bm = glow(0.15, 0.9, 1.0);
    const band = new THREE.Mesh(ribGeo, bm); band.rotation.y = Math.PI / 2; band.scale.set(12.6 * f, 8.65 * f, 5); band.position.x = x + 1.2;
    hullG.add(tag(band, SET.ENERGY)); bands.push({ x, m: bm });
  }
  spine = new THREE.Mesh(new THREE.BoxGeometry(54, 0.35, 0.5), glow(0.2, 1, 1)); spine.position.y = 9.05; hullG.add(tag(spine, SET.ENERGY));
  const finShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(11, 0), new THREE.Vector2(3, 10)]);
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.8, bevelEnabled: false });
  const fin1 = new THREE.Mesh(finGeo, hullMat); fin1.position.set(-30, 6, -0.4); fin1.rotation.z = 0.25; hullG.add(fin1);
  const fin2 = new THREE.Mesh(finGeo, hullMat); fin2.position.set(-22, -2.5, 16); fin2.rotation.set(-1.2, 0.4, 0.3); ship.add(fin2);
  const eng = new THREE.Mesh(new THREE.TorusGeometry(5, 1.3, 8, 24), ribMat); eng.position.x = -35; eng.rotation.y = Math.PI / 2; hullG.add(eng);
  const chunk = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), hullMat); chunk.scale.set(9, 5, 7); chunk.position.set(44, 0.5, -6); chunk.rotation.set(0.4, 0.8, 0.6); ship.add(chunk);
  ship.traverse(o => { if (o.isMesh && o.userData.set === undefined) { tag(o, SET.METAL); o.castShadow = o.receiveShadow = true; } });

  panel = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), glow(0.3, 1.2, 1.3));
  panel.position.set(0.2, 1.75, 12.45); panel.rotation.x = -0.12; ship.add(tag(panel, SET.ENERGY));
  const runeTex = canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 5;
    for (let i = 0; i < 18; i++) {
      const x0 = 14 + i * 27; g.beginPath();
      for (let s = 0; s < 4; s++) { const a = hash2(i, s) * 6.28; g.moveTo(x0 + 10, 48); g.lineTo(x0 + 10 + Math.cos(a) * 12, 48 + Math.sin(a) * 30); }
      g.stroke();
    }
  });
  runes = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: runeTex, color: new THREE.Color(0.3, 1, 1), blending: THREE.AdditiveBlending, transparent: true }));
  runes.position.set(0.2, 3.7, 12.15); runes.rotation.x = -0.25; ship.add(tag(runes, SET.ENERGY));
}
// signal beam + pulse rings
const beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1, 1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 700, 24, 1, true), beamMat);
beam.position.set(SHIP.x, SHIP_FLOOR + 350, SHIP.z); moon.add(tag(beam, SET.ENERGY));
const rings = [0, 1, 2].map(() => {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1, 1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.4, 6, 96), m); r.rotation.x = Math.PI / 2;
  r.visible = false; return r;
});

// debris around the ship (levitates on activation)
const debris = [];
{
  const rockGeo = new THREE.DodecahedronGeometry(1, 0), mat = std(0x7d7b84, { roughness: 1, flatShading: true });
  for (let i = 0; i < 130; i++) {
    const a = hash2(i, 91) * Math.PI * 2, d = 15 + hash2(i, 93) * 30;
    const x = SHIP.x + Math.cos(a) * d * 1.4, z = SHIP.z + Math.sin(a) * d;
    if (Math.abs(x - SHIP.x) < 40 && Math.abs(z - SHIP.z) < 13.5) continue;
    if (Math.abs(z - (SHIP.z + 14.6)) < 2.5 && x > -18 && x < 3) continue;
    const s = 0.15 + hash2(i, 95) ** 2 * 1.4;
    const m = new THREE.Mesh(rockGeo, mat); m.scale.set(s, s * 0.75, s); m.castShadow = true;
    const base = v3(x, moonH(x, z) + s * 0.3, z); m.position.copy(base); moon.add(tag(m, SET.ROCK));
    debris.push({ m, base, h: hash2(i, 97) });
  }
}
const dustPool = makePool(2000, new THREE.IcosahedronGeometry(1, 0), std(0xc8c5d0, { roughness: 1, flatShading: true }), SET.ROCK); moon.add(dustPool.mesh);
const printPool = makePool(240, new THREE.BoxGeometry(0.16, 0.02, 0.28), std(0x55535c, { roughness: 1 }), SET.ROCK); moon.add(printPool.mesh);

// =====================================================================
// RING WORLD
// =====================================================================
let alienSun;
const ringW = new THREE.Group(); ringW.visible = false; scene.add(ringW);
const ringH = (x, z) => (fbm(x * 0.008, z * 0.008) - 0.5) * 40 * smooth(25, 260, Math.hypot(x, z)) + (fbm(x * 0.06, z * 0.06) - 0.5) * 1.2;
{
  const skyTex = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#03030c'); gr.addColorStop(0.32, '#0c0a2a'); gr.addColorStop(0.47, '#3a1850'); gr.addColorStop(0.5, '#7a3570'); gr.addColorStop(1, '#100818');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      const x = hash2(i, 41) * w, y = 60 + hash2(i, 43) * 170, r = 40 + hash2(i, 45) * 90;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, i % 2 ? 'rgba(90,60,200,0.35)' : 'rgba(200,60,160,0.28)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    }
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false }));
  ringW.add(tag(sky, SET.SKY));

  const geo = new THREE.PlaneGeometry(1800, 1800, 220, 220); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, cols = [];
  const teal = new THREE.Color(0x1d8a7a), violet = new THREE.Color(0x5a33a0), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); p.setY(i, ringH(x, z));
    tmp.copy(teal).lerp(violet, smooth(0.35, 0.65, fbm(x * 0.02 + 9, z * 0.02))); cols.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  ground.receiveShadow = true; ringW.add(tag(ground, SET.GRASS));

  const bandTex = canvasTex(2048, 128, (g, w, h) => {
    g.fillStyle = '#9aa3b8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) for (let y = 14; y < h - 14; y += 2) {
      const n = fbm(x * 0.012, y * 0.05, 4), c = fbm(x * 0.02 + 30, y * 0.12, 3);
      let col = n > 0.5 ? (n > 0.6 ? '#4f8a4a' : '#3d9a6a') : '#2a5fb8';
      if (c > 0.6) col = '#e8eef8';
      g.fillStyle = col; g.fillRect(x, y, 2, 2);
    }
  });
  bandTex.wrapS = THREE.RepeatWrapping; bandTex.repeat.set(5, 1);
  const halo = new THREE.Mesh(new THREE.CylinderGeometry(1500, 1500, 360, 360, 1, true),
    new THREE.MeshStandardMaterial({ map: bandTex, emissiveMap: bandTex, emissive: 0xffffff, emissiveIntensity: 0.55, side: THREE.DoubleSide, roughness: 1, fog: false }));
  halo.position.set(-200, -400, -2600); halo.rotation.set(1.35, 0, -0.3);
  halo.name = 'halo'; window.halo = halo; ringW.add(tag(halo, SET.PLANET));

  const star = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 12), glow(4, 3.2, 3.6)); star.position.set(-950, 260, -1900); ringW.add(tag(star, SET.PLANET));
  const moon2 = new THREE.Mesh(new THREE.SphereGeometry(110, 32, 16), std(0x9fb2ff, { emissive: 0x223366, emissiveIntensity: 0.5, fog: false }));
  moon2.position.set(800, 820, -2100); ringW.add(tag(moon2, SET.PLANET));

  const cMat = std(0x78d6ff, { emissive: 0x16406a, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.3, flatShading: true });
  for (let i = 0; i < 46; i++) {
    const a = hash2(i, 61) * Math.PI * 2, d = 70 + hash2(i, 63) ** 1.5 * 420;
    const x = Math.sin(a) * d, z = -Math.abs(Math.cos(a)) * d - 10 + (i % 4 === 0 ? d * 0.6 : 0);
    const hgt = 6 + hash2(i, 65) * (d > 150 ? 90 : 30);
    const c = new THREE.Mesh(new THREE.ConeGeometry(hgt * 0.18, hgt, 5), cMat);
    c.position.set(x, ringH(x, z) + hgt * 0.42, z); c.rotation.set((hash2(i, 67) - 0.5) * 0.5, hash2(i, 69) * 3, (hash2(i, 71) - 0.5) * 0.5);
    c.castShadow = true; ringW.add(tag(c, SET.METAL));
  }
  alienSun = new THREE.DirectionalLight(0xffc7ea, 2.6); alienSun.position.set(-60, 30, -50);
  alienSun.castShadow = true; alienSun.shadow.mapSize.set(1024, 1024);
  Object.assign(alienSun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 300 });
  const rimFill = new THREE.DirectionalLight(0xa9b8ff, 1.3); rimFill.position.set(-20, 15, 40);
  ringW.add(alienSun, alienSun.target, rimFill, new THREE.HemisphereLight(0x8a7cff, 0x183830, 0.7));
}

// reactive grass field, spores, glow plants
const grass = makeGrass({ area: [-14, 14, -42, 7], density: 30, heightFn: ringH, colA: 0x22b39a, colB: 0x7a48d8, tall: 0.6 });
ringW.add(grass.mesh);
const sporePool = makePool(320, new THREE.IcosahedronGeometry(1, 1), glow(0.35, 1.3, 1.0), SET.ENERGY); ringW.add(sporePool.mesh);
const plants = [];
for (let i = 0; i < 60; i++) {
  let x = (hash2(i, 131) - 0.5) * 16; const z = 1 - hash2(i, 133) * 18;
  if (Math.abs(x) < 1.0 || Math.abs(x + 1.3) < 2.4) continue;
  const h = 0.6 + hash2(i, 135) * 0.6;
  const g = new THREE.Group(); g.position.set(x, ringH(x, z), z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, h, 5), std(0x2b7f74)); stem.position.y = h / 2; g.add(tag(stem, SET.GRASS));
  const bm = glow(1, 0.4, 1); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08 + hash2(i, 137) * 0.05, 10, 8), bm);
  bulb.position.y = h; g.add(tag(bulb, SET.ENERGY));
  ringW.add(g); plants.push({ g, bm, x, z, hue: hash2(i, 139) });
}

// =====================================================================
// TIMELINE
// =====================================================================
const E = EP.events;
const lookAt = new THREE.Vector3();
function shake(t, amp) { return v3(Math.sin(t * 53) * amp, Math.sin(t * 61 + 1) * amp, Math.sin(t * 47 + 2) * amp * 0.5); }

// Pure hero state for time t (so footfalls can be precomputed and any frame rendered independently)
function heroState(t) {
  const S = { vis: true, x: 0, z: 0, rotY: Math.PI, walk: 0, phase: 0, reach: 0, crouch: 0, lookUp: 0, world: t >= E.world_switch ? 'ring' : 'moon' };
  if (S.world === 'moon') {
    if (t < 5) S.vis = false;
    else if (t < 10.5) { S.x = 2.6 + Math.sin(t * 0.7) * 0.4; S.z = 35 - 1.6 * (t - 5); S.walk = 1; S.phase = t * 5.2; }
    else if (t < 17) { S.x = 0.8; S.z = lerp(-16, -22.5, smooth(10.5, 13.6, t)); S.walk = 1 - smooth(13.2, 13.7, t); S.phase = t * 5.2; S.lookUp = -0.3 * smooth(13.5, 15, t); }
    else if (t < 24) {
      const turn = smooth(23.0, 23.9, t);
      S.x = lerp(-15, -0.3, smooth(17, 23.2, t) * 0.25 + clamp01((t - 17) / 6.2) * 0.75); S.z = SHIP.z + 14.6;
      S.rotY = lerp(Math.PI / 2, Math.PI, turn); S.walk = 1 - turn; S.phase = t * 5.0;
    } else {
      S.x = -0.3; S.z = SHIP.z + 14.6 - 0.9 * smooth(24.2, 25.4, t);
      S.walk = 0.6 * (smooth(24.2, 24.5, t) - smooth(25.1, 25.4, t)); S.phase = t * 5;
      S.reach = smooth(24.4, 25.6, t); S.lookUp = 0.25 * smooth(26.5, 28, t);
    }
  } else {
    S.crouch = 1 - smooth(32.8, 34.6, t);
    S.z = -1.3 * Math.min(5.6, Math.max(0, t - 35)); S.x = Math.sin(Math.max(0, t - 35) * 0.5) * 0.3;
    S.walk = smooth(34.8, 35.3, t) * (1 - smooth(40.2, 40.8, t)); S.phase = t * 4.6;
    S.lookUp = Math.max(smooth(40.8, 42.3, t), 0.45 * (smooth(33.3, 34.2, t) - smooth(34.6, 35.2, t)));
  }
  return S;
}
// footfalls: every half gait cycle while walking
const FOOT = [];
{
  let prev = null;
  for (let t = 5; t < EP.duration; t += 1 / 240) {
    const S = heroState(t);
    if (!S.vis || S.walk < 0.4) { prev = null; continue; }
    const k = Math.floor(S.phase / Math.PI);
    if (prev !== null && k !== prev) {
      const side = k % 2 ? 1 : -1;
      FOOT.push({ t, x: S.x + Math.cos(S.rotY) * side * 0.16, z: S.z - Math.sin(S.rotY) * side * 0.16, rotY: S.rotY, world: S.world, i: FOOT.length });
    }
    prev = k;
  }
}
const WAVE_T = 33.2; // residual teleport pulse from the suit

function update(t) {
  const inRing = t >= E.world_switch;
  moon.visible = !inRing; ringW.visible = inRing; scene.fog = inRing ? ringFog : moonFog;
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / E.beep_every);
  const act = smooth(E.touch, E.activate_end, t);
  const S = heroState(t), hf = inRing ? ringH : moonH;
  hero.root.visible = S.vis; poseHero(hero, S, t);
  hero.root.position.set(S.x, hf(S.x, S.z), S.z); hero.root.rotation.set(0, S.rotY, 0);
  hero.root.updateMatrixWorld(true);
  const a = hero.root.position;
  const wt = t - WAVE_T;
  hero.headLight.intensity = inRing ? 4 : 30;
  hero.cyanMat.color.setRGB(0.35, 1.6, 1.8).multiplyScalar(1 + (inRing && wt > 0 ? 3 * Math.exp(-wt * 1.4) : 0) + (inRing ? 0 : act * 1.5));

  if (!inRing) {
    let focus = a;
    if (t < 5) {
      const ground = moonH(0, 40);
      lander.position.set(0, ground + 13 * (1 - smooth(0, 4.6, t)) ** 1.3, 40); lander.rotation.y = 0.5;
      lander.getObjectByName('flame').visible = t < 4.7; lander.getObjectByName('flame').scale.y = 0.8 + 0.3 * Math.sin(t * 40);
      const k = t / 5;
      camera.position.set(lerp(5.5, 4.6, k), moonH(5, 55) + lerp(1.2, 1.8, k), lerp(56.5, 54.5, k));
      lookAt.set(0, ground + lerp(9.5, 5, k), 36);
      focus = lander.position;
    } else {
      lander.position.set(0, moonH(0, 40), 40); lander.getObjectByName('flame').visible = false;
      if (t < 10.5) {
        camera.position.copy(a).add(v3(3.6 - (t - 5) * 0.15, 2.3, 7.2)); lookAt.copy(a).add(v3(-0.6, 1.9, -10));
      } else if (t < 17) {
        const k = smooth(11.8, 16.0, t);
        camera.position.copy(a).add(v3(lerp(1.4, -2, k), lerp(1.7, 11, k), lerp(4.6, 11, k)));
        lookAt.copy(a).add(v3(0, 1.5, -10)).lerp(v3(SHIP.x - 4, SHIP_FLOOR + 4, SHIP.z), k);
      } else if (t < 24) {
        camera.position.copy(a).add(v3(-1.6, 2.3, 9.5)); lookAt.copy(a).add(v3(1.8, 2.8, -4));
      } else {
        const k = smooth(25.8, 29.2, t);
        camera.position.copy(a).add(v3(1.5, 2.3, 2.9)).lerp(v3(12, SHIP_FLOOR + 27, SHIP.z + 62), k).add(shake(t, 0.06 + 0.5 * act));
        lookAt.set(0.2, SHIP_FLOOR + 1.9, SHIP.z + 12.4).lerp(v3(0, SHIP_FLOOR + 5, SHIP.z), k);
      }
    }
    // ---- ship energy reacts to the hero walking past + activation ----
    const idle = 0.25 + 0.25 * Math.max(0, (t - 14) / 10) + 0.25 * pulse;
    const near = S.vis ? smooth(26, 16, Math.abs(a.z - SHIP.z)) : 0;
    for (const b of bands) {
      const on = smooth(0, 0.18, act * 1.25 - Math.abs(b.x) / 36);
      const prox = Math.exp(-((b.x + 1.2 - (a.x - SHIP.x)) ** 2) / 10) * near;
      b.m.color.setRGB(0.15, 0.9, 1.0).multiplyScalar(lerp(idle * 0.6 + 2.4 * prox, 3.2, on));
    }
    spine.material.color.setRGB(0.2, 1, 1).multiplyScalar(lerp(idle * 0.5, 3, smooth(0.3, 0.9, act)));
    const dPanel = Math.hypot(a.x - SHIP.x - 0.2, a.z - SHIP.z - 12.4);
    runes.material.color.setRGB(0.3, 1, 1).multiplyScalar(lerp(0.5 + 0.8 * pulse + 2 * smooth(9, 2, dPanel) * near, 3, act));
    const touchFlash = smooth(E.touch - 0.1, E.touch + 0.1, t);
    panel.material.color.setRGB(0.3, 1.2, 1.3).multiplyScalar(lerp(0.5 + 0.5 * pulse + 1.5 * smooth(6, 1.5, dPanel) * near, 4, touchFlash));
    const br = lerp(1.2, 7, act);
    beam.scale.set(br, 1, br); beamMat.opacity = lerp(0.25 + 0.35 * pulse, 1, act);
    // ---- debris levitates when the ship wakes ----
    for (const d of debris) {
      const lift = smooth(E.touch + 0.3 + d.h, E.touch + 2.6 + d.h, t);
      d.m.position.set(d.base.x, d.base.y + lift * (1.2 + d.h * 6) + Math.sin(t * 1.7 + d.h * 20) * 0.25 * lift, d.base.z);
      d.m.rotation.set(d.h * 6 + lift * t * 0.8, d.h * 3 + lift * t * 0.5, 0);
    }
    // ---- dust: footsteps, lander thruster, activation shockwave (moon gravity) ----
    const dust = [], prints = [];
    for (const f of FOOT) {
      if (f.world !== 'moon' || f.t > t) continue;
      prints.push({ x: f.x, y: moonH(f.x, f.z), z: f.z, s: 1, ry: f.rotY });
      if (t - f.t < 1.8) burst(dust, t, { t0: f.t, x: f.x, z: f.z, y: moonH(f.x, f.z) + 0.05, count: 14, seed: f.i * 17 + 3,
        hs: [0.2, 0.9], vs: [0.4, 1.4], dir: f.rotY + Math.PI, spread: 2.6, life: 1.8, size: 0.06, groundFn: moonH });
    }
    if (t < 8) burst(dust, t, { t0: 2.4, tStagger: 2.3, x: 0, z: 40, y: moonH(0, 40) + 0.1, r0: 1.5, count: 800, seed: 501,
      hs: [3, 10], vs: [0.1, 1.3], life: 2.8, size: 0.13, groundFn: moonH });
    burst(dust, t, { t0: E.touch + 0.2, tStagger: 0.8, x: SHIP.x, z: SHIP.z, y: SHIP_FLOOR + 0.3, r0: 13, count: 700, seed: 901,
      hs: [5, 15], vs: [0.5, 3], life: 3.2, size: 0.17, groundFn: moonH });
    dustPool.set(dust); printPool.set(prints.slice(-240));
    sun.target.position.copy(focus); sun.position.copy(focus).add(v3(-80, 24, 22));
  } else {
    // ---- ring world: camera ----
    const k1 = smooth(34.6, 36.2, t), k2 = smooth(40.6, 43.8, t);
    if (t < 34.6) { // wake-up: front close-up on his face through the visor
      camera.position.copy(a).add(v3(lerp(0.8, 0.55, smooth(31, 34.6, t)), 1.15, -2.0));
      lookAt.copy(a).add(v3(0, 1.48 - 0.42 * S.crouch, 0));
    } else {
      camera.position.copy(a).add(v3(-1.3, 1.6, 5.6).lerp(v3(-0.8, 1.1, 8.0), k2));
      lookAt.copy(a).add(v3(0.4, 3.4, -20).lerp(v3(0.2, 1.6, -10), k1)).lerp(v3(-150, 420, -2400), k2 * 0.35);
    }
    alienSun.target.position.copy(a); alienSun.position.copy(a).add(v3(-60, 30, -50));
    // ---- grass parts around his legs, rolls with wind, flattens with the suit pulse ----
    const gu = grass.uniforms;
    gu.uTime.value = t;
    gu.uPush.value[0].set(a.x, a.z, 1.5, 1);
    gu.uPush.value[1].set(a.x - Math.sin(S.rotY) * 0.6, a.z - Math.cos(S.rotY) * 0.6, 1.1, 0.8 * S.walk);
    gu.uWave.value.set(a.x, a.z, Math.max(0, wt) * 9, wt > 0 ? Math.exp(-wt * 0.8) * 1.3 : 0);
    // ---- spores drift, flee from him, get blown out by the pulse ----
    const sp = [];
    for (let i = 0; i < 320; i++) {
      let x = (hash2(i, 151) - 0.5) * 26 + Math.sin(t * 0.35 + i) * 0.8;
      let z = 5 - hash2(i, 153) * 34 + Math.cos(t * 0.3 + i * 1.3) * 0.8;
      let y = ringH(x, z) + 0.3 + hash2(i, 155) * 2.8 + Math.sin(t * 0.9 + i * 2.1) * 0.25;
      const dx = x - a.x, dz = z - a.z, dl = Math.hypot(dx, dz) + 1e-3;
      const rep = Math.max(0, 3.4 - dl) * 0.9;
      const wv = wt > 0 ? Math.exp(-(((dl - wt * 9) / 2) ** 2)) * Math.exp(-wt * 0.7) * 2.5 : 0;
      x += dx / dl * (rep + wv); z += dz / dl * (rep + wv); y += rep * 0.4 + wv * 0.6;
      sp.push({ x, y, z, s: 0.04 + hash2(i, 157) * 0.06 });
    }
    sporePool.set(sp);
    // ---- glow plants light up and lean away as he passes ----
    for (const p of plants) {
      const dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz) + 1e-3;
      const lean = smooth(2.2, 0.5, d) * 0.7, sway = Math.sin(t * 1.25 - p.x * 0.16) * 0.1;
      p.g.rotation.set(dz / d * lean + sway * 0.3, 0, -dx / d * lean + sway);
      const wv = wt > 0 ? Math.exp(-(((d - wt * 9) / 1.5) ** 2)) * 2.5 * Math.exp(-wt * 0.7) : 0;
      p.bm.color.setRGB(...(p.hue > 0.5 ? [1.0, 0.35, 1.0] : [0.3, 1.0, 1.0])).multiplyScalar(0.35 + 3 * smooth(3.8, 1.0, d) + wv);
    }
  }
  camera.position.y = Math.max(camera.position.y, hf(camera.position.x, camera.position.z) + 0.7);
  camera.lookAt(lookAt);

  // ---- post fx ----
  const u = engine.u;
  u.time.value = t;
  u.flash.value = Math.max(smooth(E.flash_start, E.flash_start + 0.9, t) * (1 - smooth(E.world_switch, E.flash_end, t)), 0);
  u.glitch.value = smooth(E.flash_start + 0.2, E.flash_start + 0.8, t) * (1 - smooth(E.world_switch + 0.6, E.flash_end + 0.4, t));
  u.exposure.value = inRing ? 1.9 : 1.6;
}

// ---- HUD overlay ----
const $ = id => document.getElementById(id);
$('tag').textContent = EP.series; $('title').textContent = EP.title;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function hud(t) {
  const c = captionAt(EP.captions, t, 30);
  const cur = c && (c.typing || Math.floor(t * 2.6) % 2 === 0) ? '<span id="cur"></span>' : '';
  $('cap').innerHTML = c ? esc(c.text) + cur : ''; $('cap').style.opacity = c ? c.fade : 0;
  const [b0, b1] = E.big_text, bo = smooth(b0, b0 + 0.15, t) * (1 - smooth(b1 - 0.3, b1, t));
  const big = $('big'), j = Math.floor(t * 24);
  big.style.opacity = bo > 0 && hash2(j, 5) > 0.15 ? bo : 0;
  const dx = (hash2(j, 1) - 0.5) * 18;
  big.style.transform = `translateX(${(hash2(j, 2) - 0.5) * 12}px) skewX(${(hash2(j, 3) - 0.5) * 8}deg)`;
  big.style.textShadow = `${dx}px 0 #ff2a6d, ${-dx}px 0 #19f0ff, 0 0 30px #000`;
  big.style.color = '#000';
  const hdr = 1 - 0.85 * smooth(E.flash_start, E.flash_start + 0.4, t) * (1 - smooth(E.flash_end, E.flash_end + 0.5, t));
  $('tag').style.opacity = 0.85 * hdr; $('title').style.opacity = hdr;
  const [c0, c1] = E.cta;
  $('cta').style.opacity = smooth(c0, c0 + 0.3, t); $('cta').textContent = '▶ PART 2 — follow so you don\'t miss it';
}

window.renderAt = t => { update(t); engine.render(scene, camera); hud(t); };
window.EP = EP; window.__dbg = { engine, scene, camera, moonH, FOOT, hero };
window.renderAt(0);
window.READY = true;
