// Hollow hive (Ep 12-15): ribbed bone corridors with pulsing red veins, a pod chamber, the hive's exterior spire,
// and helpers to make a second human (Mira) from the hero rig.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SET, tag, hash2 } from './ascii.js';
import { makeHero } from './character.js';

const PI = Math.PI;
export const boneMat = () => new THREE.MeshStandardMaterial({ color: 0x5a4a50, roughness: 0.5, metalness: 0.4, flatShading: true });
export const veinMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.12, 0.18), fog: true });

// corridor along a polyline (points at floor level). ribs every `step` m, width w, height h.
export function makeCorridor(points, { step = 1.6, w = 3.2, h = 3.6, bone = boneMat(), vein = veinMat() } = {}) {
  const ribs = [], veins = [], floor = [];
  const curve = new THREE.CatmullRomCurve3(points), L = curve.getLength(), n = Math.floor(L / step);
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), tg = curve.getTangentAt(u), yaw = Math.atan2(tg.x, tg.z);
    const r = new THREE.TorusGeometry(w * 0.55, 0.16 + hash2(i, 1) * 0.08, 5, 14, PI); r.scale(1, h / (w * 0.55), 1);
    r.rotateY(yaw); r.translate(p.x, p.y, p.z); ribs.push(r.toNonIndexed());
    if (i % 2 === 0) { const v = new THREE.TorusGeometry(w * 0.5, 0.03, 3, 18, PI * 0.9); v.scale(1, h / (w * 0.55), 1); v.rotateZ(PI * 0.05); v.rotateY(yaw); v.translate(p.x, p.y, p.z); veins.push(v.toNonIndexed()); }
    const f = new THREE.BoxGeometry(w * 1.2, 0.2, step * 1.05); f.rotateY(yaw); f.translate(p.x, p.y - 0.1, p.z); floor.push(f.toNonIndexed());
    // outer skin: dark plates between ribs

  }
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x241a20, roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
  const ribMesh = new THREE.Mesh(mergeGeometries(ribs), bone); ribMesh.castShadow = true; g.add(tag(ribMesh, SET.METAL));
  g.add(tag(new THREE.Mesh(mergeGeometries(veins), vein), SET.ENERGY));
  g.add(tag(new THREE.Mesh(mergeGeometries(floor), skinMat), SET.ROCK));
  return { g, curve, L, vein };
}

// round chamber with walls of glowing cocoon pods (captured creatures)
export function makePodChamber({ R = 14, h = 16, rows = 6, cols = 26, bone = boneMat() } = {}) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.8, R + 0.8, h, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x1e1418, roughness: 0.9, side: THREE.BackSide, flatShading: true }));
  wall.position.y = h / 2; g.add(tag(wall, SET.ROCK));
  const floorM = new THREE.Mesh(new THREE.CircleGeometry(R + 0.8, 40), new THREE.MeshStandardMaterial({ color: 0x2a1c22, roughness: 0.85 })); floorM.rotation.x = -PI / 2; g.add(tag(floorM, SET.ROCK));
  const podGeo = new THREE.CapsuleGeometry(0.45, 0.9, 4, 8), coreGeo = new THREE.SphereGeometry(0.25, 8, 6);
  const N = rows * cols, pods = new THREE.InstancedMesh(podGeo, new THREE.MeshStandardMaterial({ color: 0x6a3a44, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.85, emissive: 0x2a0810 }), N);
  const cores = new THREE.InstancedMesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  let k = 0;
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
    const a = (i + (r % 2) * 0.5) / cols * PI * 2, y = 1.6 + r * (h - 3) / rows;
    p.set(Math.sin(a) * R, y, Math.cos(a) * R); e.set(0.2, a, 0); q.setFromEuler(e); pods.setMatrixAt(k, m4.compose(p, q, s));
    cores.setMatrixAt(k, m4.compose(p, q, s.clone().setScalar(0.7 + hash2(k, 1) * 0.6)));
    const hue = hash2(k, 2); c.setRGB(...(hue < 0.4 ? [0.3, 1.4, 1.6] : hue < 0.7 ? [1.4, 0.5, 1.6] : [1.6, 1.2, 0.4])).multiplyScalar(0.6 + hash2(k, 3) * 0.8); cores.setColorAt(k, c);
    k++;
  }
  g.add(tag(pods, SET.METAL), tag(cores, SET.ENERGY));
  for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, rib = new THREE.Mesh(new THREE.TorusGeometry(R * 0.98, 0.25, 5, 40, PI * 0.5), bone); rib.position.y = h * 0.92; rib.rotation.set(PI / 2, 0, a); g.add(tag(rib, SET.METAL)); }
  return { g, pods, cores };
}

