// Ep 2 creatures, modelled from the concept sheets:
// skitterling (big-eyed glow beetle), bellflower pod, lumen-moth swarm, driftback (sky leviathan), crystals.
import * as THREE from 'three';
import { SET, tag, hash2 } from './ascii.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...o });
const basic = (r, g, b, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false, ...o });
function add(parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m;
}

// ---------------------------------------------------------------------------
// Skitterling: palm-sized six-legged beetle, glowing shell stripes, huge eyes
// ---------------------------------------------------------------------------
const SK = {
  shell: std(0x5a44b8, { roughness: 0.3, metalness: 0.2, flatShading: true, emissive: 0x1a1050, emissiveIntensity: 0.6 }),
  belly: std(0x1c1838, { roughness: 0.7 }),
  face: std(0x8c5c86, { roughness: 0.5 }),
  eye: std(0x04050b, { roughness: 0.05, metalness: 0.6 }),
  leg: std(0x2a2350, { roughness: 0.5 }),
  shine: basic(2.2, 2.4, 2.6),
};
export function makeSkitterling(seed = 0) {
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = 0.1; g.add(body);
  const stripe = basic(0.8, 0.6, 2.4);             // per-critter so it can change colour
  const rim = basic(0.3, 0.6, 1.6);
  add(body, new THREE.SphereGeometry(0.12, 20, 14), SK.shell, 0, 0.03, -0.03, 1, 0.78, 1.3);   // shell
  add(body, new THREE.SphereGeometry(0.11, 16, 10), SK.belly, 0, -0.015, -0.02, 0.95, 0.5, 1.2);
  for (const a of [-0.55, 0, 0.55]) {                // glowing stripes over the shell
    const arc = add(body, new THREE.TorusGeometry(0.122, 0.011, 4, 24, Math.PI), stripe, 0, 0.03, -0.03, 1, 0.8, 1.32);
    arc.rotation.set(0, Math.PI / 2, 0); arc.rotateX(a);
  }
  for (let i = 0; i < 4; i++) {                      // dorsal ridge spikes
    const c = add(body, new THREE.ConeGeometry(0.018, 0.06, 5), SK.shell, 0, 0.12 - i * 0.008, 0.06 - i * 0.06);
    c.rotation.x = -0.6;
  }
  const head = new THREE.Group(); head.position.set(0, 0.0, 0.12); body.add(head);
  add(head, new THREE.SphereGeometry(0.075, 16, 12), SK.face, 0, 0, 0.0, 1.15, 0.9, 0.85);
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(sx * 0.047, 0.028, 0.05); head.add(e);
    add(e, new THREE.SphereGeometry(0.045, 16, 12), SK.eye, 0, 0, 0);
    const r = add(e, new THREE.TorusGeometry(0.045, 0.006, 6, 20), rim, 0, 0, 0.004); r.rotation.y = sx * 0.35;
    add(e, new THREE.SphereGeometry(0.011, 8, 6), SK.shine, -sx * 0.012, 0.018, 0.038);
    eyes.push(e);
  }
  const ants = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(sx * 0.025, 0.06, 0.03); head.add(a);
    add(a, new THREE.CylinderGeometry(0.0035, 0.0035, 0.13, 4), SK.leg, 0, 0.065, 0);
    add(a, new THREE.SphereGeometry(0.012, 6, 5), stripe, 0, 0.135, 0);
    a.rotation.set(-0.5, 0, -sx * 0.45); ants.push(a);
  }
  const legs = [];
  [[1, 0.07], [1, 0.0], [1, -0.08], [-1, 0.07], [-1, 0.0], [-1, -0.08]].forEach(([sx, z], i) => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.085, -0.02, z); body.add(hip);
    const upper = new THREE.Group(); hip.add(upper); upper.rotation.z = -sx * 0.95;
    add(upper, new THREE.CylinderGeometry(0.008, 0.007, 0.085, 5), SK.leg, 0, 0.042, 0);
    const knee = new THREE.Group(); knee.position.y = 0.085; upper.add(knee); knee.rotation.z = -sx * 1.75;
    add(knee, new THREE.CylinderGeometry(0.007, 0.004, 0.11, 5), SK.leg, 0, 0.055, 0);
    legs.push({ hip, upper, knee, sx, group: i % 2 === (sx > 0 ? 0 : 1) ? 0 : 1 });
  });
  tag(g, SET.SUIT);
  g.traverse(o => { if (o.isMesh && (o.material === stripe || o.material === rim || o.material === SK.shine)) o.userData.set = SET.ENERGY; });
  return { g, body, head, eyes, ants, legs, stripe, rim, seed };
}
// walk 0..1 (gait), phase radians, eyeOpen 0..1, curl 0..1 (tucked/hiding), look: head yaw
export function poseSkitterling(c, { walk = 0, phase = 0, eyeOpen = 1, curl = 0, look = 0, t = 0 } = {}) {
  for (const L of c.legs) {
    const ph = phase + (L.group ? Math.PI : 0);
    const lift = Math.max(0, Math.sin(ph)) * walk;
    L.hip.rotation.y = Math.cos(ph) * 0.45 * walk * L.sx;
    L.upper.rotation.z = -L.sx * (0.95 + lift * 0.35 - curl * 0.6);
    L.knee.rotation.z = -L.sx * (1.75 + curl * 0.7);
  }
  c.body.position.y = 0.1 + Math.abs(Math.sin(phase)) * 0.01 * walk - curl * 0.07;
  c.body.rotation.z = Math.sin(phase) * 0.06 * walk;
  for (const e of c.eyes) e.scale.set(1, Math.max(0.08, eyeOpen), 1);
  c.head.rotation.y = look;
  c.ants.forEach((a, i) => { a.rotation.z = (i ? 0.45 : -0.45) + Math.sin(t * 3 + i) * 0.15; });
}

