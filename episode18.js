// Episode 18 — "The Fall of Luna". The Moon is a Hollow nest; its pieces fall toward Earth. On the hive core the
// Hollow are dragging out the Vaelor ship from Ep 1. ECHO hides Dev, walks him to the panel... and when he says no,
// it takes his hand anyway. The ship wakes, every eye turns, the core breaks apart. ECHO: "NOW I HAVE A BODY."
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, faceTo, lerpAng,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeHollowArmy } from './engine/hollow.js';
import { makeCapsule, makeEarth, makeMoon, makeHollowShip, makeVaelorShip, makeAsteroids } from './engine/space.js';

const EP = await loadEpisode('18');
const { engine, scene, camera, world } = makeStage({ fog: [0x1a0a12, 40, 260] });
const wp = o => o.getWorldPosition(new THREE.Vector3());

// =====================================================================
// SPACE: Earth, the broken Moon, falling fragments, raiders, the risen ship
// =====================================================================
const space = new THREE.Group(); world.add(space);
const earth = makeEarth({ r: 60, lightDir: [0.7, 0.25, 0.8] }); earth.g.rotation.y = 1.3; space.add(earth.g);
const MOONP = v3(170, 24, -60);
const moon = makeMoon({ r: 16, seed: 7 }); moon.g.position.copy(MOONP); space.add(moon.g); moon.eye.position.set(0, 0, 16 * 0.44);
const sSun = new THREE.DirectionalLight(0xfff0e0, 2.6); sSun.position.set(700, 250, 800); space.add(sSun, sSun.target, new THREE.AmbientLight(0x303848, 0.6));
const sRed = new THREE.PointLight(0xff3040, 40, 300, 1.2); sRed.position.copy(MOONP); space.add(sRed);
const ship = makeCapsule(); space.add(ship.g);
const RAID = [...Array(12)].map((_, i) => { const r = makeHollowShip(0.35); space.add(r.g); return { r, a: hash2(i, 1) * PI * 2, rr: 26 + hash2(i, 2) * 22, y: (hash2(i, 3) - 0.5) * 14, w: 0.15 + hash2(i, 4) * 0.2 }; });
const NF = 46, FR = [...Array(NF)].map((_, i) => { const a = hash2(i, 1) * PI * 2, b = (hash2(i, 2) - 0.5) * 1.2;
  return { from: MOONP.clone().add(v3(Math.cos(a) * 40, b * 20, Math.sin(a) * 40)), to: v3(Math.cos(b * 2 + 0.6) * 60, (hash2(i, 3) - 0.4) * 70, Math.sin(b * 2 + 0.6) * 60).setLength(59), t0: 4 + hash2(i, 4) * 10, dur: 7 + hash2(i, 5) * 5, s: 0.8 + hash2(i, 6) * 2.5 }; });
const frags = makePool(NF, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x8a8894, roughness: 1, flatShading: true }), SET.ROCK); space.add(frags.mesh);
const fire = makePool(NF * 8, new THREE.IcosahedronGeometry(1, 0), glow(2.4, 1.0, 0.35), SET.ENERGY); space.add(fire.mesh);
const vship = makeVaelorShip(0.5); space.add(vship.g);

