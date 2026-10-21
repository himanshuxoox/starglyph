// Ep 5 "World of Glass" pieces: glass spire clusters, the living crystal giant, the glass storm,
// glowing cracks that spread under footsteps.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SET, tag, hash2 } from './ascii.js';

const PI = Math.PI;

// hex prism with a pointed tip, y in [0, h]
function prism(r, h, tip = 0.25) {
  const g = new THREE.CylinderGeometry(r * 0.85, r, h * (1 - tip), 6, 1); g.translate(0, h * (1 - tip) / 2, 0);
  const c = new THREE.ConeGeometry(r * 0.85, h * tip, 6); c.translate(0, h * (1 - tip) + h * tip / 2, 0);
  return mergeGeometries([g.toNonIndexed(), c.toNonIndexed()]);
}

export const glassMat = (color = 0xbfe8ff, emissive = 0x2a6a9a, o = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.08, metalness: 0.65, emissive, emissiveIntensity: 0.5, flatShading: true, ...o });

// cluster of prisms fanning out from a point; merged into one geometry
export function crystalClusterGeo(seed, size = 1) {
  const parts = [];
  const n = 4 + Math.floor(hash2(seed, 1) * 6);
  for (let i = 0; i < n; i++) {
    const h = size * (0.5 + hash2(seed, i + 2) * 1.0) * (i === 0 ? 1.6 : 1), r = h * (0.09 + hash2(seed, i + 9) * 0.06);
    const g = prism(r, h);
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((hash2(seed, i + 20) - 0.5) * (i === 0 ? 0.3 : 1.1), hash2(seed, i + 30) * PI * 2, (hash2(seed, i + 40) - 0.5) * (i === 0 ? 0.3 : 1.1)));
    g.applyMatrix4(m); parts.push(g);
  }
  return mergeGeometries(parts);
}

// field of big glass spires (merged per material for few draw calls)
export function makeSpireField({ n = 80, rMin = 25, rMax = 400, heightFn, avoid = () => false, center = [0, 0], hMin = 6, hMax = 60, mat }) {
  const geos = [];
  for (let i = 0; i < n; i++) {
    const a = hash2(i, 101) * PI * 2, d = rMin + hash2(i, 102) ** 0.8 * (rMax - rMin);
    const x = center[0] + Math.cos(a) * d, z = center[1] + Math.sin(a) * d; if (avoid(x, z)) continue;
    const s = hMin + hash2(i, 103) ** 1.5 * (hMax - hMin) * (0.5 + d / rMax);
    const g = crystalClusterGeo(i + 7, s); g.translate(x, heightFn(x, z) - 0.3, z); geos.push(g);
  }
  const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = true; m.receiveShadow = true;
  return tag(m, SET.METAL);
}