// ---------------------------------------------------------------------------
// Bellflower pod: curved stem + translucent bell bulb with a glowing core
// ---------------------------------------------------------------------------
export function makePod(h = 2.0, seed = 0) {
  const g = new THREE.Group();
  const stemMat = std(0x2a1f4a, { roughness: 0.7 });
  const lean = (hash2(seed, 3) - 0.5) * 0.5;
  const curve = new THREE.CatmullRomCurve3([v(0, 0, 0), v(lean * 0.3, h * 0.45, 0.08), v(lean, h * 0.8, -0.05), v(lean * 0.8, h, 0)]);
  add(g, new THREE.TubeGeometry(curve, 16, 0.045, 6), stemMat);
  for (let i = 0; i < 3; i++) {                               // leaves at the base
    const l = add(g, new THREE.ConeGeometry(0.09, 0.7, 4), std(0x1b5c66, { flatShading: true }), 0, 0.3, 0, 1, 1, 0.25);
    l.rotation.set(0.7, i * 2.1, 0);
  }
  const bulb = new THREE.Group(); bulb.position.copy(curve.getPoint(1)); g.add(bulb);
  const prof = [[0.04, -0.05], [0.2, 0.0], [0.36, 0.14], [0.42, 0.32], [0.38, 0.5], [0.26, 0.64], [0.2, 0.7], [0.27, 0.78], [0.18, 0.76]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xb06cff, emissive: 0x6a1a9a, emissiveIntensity: 0.6, roughness: 0.25,
    transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  add(bulb, new THREE.LatheGeometry(prof, 18), shellMat);
  const coreMat = basic(1.6, 0.4, 1.4);
  const core = add(bulb, new THREE.SphereGeometry(0.17, 14, 10), coreMat, 0, 0.3, 0, 1, 1.3, 1);
  for (let i = 0; i < 5; i++) {                               // frilly petals at the mouth
    const p = add(bulb, new THREE.ConeGeometry(0.06, 0.22, 4), shellMat, Math.cos(i * 1.256) * 0.22, 0.82, Math.sin(i * 1.256) * 0.22);
    p.rotation.set(Math.sin(i * 1.256) * 0.7, 0, -Math.cos(i * 1.256) * 0.7);
  }
  tag(g, SET.GRASS); core.userData.set = SET.ENERGY;
  bulb.traverse(o => { if (o.isMesh && o !== core) o.userData.set = SET.PLANET; });
  return { g, bulb, core, coreMat, shellMat, h, mouth: v(0, 0.85, 0) };
}

// ---------------------------------------------------------------------------
// Lumen-moth swarm (instanced): body + two wing pairs that flap
// ---------------------------------------------------------------------------
export function makeMothSwarm(n) {
  const wingTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const x = cv.getContext('2d');
    const gr = x.createRadialGradient(40, 32, 2, 34, 32, 34);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(140,170,255,0.9)'); gr.addColorStop(1, 'rgba(60,40,200,0)');
    x.fillStyle = gr; x.beginPath(); x.ellipse(32, 32, 31, 22, 0, 0, Math.PI * 2); x.fill();
    return new THREE.CanvasTexture(cv);
  })();
  const wingGeo = new THREE.PlaneGeometry(0.11, 0.08); wingGeo.translate(0.055, 0, 0); wingGeo.rotateX(-Math.PI / 2);
  const wingMat = new THREE.MeshBasicMaterial({ map: wingTex, color: new THREE.Color(0.7, 0.9, 2.2), transparent: true, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const bodyMat = basic(1.0, 0.8, 1.8);
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.012, 0.04, 3, 6).rotateX(Math.PI / 2), bodyMat, n);
  const wl = new THREE.InstancedMesh(wingGeo, wingMat, n), wr = new THREE.InstancedMesh(wingGeo, wingMat, n);
  for (const m of [body, wl, wr]) { m.frustumCulled = false; tag(m, SET.ENERGY); }
  const grp = new THREE.Group(); grp.add(body, wl, wr);
  const M = new THREE.Matrix4(), W = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    g: grp,
    // list: [{x,y,z,yaw,flap,s}]
    set(list) {
      list.forEach((o, i) => {
        p.set(o.x, o.y, o.z); q.setFromEuler(e.set(0, o.yaw, 0)); s.setScalar(o.s); M.compose(p, q, s);
        body.setMatrixAt(i, M);
        W.makeRotationZ(o.flap); wl.setMatrixAt(i, M.clone().multiply(W));
        W.makeRotationZ(Math.PI - o.flap); wr.setMatrixAt(i, M.clone().multiply(W));
      });
      for (const m of [body, wl, wr]) { m.count = list.length; m.instanceMatrix.needsUpdate = true; }
    },
  };
}