// =====================================================================
// SURFACE of the hive core: bone ground, spikes, the half-buried Vaelor ship, the Hollow dragging it
// =====================================================================
const SURF = v3(0, 0, -20000);
const surf = new THREE.Group(); surf.position.copy(SURF); world.add(surf);
const H = (x, z) => (fbm(x * 0.06 + 3, z * 0.06) - 0.5) * 1.6 + (fbm(x * 0.01, z * 0.01 + 5) - 0.5) * 10 * smooth(30, 120, Math.hypot(x, z + 20));
const ca = new THREE.Color(0x2a1a22), cb = new THREE.Color(0x4a3038);
surf.add(makeTerrain({ H, size: 500, seg: 180, col: (x, z, c) => c.copy(ca).lerp(cb, fbm(x * 0.2, z * 0.2)), set: SET.ROCK }));
const bone = new THREE.MeshStandardMaterial({ color: 0x5a464c, roughness: 0.5, metalness: 0.4, flatShading: true });
for (let i = 0; i < 70; i++) { const a = hash2(i, 1) * PI * 2, r = 12 + hash2(i, 2) * 90, x = Math.cos(a) * r, z = Math.sin(a) * r - 20, h = 3 + hash2(i, 3) ** 2 * 26;
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.3 + h * 0.06, h, 5), bone); c.position.set(x, H(x, z) + h / 2 - 0.5, z); c.rotation.set((hash2(i, 4) - 0.5) * 0.5, 0, (hash2(i, 5) - 0.5) * 0.5); surf.add(tag(c, SET.METAL)); }
const cracks = []; for (let i = 0; i < 14; i++) { const a = hash2(i, 7) * PI * 2, r = 6 + hash2(i, 8) * 30, m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 4 + hash2(i, 9) * 8), glow(2.4, 0.2, 0.25)); const x = Math.cos(a) * r, z = Math.sin(a) * r - 22; m.position.set(x, H(x, z) + 0.03, z); m.rotation.y = a; m.visible = false; surf.add(tag(m, SET.ENERGY)); cracks.push(m); }
const WR = v3(0, 2.6, -27);
const wreck = makeVaelorShip(0.5); wreck.g.position.copy(WR); wreck.g.rotation.set(0.12, PI / 2, 0.18); surf.add(wreck.g);
const PANEL = v3(-0.3, 1.45, -20.55);
const panelM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.4, 1.6) });
const panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.06), panelM); panel.position.copy(PANEL); surf.add(tag(panel, SET.ENERGY));
const hand = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), glow(1.6, 2.0, 2.2)); hand.position.copy(PANEL).add(v3(0, 0.05, 0.035)); surf.add(tag(hand, SET.ENERGY));
const CABLES = [...Array(10)].map((_, i) => { const a = (i / 10 - 0.5) * 2.6, gx = Math.sin(a) * 22, gz = -27 + Math.cos(a) * 18 * (i % 2 ? 1 : -1);
  const from = v3(gx, H(gx, gz), gz), to = WR.clone().add(v3((hash2(i, 1) - 0.5) * 14, 1 + hash2(i, 2) * 3, (hash2(i, 3) - 0.5) * 4)), d = to.clone().sub(from);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, d.length(), 5), bone); m.position.copy(from).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(v3(0, 1, 0), d.clone().normalize()); surf.add(tag(m, SET.METAL)); return { from, to, m }; });
const NS = 50, army = makeHollowArmy(NS); surf.add(army.group);
const SOLD = [...Array(NS)].map((_, i) => { const c = CABLES[i % 10], u = 0.15 + hash2(i, 1) * 0.5; const p = c.from.clone().lerp(c.to, u * 0.4); return { x: p.x + (hash2(i, 2) - 0.5) * 2, z: p.z + (hash2(i, 3) - 0.5) * 2, ry: faceTo(P2(p.x, p.z), P2(c.to.x, c.to.z)), ph: hash2(i, 4) * 6, onHull: i % 5 === 0 }; });
const sky = new THREE.Group(); surf.add(sky);
const earth2 = makeEarth({ r: 60, lightDir: [0.7, 0.25, 0.8], seed: 3 }); earth2.g.position.set(-60, 150, -380); sky.add(earth2.g);
const deb = makeAsteroids({ n: 160, spread: [500, 60, 400], size: [1, 9], seed: 4, color: 0x8a8894 }); deb.mesh.position.set(0, 110, -150); sky.add(deb.mesh);
const earthL = new THREE.DirectionalLight(0x9ab8ff, 1.6); earthL.position.set(-60, 150, -380); earthL.target.position.set(0, 0, -20);
earthL.castShadow = true; earthL.shadow.mapSize.set(1024, 1024); Object.assign(earthL.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 800 });
surf.add(earthL, earthL.target, new THREE.HemisphereLight(0x6a5a8a, 0x2a0a10, 1.1));
const wreckL = new THREE.PointLight(0x66e8ff, 0, 30, 1.3); wreckL.position.copy(PANEL).add(v3(0, 1, 1)); surf.add(wreckL);
const redL = new THREE.PointLight(0xff3040, 8, 60, 1.2); redL.position.set(0, 6, -10); surf.add(redL);
const dust = makePool(500, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x5a464c, roughness: 1, flatShading: true }), SET.ROCK); surf.add(dust.mesh);
const cap2 = makeCapsule(); surf.add(cap2.g); cap2.g.position.set(13, H(13, 9) + 2.6, 9); cap2.g.rotation.set(-PI / 2, 0, 0);