// exterior: a huge ribbed spire with red lights
export function makeHiveSpire(scale = 1, bone = boneMat()) {
  const g = new THREE.Group(), parts = [];
  for (let i = 0; i < 22; i++) {
    const y = i * 6 * scale, r = (30 - i * 1.2) * scale;
    const t = new THREE.TorusGeometry(r, 1.4 * scale, 5, 28); t.rotateX(PI / 2); t.translate(0, y, 0); parts.push(t.toNonIndexed());
  }
  for (let k = 0; k < 14; k++) { const a = k / 14 * PI * 2, c = new THREE.CylinderGeometry(1.1 * scale, 1.8 * scale, 140 * scale, 5); c.translate(0, 70 * scale, 0); c.rotateZ(0.18); c.rotateY(a); c.translate(Math.sin(a) * 26 * scale, 0, Math.cos(a) * 26 * scale); parts.push(c.toNonIndexed()); }
  const m = new THREE.Mesh(mergeGeometries(parts), bone); m.castShadow = true; g.add(tag(m, SET.METAL));
  const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(1.2 * scale, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.2, 0.25), fog: false }), 60);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) { const a = hash2(i, 1) * PI * 2, y = hash2(i, 2) * 120 * scale, r = (30 - y / (6 * scale) * 1.2) * scale + 1.5 * scale; lights.setMatrixAt(i, m4.makeTranslation(Math.sin(a) * r, y, Math.cos(a) * r)); }
  g.add(tag(lights, SET.ENERGY));
  const maw = new THREE.Mesh(new THREE.CircleGeometry(6 * scale, 20), new THREE.MeshBasicMaterial({ color: 0x080406 })); maw.position.set(0, 4 * scale, 30.5 * scale); g.add(tag(maw, SET.ROCK));
  return { g, lights };
}

// a second human from the hero rig: recolour the suit, add a ponytail; badge/patch colours
export function makeMira() {
  const m = makeHero();
  m.root.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.color) return;
    const c = o.material.color.getHex();
    if (c === 0xd9d6cf) { o.material = o.material.clone(); o.material.color.set(0xb89a72); }        // faded orange-tan fabric (old suit)
    else if (c === 0xf2efe8) { o.material = o.material.clone(); o.material.color.set(0x8a7a6a); }   // scuffed armour
    else if (c === 0xc08055) { o.material = o.material.clone(); o.material.color.set(0x9a6a4a); }   // skin
    else if (c === 0xff7a1a) { o.material = o.material.clone(); o.material.color.set(0x2a6aa8); o.material.emissive.set(0x000000); }  // blue mission bands
  });
  const hair = m.head.children.find(o => o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x1a1412);
  const pony = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 6), hair ? hair.material : new THREE.MeshStandardMaterial({ color: 0x1a1412 }));
  pony.position.set(0, -0.02, -0.11); pony.rotation.x = 0.5; m.head.add(tag(pony, SET.SUIT));
  // her helmet lamp is red (she uses it to see the Hollow's red light without being seen)
  m.headLight.color.set(0xff6a5a);
  // a red Hollow eye growing in her suit's chest (revealed in Ep 13)
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.15, 0.2) }));
  eye.position.set(-0.07, 0.36, 0.16); m.torso.add(tag(eye, SET.ENERGY)); eye.visible = false;
  m.hollowEye = eye;
  return m;
}