// ---------------------------------------------------------------------------
// Living crystal giant: a crouched colossus of glass prisms. Rig: root > hips > spine > chest > head,
// shoulders > upper > fore > hand, hips > thigh > shin. core = the key socket in its chest.
// ---------------------------------------------------------------------------
export function makeCrystalGiant(scale = 1) {
  const S = scale;
  const body = glassMat(0xb0b8ff, 0x2a3a8a, { emissiveIntensity: 0.25 });
  const dark = glassMat(0x5a6a9a, 0x101a3a, { emissiveIntensity: 0.2 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.6, 2.8), fog: false });
  const add = (parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; parent.add(m); return m; };
  const blob = (seed, size) => crystalClusterGeo(seed, size);
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 4.2 * S; root.add(hips);
  add(hips, new THREE.DodecahedronGeometry(1.4 * S, 0), dark, 0, 0, 0);
  const spine = new THREE.Group(); spine.position.y = 0.8 * S; hips.add(spine);
  add(spine, new THREE.CylinderGeometry(0.9 * S, 1.2 * S, 2.4 * S, 6), dark, 0, 1.2 * S, 0);
  const chest = new THREE.Group(); chest.position.y = 2.4 * S; spine.add(chest);
  add(chest, new THREE.DodecahedronGeometry(2.2 * S, 0), body, 0, 0.8 * S, 0).scale.set(1.3, 1, 0.9);
  for (let i = 0; i < 9; i++) {                                           // crystal growths on the back & shoulders
    const a = (i / 9) * PI - PI / 2, m = add(chest, blob(200 + i, 1.6 * S), body, Math.sin(a) * 1.9 * S, 1.6 * S + Math.cos(a) * 0.4 * S, -1.2 * S);
    m.rotation.set(-0.6, a, Math.sin(a) * 0.5);
  }
  const core = new THREE.Group(); core.position.set(0, 0.9 * S, 1.75 * S); chest.add(core);       // key socket (glows through)
  const coreGlow = add(core, new THREE.IcosahedronGeometry(0.65 * S, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.8, 2.4), fog: false }));
  const neck = new THREE.Group(); neck.position.y = 2.4 * S; chest.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.8 * S, 0.4 * S); neck.add(head);
  add(head, new THREE.OctahedronGeometry(1.2 * S, 0), body, 0, 0, 0).scale.set(1, 1.15, 0.9);
  add(head, blob(300, 1.6 * S), body, 0, 0.6 * S, -0.3 * S, -0.5, 0, 0);
  const eyes = [-1, 1].map(s => add(head, new THREE.BoxGeometry(0.42 * S, 0.1 * S, 0.1 * S), eyeMat, s * 0.42 * S, 0.1 * S, 1.0 * S, 0, -s * 0.25, s * 0.15));
  const arm = s => {
    const sh = new THREE.Group(); sh.position.set(s * 2.7 * S, 1.6 * S, 0); chest.add(sh);
    add(sh, new THREE.DodecahedronGeometry(1.0 * S, 0), body);
    add(sh, new THREE.CylinderGeometry(0.55 * S, 0.7 * S, 3.6 * S, 6), dark, 0, -1.8 * S, 0);
    const el = new THREE.Group(); el.position.y = -3.6 * S; sh.add(el);
    add(el, new THREE.DodecahedronGeometry(0.75 * S, 0), body);
    add(el, new THREE.CylinderGeometry(0.75 * S, 0.5 * S, 3.4 * S, 6), body, 0, -1.7 * S, 0);
    const hand = new THREE.Group(); hand.position.y = -3.5 * S; el.add(hand);
    add(hand, new THREE.DodecahedronGeometry(0.9 * S, 0), dark);
    for (let k = 0; k < 4; k++) add(hand, prism(0.18 * S, 1.5 * S), body, (k - 1.5) * 0.38 * S, -0.4 * S, 0.3 * S, PI + 0.2, 0, (k - 1.5) * 0.15);
    return { sh, el, hand };
  };
  const leg = s => {
    const hip = new THREE.Group(); hip.position.set(s * 1.0 * S, -0.3 * S, 0); hips.add(hip);
    add(hip, new THREE.CylinderGeometry(0.8 * S, 0.65 * S, 3.6 * S, 6), dark, 0, -1.8 * S, 0);
    const knee = new THREE.Group(); knee.position.y = -3.6 * S; hip.add(knee);
    add(knee, new THREE.DodecahedronGeometry(0.85 * S, 0), body);
    add(knee, new THREE.CylinderGeometry(0.65 * S, 0.9 * S, 3.4 * S, 6), body, 0, -1.7 * S, 0);
    add(knee, new THREE.BoxGeometry(1.6 * S, 0.6 * S, 2.2 * S), dark, 0, -3.5 * S, 0.4 * S);
    return { hip, knee };
  };
  const g = { root, hips, spine, chest, neck, head, core, coreGlow, eyes, armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1), body, dark, eyeMat, S };
  tag(root, SET.METAL);
  root.traverse(o => { if (o.isMesh && (o.material === eyeMat || o === coreGlow)) o.userData.set = SET.ENERGY; });
  return g;
}