// =====================================================================
// HERO + PIXEL
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 6;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const T_LAND = 15.0, T_WALK = 22.0, T_PANEL = 40.0, T_TOUCH = 64.0, T_RISE = 72.0, T_SPACE = 86.0;
const START = v3(4.2, 0, 2.6), STAND = v3(-0.3, 0, -19.75);
function devState(t) {
  const S = { loc: 'S', p: v3(), rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0, jet: 0 };
  if (t < T_WALK - 0.4) { S.p = v3(START.x, H(START.x, START.z), START.z); S.rotY = PI - 0.3; S.lookUp = 0.3 + 0.2 * Math.sin(t * 0.4); return S; }
  if (t < T_PANEL) {
    const k = Q(T_WALK - 0.4, T_PANEL - 0.6, t), x = lerp(START.x, STAND.x, k) + 1.6 * Math.sin(k * PI), z = lerp(START.z, STAND.z, k);
    S.p = v3(x, H(x, z), z); S.rotY = faceTo(P2(START.x, START.z), P2(STAND.x, STAND.z)) + 0.2 * Math.cos(k * PI);
    S.walk = 0.8 * Q(T_WALK - 0.4, T_WALK, t) * (1 - Q(T_PANEL - 1, T_PANEL - 0.6, t)); S.phase = k * 23 / 0.45 * PI; S.crouch = 0.35 * S.walk;
    S.headYaw = 0.7 * Math.sin((t - 22) * 0.7); S.lookUp = 0.2 * Math.sin(t * 0.5);
    return S;
  }
  S.p = v3(STAND.x, H(STAND.x, STAND.z), STAND.z); S.rotY = PI;
  S.lookUp = 0.1;
  const reach1 = Q(42, 44, t) * (1 - Q(53.4, 55, t));                     // lifts his hand... stops
  S.armRo = { x: -1.25, z: -0.1, ex: -0.3, w: reach1 * 0.85 };
  if (t > 45 && t < 49) S.headYaw = 0.25;
  if (t > 55 && t < 60) { S.lookUp = -0.25; S.headYaw = -0.2; }
  if (t > 59.2) {                                                         // ECHO forces his arm onto the panel
    const k = Q(59.4, T_TOUCH, t), shake = 0.08 * Math.sin(t * 37) * (1 - Q(T_TOUCH, T_TOUCH + 1, t));
    S.armRo = { x: -1.3 + shake, z: -0.12, ex: -0.12, w: k }; S.armLo = { x: -0.6 - shake, z: 0.4, ex: -1.2, w: Q(59.4, 61, t) };
    S.lean = 0.1 * k - 0.12 * Q(59.4, 61, t) * (1 - k); S.crouch = 0.1; S.headYaw = 0.3 * Math.sin(t * 9) * (1 - k);
  }
  if (t > 66) { S.headYaw = -0.9 * Q(66.2, 67.2, t); S.lookUp = 0.1; }
  if (t > T_RISE) { const k = Q(T_RISE, 80, t); S.p.y += 9 * k * k; S.p.z += 0.0; S.headYaw = -0.4; S.lookUp = -0.3 * k; S.armLo = { x: 0.3, z: 0.6, ex: -0.3, w: 1 }; }
  return S;
}
const FOOT = footsteps(devState, T_PANEL);
window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false })) };
const look = new THREE.Vector3();
const VISOR = [[22.0, 28.0, 'CLOAK  ▸ ECHO\nCONTACTS  50'], [59.4, 64.0, 'SUIT CONTROL  ▸ ECHO\nOVERRIDE  ▸ ✕ DENIED']];
const hud = makeHud(EP, { visor: VISOR });