// ---------------------------------------------------------------------------
// Driftback: ~40 m floating manta-whale with glowing belly spots and tendrils
// ---------------------------------------------------------------------------
export function makeDriftback() {
  const g = new THREE.Group();
  const skin = std(0x2a3a8a, { roughness: 0.4, metalness: 0.2, emissive: 0x1a2a8a, emissiveIntensity: 0.9 });
  const finMat = new THREE.MeshStandardMaterial({ color: 0x8a6af8, emissive: 0x6a3ae0, emissiveIntensity: 1.5, roughness: 0.3,
    transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false });
  const dot = basic(0.4, 1.4, 2.0);
  add(g, new THREE.SphereGeometry(1, 28, 18), skin, 0, 0, 0, 3.2, 2.2, 13);                  // body, faces +z
  add(g, new THREE.SphereGeometry(1, 20, 12), skin, 0, -0.3, 10, 2.6, 1.8, 3.4);             // head
  const fins = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 4); sh.quadraticCurveTo(9, 3, 15, -3); sh.quadraticCurveTo(10, -1.5, 8, -5); sh.quadraticCurveTo(4, -2, 0, -6); sh.lineTo(0, 4);
    const geo = new THREE.ShapeGeometry(sh, 12); geo.rotateX(-Math.PI / 2);
    const pivot = new THREE.Group(); pivot.position.set(sx * 2.4, 0, 1); g.add(pivot);
    const fin = add(pivot, geo, finMat); fin.scale.set(sx, 1, 1);
    fins.push({ pivot, sx });
  }
  for (let i = 0; i < 22; i++) for (const sx of [-0.9, 0.9]) {                                // belly lights
    const z = 9 - i * 0.9; add(g, new THREE.SphereGeometry(0.22, 6, 5), dot, sx * Math.sqrt(Math.max(0.05, 1 - (z / 13) ** 2)) * 1.6, -1.9, z);
  }
  const tendrils = [];
  for (let k = 0; k < 7; k++) {                                                               // trailing tendrils
    const root = new THREE.Group(); root.position.set((k - 3) * 0.5, -0.8, -11); g.add(root);
    const segs = []; let parent = root;
    for (let j = 0; j < 7; j++) {
      const sgrp = new THREE.Group(); sgrp.position.z = j ? -2.4 : 0; parent.add(sgrp);
      add(sgrp, new THREE.CylinderGeometry(0.09 - j * 0.01, 0.1 - j * 0.01, 2.4, 5).rotateX(Math.PI / 2).translate(0, 0, -1.2), finMat);
      segs.push(sgrp); parent = sgrp;
    }
    add(parent, new THREE.SphereGeometry(0.35, 8, 6), dot, 0, 0, -2.4);
    tendrils.push(segs);
  }
  tag(g, SET.PLANET);
  g.traverse(o => { if (o.isMesh && o.material === dot) o.userData.set = SET.ENERGY; });
  return { g, fins, tendrils, dotMat: dot };
}
export function poseDriftback(d, t, seed = 0) {
  for (const f of d.fins) f.pivot.rotation.z = f.sx * Math.sin(t * 0.9 + seed) * 0.28;
  d.tendrils.forEach((segs, k) => segs.forEach((s, j) => {
    s.rotation.x = Math.sin(t * 1.3 - j * 0.6 + k) * 0.12; s.rotation.y = Math.sin(t * 0.9 - j * 0.5 + k * 1.7) * 0.14;
  }));
  d.g.rotation.z = Math.sin(t * 0.45 + seed) * 0.05;
}

// ---------------------------------------------------------------------------
// Crystal cluster that lights up + rings when touched
// ---------------------------------------------------------------------------
export function makeCrystal(h = 1.8, seed = 0) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x6fb2ff, emissive: 0x1a4aa0, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.2,
    transparent: true, opacity: 0.85, flatShading: true });
  const n = 3 + Math.floor(hash2(seed, 1) * 3);
  for (let i = 0; i < n; i++) {
    const hh = h * (0.45 + hash2(seed, i + 4) * 0.55) * (i ? 0.8 : 1);
    const c = add(g, new THREE.OctahedronGeometry(1, 0), mat, (hash2(seed, i + 9) - 0.5) * 0.35, hh * 0.45, (hash2(seed, i + 13) - 0.5) * 0.3,
      0.11 + hash2(seed, i) * 0.05, hh * 0.55, 0.11);
    c.rotation.set((hash2(seed, i + 17) - 0.5) * 0.5, hash2(seed, i + 19) * 3, (hash2(seed, i + 23) - 0.5) * 0.5);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 4, 48), basic(0.4, 1.6, 2.0, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  tag(g, SET.METAL); tag(ring, SET.ENERGY, true);
  return { g, mat, ring };
}

function v(x, y, z) { return new THREE.Vector3(x, y, z); }