// rise 0 = curled asleep (sitting, head down, arms wrapped), 1 = standing tall. reach: right arm grabs forward-down
export function poseCrystalGiant(g, { rise = 0, t = 0, reach = 0, look = 0, breathe = 1 } = {}) {
  const S = g.S, r = rise, b = Math.sin(t * 0.8) * 0.02 * breathe;
  g.hips.position.y = (1.6 + 2.6 * r) * S;
  g.legL.hip.rotation.set(-1.45 * (1 - r) - 0.1 * r, 0, 0.25 * (1 - r)); g.legR.hip.rotation.set(-1.45 * (1 - r) - 0.1 * r, 0, -0.25 * (1 - r));
  g.legL.knee.rotation.x = 2.2 * (1 - r) + 0.15 * r; g.legR.knee.rotation.x = 2.2 * (1 - r) + 0.15 * r;
  g.spine.rotation.x = 0.95 * (1 - r) + 0.12 * r + b; g.chest.rotation.x = 0.35 * (1 - r) + b;
  g.neck.rotation.set(0.7 * (1 - r) - 0.25 * r, look, 0);
  // asleep: arms wrapped around the knees; awake: arms out, menacing
  g.armL.sh.rotation.set(-1.2 * (1 - r) - 0.3 * r, 0, 0.5 * (1 - r) + 0.35 * r); g.armL.el.rotation.x = -1.3 * (1 - r) - 0.5 * r;
  g.armR.sh.rotation.set(-1.2 * (1 - r) - 0.3 * r - 1.1 * reach, 0, -0.5 * (1 - r) - 0.35 * r + 0.2 * reach); g.armR.el.rotation.x = -1.3 * (1 - r) - 0.5 * r + 0.3 * reach;
}

// ---------------------------------------------------------------------------
// Glass storm: instanced shards blown by the wind. front(t) = distance the storm front has travelled.
// ---------------------------------------------------------------------------
export function makeShardStorm(n = 3000) {
  const geo = new THREE.TetrahedronGeometry(1, 0); geo.scale(0.25, 1, 0.06);
  const mat = new THREE.MeshStandardMaterial({ color: 0xe8f6ff, roughness: 0.05, metalness: 0.8, emissive: 0x8ad0ff, emissiveIntensity: 1.6 });
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; tag(im, SET.METAL);
  const P = [...Array(n)].map((_, i) => ({ u: hash2(i, 1), v: hash2(i, 2), h: hash2(i, 3), s: 0.03 + hash2(i, 4) ** 3 * 0.25, sp: 0.7 + hash2(i, 5) * 0.6, ph: hash2(i, 6) * 6.28 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  // origin: point the storm comes from, dir: unit wind direction (xz), width/height of the band, around: focus point
  function set(t, { origin, dir, frontSpeed = 14, width = 80, height = 18, focus, radius = 40, strength = 1, t0 = 0 }) {
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const front = Math.max(0, t - t0) * frontSpeed;
    for (let i = 0; i < n; i++) {
      const s = P[i];
      // each shard loops along the wind inside a box around the focus point, but only behind the front
      const along = ((s.u * 2 * radius + (t - t0) * 30 * s.sp) % (2 * radius)) - radius;
      const lat = (s.v - 0.5) * width, y = s.h ** 1.6 * height + Math.sin(t * 3 + s.ph) * 0.5;
      p.set(focus.x, focus.y + y, focus.z).addScaledVector(dir, along).addScaledVector(side, lat);
      const dFront = (p.clone().sub(origin)).dot(dir);
      const on = strength > 0 && dFront < front ? strength : 0;
      e.set(t * 7 * s.sp + s.ph, t * 5 + s.ph, s.ph); q.setFromEuler(e); sc.setScalar(on ? s.s : 1e-4);
      im.setMatrixAt(i, m4.compose(p, q, sc));
    }
    im.instanceMatrix.needsUpdate = true;
  }
  return { im, set, mat };
}

// glowing crack decal (radial fracture lines) for footsteps on glass
export function crackTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
  g.clearRect(0, 0, 256, 256); g.strokeStyle = '#fff'; g.lineCap = 'round';
  for (let k = 0; k < 9; k++) {
    let x = 128, y = 128, a = k / 9 * PI * 2 + hash2(k, 1) * 0.4; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 6; s++) { a += (hash2(k, s + 3) - 0.5) * 0.8; x += Math.cos(a) * 18; y += Math.sin(a) * 18; g.lineTo(x, y); }
    g.stroke();
  }
  g.lineWidth = 2; for (const r of [30, 60]) { g.beginPath(); g.arc(128, 128, r, 0, PI * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); return t;
}