function capState(t) {                                                    // space: capsule dives through the ring to the core
  const k = Q(0, T_LAND, t), a = v3(-10, 30, 220), b = MOONP.clone().add(v3(0, 6, 22));
  return a.lerp(b, 1 - (1 - k) ** 1.6);
}
function update(t) {
  const S = devState(t);
  const set = t < 8.2 ? 'SP' : t < 14.6 ? 'SP2' : t < T_SPACE ? 'SU' : 'SP';
  space.visible = set !== 'SU'; surf.visible = set === 'SU';
  if (set === 'SU') { scene.fog.color.set(0x1a0a12); scene.fog.near = 40; scene.fog.far = 420; } else { scene.fog.near = 1e5; scene.fog.far = 2e5; }
  // ---- space ----
  earth.U.uT.value = t; earth.U.uRed.value = 0.15 * Q(86, 100, t);
  const broken = t < T_SPACE ? 1 : 1 + 1.6 * Q(T_SPACE, 100, t);
  moon.set(t, broken); moon.core.visible = t < T_SPACE + 3; moon.core.scale.setScalar(t < T_SPACE ? 1 : Math.max(0.01, 1 - Q(T_SPACE, T_SPACE + 3, t)));
  const cp = capState(t); ship.g.position.copy(cp); ship.g.lookAt(MOONP); ship.set(t, 1); ship.g.visible = t < T_LAND;
  moon.core.lookAt(cp);
  RAID.forEach((R, i) => { const a = R.a + t * R.w, rr = R.rr * (t > T_SPACE ? 1 + Q(T_SPACE, 100, t) : 1), p = MOONP.clone().add(v3(Math.cos(a) * rr, R.y, Math.sin(a) * rr)); R.r.g.position.copy(p); R.r.g.lookAt(MOONP.clone().add(v3(Math.cos(a + 0.2) * rr, R.y, Math.sin(a + 0.2) * rr))); });
  const FA = [], FI = [];
  FR.forEach((f, i) => { const tt = t > T_SPACE ? t - 72 : t; const k = (tt - f.t0) / f.dur; if (k < 0 || k > 1) return; const p = f.from.clone().lerp(f.to, k * k); FA.push({ x: p.x, y: p.y, z: p.z, s: f.s, rx: t * 0.3 + i, ry: i });
    const d = p.length(), hot = d < 95 ? 1 : 0.35, back = f.from.clone().sub(f.to).normalize(); for (let j = 0; j < 8; j++) { const q = p.clone().addScaledVector(back, j * f.s * (1.2 + 2 * hot)); FI.push({ x: q.x, y: q.y, z: q.z, s: f.s * (1.1 - j * 0.12) * hot }); } });
  frags.set(FA); fire.set(FI);
  vship.g.visible = t > T_SPACE; if (vship.g.visible) { const k = Q(T_SPACE, 100, t); vship.g.position.copy(MOONP).lerp(v3(60, 18, 90), k * 0.6); vship.g.lookAt(v3(0, 0, 0)); vship.bandMat.color.setRGB(2.2, 0.2, 0.3); }
  // ---- surface ----
  earth2.U.uT.value = t; deb.set(t * 0.3);
  const wake = Q(T_TOUCH, T_TOUCH + 1.5, t), alert = Q(66, 67, t), rise = Q(T_RISE, 84, t);
  wreck.bandMat.color.setRGB(...[0.2, 1.4, 1.6].map((c, i) => lerp(c * (0.25 + 1.8 * wake), [2.2, 0.2, 0.3][i], Q(68, 72, t))));
  wreck.flame.visible = t > T_RISE;
  wreck.g.position.copy(WR).add(v3(0, 22 * rise * rise + 0.06 * Math.sin(t * 30) * Q(70, 72, t), 0)); wreck.g.rotation.set(0.12 * (1 - rise), PI / 2, 0.18 * (1 - rise));
  panel.position.copy(PANEL).add(v3(0, 22 * rise * rise, 0)); hand.position.copy(panel.position).add(v3(0, 0.05, 0.035));
  panelM.color.setRGB(...(t > 68 ? [2.2, 0.2, 0.3] : [0.3, 1.4, 1.6])).multiplyScalar(0.6 + 0.8 * Q(40, 42, t) + 1.2 * wake);
  hand.visible = t > 40 && t < 64;
  wreckL.position.copy(panel.position).add(v3(0, 1, 1.2)); wreckL.intensity = 4 * Q(40, 42, t) + 40 * wake; wreckL.color.set(t > 68 ? 0xff3040 : 0x66e8ff);
  CABLES.forEach(c => c.m.visible = t < T_RISE + 2);
  cracks.forEach((c, i) => c.visible = t > T_RISE + i * 0.5);
  redL.intensity = 8 + 30 * Q(70, 80, t) * (0.6 + 0.4 * Math.sin(t * 9));
  if (set === 'SU') {
    const L = SOLD.map((s, i) => {
      const y = H(s.x, s.z);
      const toDev = faceTo(P2(s.x, s.z), P2(STAND.x, STAND.z));
      const fly = Q(T_RISE + 1 + hash2(i, 7) * 3, T_RISE + 6, t);
      return { on: !(s.onHull) || true, x: s.x, y: y + fly * 6 * hash2(i, 8), z: s.z, rotY: lerpAng(s.ry, toDev, alert), rx: fly * 1.2, scale: 1, eye: 0.4 + 0.6 * alert,
        pose: { crawl: 0.4 * (1 - alert), walk: alert > 0 ? Math.min(1, alert * 2) * (t < T_RISE ? 1 : 0) : 0.25, phase: t * (alert > 0 ? 9 : 2) + s.ph, t, reach: (1 - alert) * (0.7 + 0.3 * Math.sin(t * 2 + i)), lookUp: alert * 0.3, twitch: 1 } };
    });
    // charge after the alert (toward him), then thrown when the ship rips free
    L.forEach((l, i) => { if (t > 66.5) { const k = Q(66.5, T_RISE, t), s = SOLD[i]; const p = P2(s.x, s.z), d = P2(STAND.x - p.x, STAND.z - p.z), L2 = Math.hypot(d.x, d.z) || 1, go = Math.min(k * 9, Math.max(0, L2 - 3)); l.x = p.x + d.x / L2 * go; l.z = p.z + d.z / L2 * go; l.y = H(l.x, l.z) + (l.y - H(s.x, s.z)); } });
    army.set(L);
    const D = []; if (t > 70) for (let k = 0; k < 320; k++) { const u = ((t - 70) * 0.5 + hash2(k, 1)) % 1, a = hash2(k, 2) * PI * 2, r = 4 + hash2(k, 3) * 24;
      const x = WR.x + Math.cos(a) * r, z = WR.z + Math.sin(a) * r * 0.6; D.push({ x, y: H(x, z) + u * (4 + 12 * hash2(k, 4)) * Q(70, 76, t), z, s: (0.1 + 0.3 * hash2(k, 5)) * (1 - u) }); }
    dust.set(D);
  }
  // ---- hero ----
  poseHero(hero, S, t);
  hero.root.position.copy(S.p).add(SURF); hero.root.rotation.set(0, S.rotY, 0);
  hero.root.visible = set === 'SU' && t > T_WALK - 2.5; hero.handGun.visible = false; hero.gun.visible = true;
  hero.cyanMat.color.setRGB(...(t > 59.2 ? [2.2, 0.25, 0.3] : [0.35, 1.6, 1.8])).multiplyScalar(t > 59.2 && t < 64 ? 1 + 0.6 * Math.sin(t * 20) : 1);
  hero.root.updateMatrixWorld(true);
  const head = wp(hero.head);
  { const s2 = wp(hero.shoulderL); pixel.g.visible = hero.root.visible; pixel.g.position.copy(s2).add(v3(0, 0.03, 0)); pixel.g.rotation.set(t > 60 && t < 64 ? 0.5 : 0, S.rotY + 0.3 + (t > 60 && t < 64 ? 0.8 : 0), 0); pixel.g.scale.setScalar(0.5);
    poseSkitterling(pixel, { curl: t > 22 && t < 40 ? 0.9 : 0.3, eyeOpen: 1, look: t > 60 && t < 64 ? 0.8 : Math.sin(t) * 0.4, t }); }
  // ---- cameras ----
  let pos = v3(), fov = 56;
  const sv = v3(SURF.x, SURF.y, SURF.z), fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY)), hp = hero.root.position;
  if (t < 4.2) { pos = cp.clone().add(v3(-4, 3, 14)); look.copy(cp).lerp(MOONP, 0.4); fov = 58; }
  else if (t < 8.2) { pos = cp.clone().add(v3(5, -2, -8)); look.copy(cp).add(v3(0, 0, 30)); fov = 62; }
  else if (t < 14.6) { const k = Q(8.2, 14.6, t); pos = v3(120 - 20 * k, 40, 190); look.set(40, 10, 0); fov = 54; }
  else if (t < T_WALK - 2.5) { const k = Q(14.6, 19.5, t); pos = sv.clone().add(v3(14 - 4 * k, 3.5 + 2 * k, 14)); look.copy(sv).add(v3(0, 4 + 2 * k, -26)); fov = 60; }
  else if (t < 23.8) { pos = hp.clone().addScaledVector(fwd, 2.8).addScaledVector(right, 0.6).add(v3(0, 1.5, 0)); look.copy(hp).add(v3(0, 1.3, 0)); fov = 54; }
  else if (t < 28.0) { pos = hp.clone().addScaledVector(fwd, -2.6).addScaledVector(right, 1.0).add(v3(0, 1.7, 0)); look.copy(hp).addScaledVector(fwd, 10).add(v3(0, 1, 0)); fov = 60; }
  else if (t < 32.0) { const k = Q(28, 32, t); pos = sv.clone().add(v3(-16 + 6 * k, 9, -8)); look.copy(hp).lerp(sv.clone().add(WR), 0.5); fov = 60; }
  else if (t < 36.0) { const s = SOLD[3]; pos = sv.clone().add(v3(s.x + 1.8, H(s.x, s.z) + 1.2, s.z + 2.2)); look.copy(hp).add(v3(0, 1, 0)); fov = 56; }
  else if (t < T_PANEL) { pos = hp.clone().add(v3(1.6, 1.5, 3.4)); look.copy(hp).add(v3(0, 1.2, -4)); fov = 58; }
  else if (t < 44.8) { pos = hp.clone().add(v3(-1.4, 1.6, 1.8)); look.copy(panel.position).add(SURF).lerp(head, 0.4); fov = 52; }
  else if (t < 48.6) { pos = head.clone().add(v3(0.45, 0.05, -0.8)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 52.2) { pos = hp.clone().add(v3(1.8, 1.9, 1.4)); look.copy(panel.position).add(SURF).lerp(head, 0.3); fov = 50; }
  else if (t < 59.0) { pos = head.clone().add(v3(0.5, 0.08, -0.78)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 62.6) { pos = hp.clone().add(v3(1.0, 1.3, 1.6)); look.copy(hp).add(v3(-0.1, 1.3, -0.6)); fov = 52; }
  else if (t < 66.0) { pos = hp.clone().add(v3(1.7, 1.6, 0.9)); look.copy(panel.position).add(SURF); fov = 46; }
  else if (t < 70.0) { pos = hp.clone().add(v3(1.3, 1.8, -0.3)); look.copy(sv).add(v3(2, 1.0, -9)); fov = 64; }
  else if (t < 78.0) { const k = Q(70, 78, t); pos = sv.clone().add(v3(26, 4 + 6 * k, 18)); look.copy(wreck.g.position).add(SURF).add(v3(0, -2, 0)); fov = 62; }
  else if (t < T_SPACE) { const k = Q(78, T_SPACE, t); pos = sv.clone().add(v3(-30, 18, 30)).add(v3(Math.sin(t * 31) * 0.5 * (1 - k), Math.sin(t * 27) * 0.5, 0)); look.copy(wreck.g.position).add(SURF); fov = 64; }
  else if (t < 93) { pos = vship.g.position.clone().add(v3(-28, 10, 46)); look.copy(vship.g.position).lerp(MOONP, 0.2); fov = 58; }
  else { pos = v3(-20, 40, 260); look.set(20, 0, 0); fov = 54; }
  aim(camera, pos, look, set === 'SU' ? ((x, z) => H(x - SURF.x, z - SURF.z)) : null, fov);
  postFx(engine, EP, t, { exposure: set === 'SU' ? 2.8 : 2.4, glitch: (t > 59.2 && t < 63.8 ? 0.25 : 0) + (t > 87.8 && t < 88.4 ? 0.3 : 0),
    flashes: [[13.8, 0.3, 3], [T_TOUCH, 0.6, 2], [78.0, 0.4, 3], [80.6, 0.8, 2]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { hero, devState } });