// ---------------------------------------------------------------------------
// Mira's hideout (Ep 13-15): a hollow pocket in the hive wall, a wall of tally marks (one per day),
// the hatch of her capsule, her red lamp (a dead Hollow eye in a jar), a bedroll.
// ---------------------------------------------------------------------------
function canvasTexH(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function tallyTexture({ w = 2048, h = 768, cell = 30, seed = 0 } = {}) {
  return canvasTexH(w, h, (g) => {
    g.fillStyle = '#2a2024'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${hash2(i, 1) > 0.5 ? '60,48,52' : '20,14,16'},0.5)`; g.fillRect(hash2(i, 2) * w, hash2(i, 3) * h, 4 + hash2(i, 4) * 40, 2 + hash2(i, 5) * 20); }
    g.lineCap = 'round';
    const gw = cell * 2.4, gh = cell * 1.9;
    let k = 0;
    for (let y = 20; y < h - gh; y += gh) for (let x = 16; x < w - gw; x += gw) {
      k++; const jx = (hash2(k, seed + 1) - 0.5) * 6, jy = (hash2(k, seed + 2) - 0.5) * 6;
      g.strokeStyle = `rgba(232,214,200,${0.65 + hash2(k, 3) * 0.35})`; g.lineWidth = 3 + hash2(k, 4) * 1.5;
      for (let s = 0; s < 4; s++) { const sx = x + jx + s * cell * 0.42; g.beginPath(); g.moveTo(sx, y + jy); g.lineTo(sx + (hash2(k, s) - 0.5) * 4, y + jy + cell * 1.4); g.stroke(); }
      g.beginPath(); g.moveTo(x + jx - 4, y + jy + cell * 1.2); g.lineTo(x + jx + cell * 1.6, y + jy + cell * 0.2); g.stroke();
    }
  });
}
export function makeHatch() {
  const tex = canvasTexH(512, 512, (g, w, h) => {
    g.fillStyle = '#c8c2b6'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, PI * 2); g.fill();
    g.fillStyle = '#2a6aa8'; g.fillRect(0, h * 0.62, w, h * 0.08);
    g.fillStyle = '#1a1a22'; g.font = 'bold 74px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText('KESTREL-4', w / 2, h * 0.42);
    g.font = 'bold 54px "JetBrains Mono", monospace'; g.fillText('1996', w / 2, h * 0.86);
    for (let i = 0; i < 160; i++) { g.strokeStyle = 'rgba(40,30,30,0.45)'; g.lineWidth = 1 + hash2(i, 9) * 2; const x = hash2(i, 1) * w, y = hash2(i, 2) * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash2(i, 3) - 0.5) * 60, y + (hash2(i, 4) - 0.5) * 30); g.stroke(); }
  });
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.2 })); face.position.z = 0.061; g.add(tag(face, SET.METAL));
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.12, 32), new THREE.MeshStandardMaterial({ color: 0x8a8a90, metalness: 0.6, roughness: 0.4 })); rim.rotation.x = PI / 2; g.add(tag(rim, SET.METAL));
  return g;
}
export function makeHideout({ R = 7, ry = 0.62 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(R, 3), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = hash2(Math.round(v.x * 7), Math.round(v.y * 7 + v.z * 13)) - 0.5; v.multiplyScalar(1 + n * 0.08); p.setXYZ(i, v.x, v.y * ry, v.z); }
  geo.computeVertexNormals();
  const shell = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x3a2a30, roughness: 0.9, flatShading: true, side: THREE.BackSide })); g.add(tag(shell, SET.ROCK));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 32), new THREE.MeshStandardMaterial({ color: 0x2a1e22, roughness: 1 })); floor.rotation.x = -PI / 2; floor.position.y = 0.01; g.add(tag(floor, SET.ROCK));
  // tally wall (curved strip following the back of the shell)
  const tw = new THREE.CylinderGeometry(R - 1.6, R - 1.6, 2.9, 40, 1, true, PI - 0.75, 1.5);
  const tally = new THREE.Mesh(tw, new THREE.MeshStandardMaterial({ map: tallyTexture(), roughness: 0.9, side: THREE.BackSide })); tally.position.y = 1.55; g.add(tag(tally, SET.ROCK));
  // ribs of the hive showing through
  const bone = boneMat();
  for (let i = 0; i < 7; i++) { const a = (i / 7) * PI * 2 + 0.3, r = new THREE.Mesh(new THREE.TorusGeometry(R * 0.96, 0.14, 5, 20, PI * 0.5), bone); r.rotation.set(0, a, PI / 2); r.scale.set(1, ry, 1); r.position.y = 0.0; g.add(tag(r, SET.METAL)); }
  // camp: hatch leaning on the wall, bedroll, lamp (dead Hollow eye in a jar)
  const hatch = makeHatch(); hatch.position.set(3.6, 0.72, -3.4); hatch.rotation.set(-0.15, -0.75, 0); g.add(hatch);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 2.0), new THREE.MeshStandardMaterial({ color: 0x5a6a7a, roughness: 1 })); bed.position.set(-3.4, 0.06, 1.2); bed.rotation.y = 0.4; g.add(tag(bed, SET.SUIT));
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.6, metalness: 0.3 })); crate.position.set(2.2, 0.25, -1.4); crate.rotation.y = 0.3; g.add(tag(crate, SET.METAL));
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 10), new THREE.MeshStandardMaterial({ color: 0x8a9aa0, transparent: true, opacity: 0.45, roughness: 0.1 })); jar.position.set(2.0, 0.62, -1.3); g.add(tag(jar, SET.METAL));
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.2, 0.2), fog: false })); ember.position.copy(jar.position); g.add(tag(ember, SET.ENERGY));
  const lamp = new THREE.PointLight(0xff4a40, 10, 12, 1.4); lamp.position.copy(jar.position).add(new THREE.Vector3(0, 0.15, 0)); g.add(lamp);
  // scattered pod shells and scraps
  for (let i = 0; i < 9; i++) { const a = hash2(i, 1) * PI * 2, r = 3.5 + hash2(i, 2) * 2.4, s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + hash2(i, 3) * 0.2, 0), new THREE.MeshStandardMaterial({ color: 0x5a3a44, roughness: 0.6, flatShading: true })); s.position.set(Math.sin(a) * r, 0.1, Math.cos(a) * r); s.rotation.set(a, a * 2, 0); g.add(tag(s, SET.ROCK)); }
  return { g, tally, hatch, lamp, ember, crate };
}
