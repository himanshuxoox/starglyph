// Episode 16 — "Keys". Through the gate, back to the Coil lake where it began. Down in the temple Dev sets the
// four keys; the gate needs sixty seconds; the Hollow are already here. Pixel calls, the Coil answers
// (skitterlings + driftbacks), the gate rises out of the lake bed and Dev jumps through. ECHO: "...MY NEW HOME."
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, faceTo, lerpAng,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makeGrass, makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling, makeDriftback, poseDriftback } from './engine/creatures.js';
import { makeHollowArmy } from './engine/hollow.js';
import { makeNightSky, makeArmada } from './engine/sky.js';
import { glyphMaterial, makePillar, makeVaelorStatue, makeGalaxy, makeHall, makeKey, makeGate, KEY_COLORS } from './engine/props.js';
import { makeCapsule } from './engine/space.js';

const EP = await loadEpisode('16');
const { engine, scene, camera, world } = makeStage({ fog: [0x30297a, 70, 700] });
const wp = o => o.getWorldPosition(new THREE.Vector3());

// =====================================================================
// OUTSIDE: the Ep 3/4 lake, already drained (bed + lift), night sky, armada
// =====================================================================
const C = P2(0, -16), LAKE_R = 11, HP = P2(6, 18);
function H(x, z) {
  const base = (fbm(x * 0.05 + 7, z * 0.05) - 0.5) * 1.0;
  const dl = Math.hypot(x - C.x, z - C.z) / LAKE_R;
  const lake = dl < 1.5 ? -1.4 * (1 - smooth(0.7, 1.22, dl)) : 0;
  const dh = Math.hypot(x - HP.x, z - HP.z);
  const hill = 8.5 * Math.exp(-((dh / 10) ** 2)) + 1.5 * Math.exp(-((dh / 22) ** 2));
  const far = Math.hypot(x, (z + 20) * 0.8);
  return base + lake + hill + (fbm(x * 0.008 + 3, z * 0.008) - 0.5) * 60 * smooth(75, 260, far);
}
const BED_Y = H(C.x, C.z) + 0.05;
const GY = (x, z) => Math.hypot(x - C.x, z - C.z) < 9.5 ? Math.max(H(x, z), BED_Y) : H(x, z);
const outside = new THREE.Group(); world.add(outside);
const sky = makeNightSky({ planetDir: [-0.5, 0.36, -1], spires: { heightFn: H, center: [0, -20], rMin: 210, rMax: 720, count: 120, hMin: 40, hMax: 230 } });
outside.add(sky.group);
const armada = makeArmada({ n: 240, dir: [-0.12, 0.42, -1], dist: 1700, spread: [2400, 700] }); outside.add(armada.g);
const a0 = new THREE.Color(0x0e2a44), b0 = new THREE.Color(0x24164e);
outside.add(makeTerrain({ H, col: (x, z, c) => c.copy(a0).lerp(b0, smooth(0.35, 0.65, fbm(x * 0.03 + 9, z * 0.03))) }));
const grass = makeGrass({ area: [-26, 26, -40, 26], density: 10, heightFn: H, colA: 0x167f96, colB: 0x5a2ec8, tall: 0.6, tipFrac: 0.14,
  mask: (x, z) => Math.hypot(x - C.x, z - C.z) > LAKE_R * 1.05 });
grass.mesh.userData.noId = true; outside.add(grass.mesh);
const bedMat = new THREE.MeshStandardMaterial({ color: 0x1a1e30, roughness: 0.8, emissive: 0x5ae0ff, emissiveIntensity: 0.0 });
const bed = new THREE.Mesh(new THREE.CircleGeometry(9.5, 64), bedMat); bed.rotation.x = -PI / 2; bed.position.set(C.x, BED_Y, C.z); bed.receiveShadow = true; outside.add(tag(bed, SET.ROCK));
for (const r of [3.2, 5.6, 8.2]) { const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.08, 64), glow(0.2, 0.9, 1.1)); ring.rotation.x = -PI / 2; ring.position.set(C.x, BED_Y + 0.02, C.z); outside.add(tag(ring, SET.ENERGY)); }
const stone = new THREE.MeshStandardMaterial({ color: 0x4a4866, roughness: 0.75, metalness: 0.15, flatShading: true });
const lift = new THREE.Group(); outside.add(lift);
lift.add(tag(new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.5, 24), stone), SET.METAL));
const liftRing = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.05, 6, 48), glow(0.4, 1.6, 2.0)); liftRing.rotation.x = PI / 2; liftRing.position.y = 0.26; lift.add(tag(liftRing, SET.ENERGY));
const moonL = new THREE.DirectionalLight(0xb4c2ff, 2.6); moonL.castShadow = true; moonL.shadow.mapSize.set(1024, 1024);
Object.assign(moonL.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 260 }); moonL.position.set(-40, 60, -30); moonL.target.position.set(0, 0, -12);
const rimL = new THREE.DirectionalLight(0xa070ff, 1.5); rimL.position.set(30, 20, 40);
outside.add(moonL, moonL.target, rimL, rimL.target, new THREE.HemisphereLight(0x5a66ff, 0x160c2a, 0.95));
const muzzleLight = new THREE.PointLight(0x9ff6ff, 0, 18, 1.8); outside.add(muzzleLight);
const gateLight = new THREE.PointLight(0x66e8ff, 0, 40, 1.4); outside.add(gateLight);
// the sky gate he arrives through, and the capsule
const SKYGATE = v3(-30, 64, -150);
const skyGate = makeGate(16, stone, [0.4, 1.6, 2.2]); skyGate.g.position.copy(SKYGATE); skyGate.g.lookAt(0, 0, 0); outside.add(skyGate.g);
const ship = makeCapsule(); outside.add(ship.g);
const CAP = v3(4.2, H(4.2, -2.4) + 2.6, -2.4);
// the lake gate (rises from the bed behind the lift)
const G = v3(C.x, 0, C.z - 5.6), GATE_R = 6;
const gate = makeGate(GATE_R, stone, [0.18, 0.75, 1.05]); gate.g.position.set(G.x, BED_Y - 8, G.z); outside.add(gate.g);
// army, the Coil's creatures
const NS = 70, army = makeHollowArmy(NS); outside.add(army.group);
const SOLD = [...Array(NS)].map((_, i) => {
  const a = (i / NS) * PI * 2 * 0.72 - PI * 0.36 + (hash2(i, 1) - 0.5) * 0.12;          // mostly in front of him (+z side)
  return { a, r0: 15 + hash2(i, 2) * 14, t0: 43.6 + hash2(i, 3) * 6, v: 0.7 + hash2(i, 4) * 0.5, die: 999, by: '', ph: hash2(i, 5) * 9 };
});
const SHOTS = []; for (let k = 0; k < 30; k++) SHOTS.push(+(49.2 + k * 0.42 + (k > 14 ? 1.6 : 0) + hash2(k, 7) * 0.1).toFixed(3));
const sAt = (s, t) => { const k = Math.max(0, t - s.t0 - 1.2), r = Math.max(6.5, s.r0 - s.v * k); return P2(C.x + Math.sin(s.a) * r, C.z + Math.cos(s.a) * r); };
// who dies how: shots pick front soldiers; skitterlings and driftbacks take the rest; the gate shock ends it
const order = SOLD.map((s, i) => i).sort((a, b) => SOLD[a].r0 - SOLD[b].r0);
const shotTarget = SHOTS.map((sh, k) => { const i = order.find(j => SOLD[j].die > 900 && sh > SOLD[j].t0 + 1.4); if (i !== undefined && k % 2 === 1) { SOLD[i].die = sh + 0.05; SOLD[i].by = 'shot'; } return i ?? order[0]; });
const NK = 22, SK = [...Array(NK)].map((_, j) => makeSkitterling(j + 3));
SK.forEach(s => outside.add(s.g));
const SKR = SK.map((s, j) => {
  const i = order.find(q => SOLD[q].die > 900 && hash2(q, 8) < 0.8 && SOLD[q].r0 > 17); const die = 55.2 + j * 0.55 + hash2(j, 2) * 0.4;
  if (i !== undefined) { SOLD[i].die = die; SOLD[i].by = 'sk'; }
  return { i, die, a: SOLD[i ?? 0].a + (hash2(j, 3) - 0.5) * 1.2, from: 34 + hash2(j, 4) * 6 };
});
const DB = [makeDriftback(), makeDriftback()]; DB.forEach(d => { d.g.scale.setScalar(0.7); outside.add(d.g); });
const dbPos = (k, t) => { const u = (t - (55.6 + k * 4.6)) / 7.5, z0 = k ? C.z + 18 : C.z + 26, x = lerp(-60, 60, u) * (k ? -1 : 1); return v3(x, 13 + 3 * Math.sin(u * 3 + k), z0 - 6 * u); };
SOLD.forEach((s, i) => { if (s.die > 900) { for (let k = 0; k < 2; k++) { const tt = 55.6 + k * 4.6 + 7.5 * ((sAt(s, 58).x * (k ? -1 : 1) + 60) / 120); if (tt > s.t0 + 2 && tt < 69 && hash2(i, 9 + k) < 0.45 && s.die > 900) { s.die = tt; s.by = 'db'; } } } });
SOLD.forEach((s, i) => { if (s.die > 900) { s.die = 74.0 + Math.hypot(sAt(s, 74).x - G.x, sAt(s, 74).z - G.z) * 0.02; s.by = 'shock'; } });
const embers = makePool(700, new THREE.IcosahedronGeometry(1, 0), glow(0.6, 1.8, 2.2), SET.ENERGY); outside.add(embers.mesh);
const dust = makePool(300, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x6a6680, roughness: 1, flatShading: true }), SET.ROCK); outside.add(dust.mesh);
const tracers = makePool(24, new THREE.BoxGeometry(1, 1, 1), glow(0.6, 2.2, 2.4), SET.ENERGY); outside.add(tracers.mesh);

// =====================================================================
// INSIDE: the temple (its own space far from the lake) - same layout as Ep 4
// =====================================================================
const HALL = v3(2000, 0, 0);
const inside = new THREE.Group(); inside.position.copy(HALL); world.add(inside);
const gm = [0, 1, 2, 3].map(i => glyphMaterial({ color: 0x2e2c48, glow: 0x55e6ff, seed: i + 1, repeat: [1, 1] }));
const hall = makeHall({ R: 18, h: 15, n: 18, stone, glyphMats: gm }); inside.add(hall.g);
const bands = [];
for (let i = 0; i < 12; i++) {
  const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), z = 10 - row * 4.2, x = side * (4.5 + Math.abs(z) * 0.08);
  const bm = glyphMaterial({ color: 0x34324e, glow: 0x55e6ff, seed: 10 + i, repeat: [2, 2] }); bands.push(bm);
  const p = makePillar(13, 0.75, stone, bm); p.g.position.set(x, 0, z); inside.add(p.g);
}
for (let i = 0; i < 4; i++) { const a = PI * 0.25 + i * PI / 2, s = makeVaelorStatue(10, stone); s.position.set(Math.sin(a) * 14.5, 0, Math.cos(a) * 14.5); s.rotation.y = a + PI; inside.add(s); }
for (const [r, y] of [[3.6, 0.25], [2.8, 0.5], [2.1, 0.75]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.1, 0.25, 32), stone); m.position.y = y - 0.125; m.receiveShadow = true; m.castShadow = true; inside.add(tag(m, SET.METAL)); }
const altarH = r => (r < 2.1 ? 0.75 : r < 2.8 ? 0.5 : r < 3.6 ? 0.25 : 0);
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.05, 8), stone); pedestal.position.y = 0.75 + 0.52; pedestal.castShadow = true; inside.add(tag(pedestal, SET.METAL));
const PED_TOP = 0.75 + 1.05;
const T_KEY = [29.6, 32.2, 34.8, 37.4];
const sockets = [0, 1, 2, 3].map(i => {
  const a = i * PI / 2 + PI / 4, m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.04, 10), glow(...KEY_COLORS[i]));
  m.position.set(Math.sin(a) * 0.28, PED_TOP + 0.01, Math.cos(a) * 0.28); inside.add(tag(m, SET.ENERGY)); return { m, a, p: m.position.clone() };
});
const KEYS = [0, 1, 2, 3].map(i => { const k = makeKey(i, 0.42); inside.add(k.g); return k; });
const beams = [0, 1, 2, 3].map(i => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 4.4, 6, 1, true), glow(...KEY_COLORS[i], { transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); b.position.copy(sockets[i].p).add(v3(0, 2.2, 0)); inside.add(tag(b, SET.ENERGY, true)); return b; });
const galaxy = makeGalaxy({ n: 4200, radius: 9 }); galaxy.g.position.y = 6.2; inside.add(galaxy.g);
const earthDot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), glow(0.5, 1.6, 2.6)); galaxy.g.add(tag(earthDot, SET.ENERGY));
const holoLight = new THREE.PointLight(0x66e8ff, 0, 30, 1.2); holoLight.position.set(0, 5, 0); inside.add(holoLight);
const keyLight = new THREE.PointLight(0xffffff, 0, 5, 1.4); keyLight.position.set(0, PED_TOP + 0.4, 0); inside.add(keyLight);
inside.add(new THREE.HemisphereLight(0x6a7ad0, 0x18142c, 1.5));
const inKey = new THREE.SpotLight(0xb4c8ff, 30, 50, 0.5, 0.6, 1.2); inKey.position.set(-6, 14, 8); inKey.target.position.set(0, 0, 0); inKey.castShadow = true; inside.add(inKey, inKey.target);

// =====================================================================
// WORMHOLE (far away): streaks rushing past, a light ahead
// =====================================================================
const WH = v3(-5000, 0, 0);
const worm = new THREE.Group(); worm.position.copy(WH); world.add(worm);
const NSTR = 520, STR = [...Array(NSTR)].map((_, i) => ({ a: hash2(i, 1) * PI * 2, r: 2.4 + hash2(i, 2) * 5, z: hash2(i, 3) * 160, sp: 30 + hash2(i, 4) * 30, l: 1 + hash2(i, 5) * 5 }));
const streaks = makePool(NSTR, new THREE.BoxGeometry(1, 1, 1), glow(0.4, 1.7, 2.3), SET.ENERGY); worm.add(streaks.mesh);
const exitLight = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), glow(1.6, 2.0, 2.6)); exitLight.position.set(0, 0, -120); worm.add(tag(exitLight, SET.ENERGY));
const wl = new THREE.PointLight(0x9fe8ff, 6, 20, 1.2); wl.position.set(0, 2, 3); worm.add(wl, new THREE.HemisphereLight(0x5ad0ff, 0x101830, 1.2));

// =====================================================================
// HERO + PIXEL
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 10;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const T_OUT = 7.0, T_DOWN = 13.0, T_IN = 14.4, T_UP = 42.0, T_JUMP = 83.0, T_WORM = 85.4;
const START = v3(CAP.x - 2.0, 0, CAP.z - 1.0), ENTER = v3(0, 0, 9), ALTAR = v3(0, 0, 0.95);
function devState(t) {
  const S = { loc: 'O', p: v3(), rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0, jet: 0, gun: false };
  if (t < T_DOWN) {
    const k = Q(T_OUT + 0.4, T_DOWN - 0.3, t), a = START, b = v3(C.x, 0, C.z + 0.6);
    const x = lerp(a.x, b.x, k), z = lerp(a.z, b.z, k);
    S.p = v3(x, GY(x, z) + (Math.hypot(x - C.x, z - C.z) < 2.0 ? 0.25 : 0), z); S.rotY = faceTo(P2(a.x, a.z), P2(b.x, b.z));
    S.walk = Q(T_OUT + 0.4, T_OUT + 0.8, t) * (1 - Q(T_DOWN - 0.6, T_DOWN - 0.3, t)); S.phase = k * 13.4 / 0.52 * PI;
    S.lookUp = 0.2 * Math.sin(t * 0.7); S.headYaw = 0.3 * Math.sin(t * 0.5);
    return S;
  }
  if (t < T_IN) { S.p = v3(C.x, BED_Y + 0.25 - 3 * Q(T_DOWN, T_IN, t), C.z + 0.6); S.rotY = 0; S.lookUp = 0.4; return S; }
  if (t < T_UP) {
    S.loc = 'I';
    const k = Q(T_IN + 0.2, 21.2, t), z = lerp(ENTER.z, ALTAR.z, k);
    S.p = v3(0, altarH(Math.abs(z)), z); S.rotY = PI;
    S.walk = Q(T_IN + 0.2, T_IN + 0.6, t) * (1 - Q(20.8, 21.2, t)); S.phase = k * 8 / 0.5 * PI;
    S.lookUp = 0.5 * Q(15, 17, t) * (1 - Q(19.5, 21, t)) + 0.15 * Q(22, 23, t) * (1 - Q(28, 29, t));
    // set each key: reach forward, lower it into its socket
    const kk = T_KEY.findIndex(tk => t > tk - 1.4 && t < tk + 0.9);
    if (kk >= 0) { const tk = T_KEY[kk], r = Q(tk - 1.4, tk - 0.6, t) * (1 - Q(tk + 0.3, tk + 0.9, t)); S.armRo = { x: -0.95 - 0.1 * Math.sin(kk), y: 0, z: -0.15 + 0.1 * (kk - 1.5), ex: -0.45, w: r }; S.lean = 0.14 * r; S.lookUp = -0.45 * r; S.headYaw = 0.15 * (kk - 1.5) * r; }
    if (t > 38.2) { S.lookUp = 0.7 * Q(38.2, 39.6, t); S.headYaw = 0.2 * Math.sin(t * 0.5); }
    return S;
  }
  // back up on the lift, the last stand, the run into the gate
  const up = Q(T_UP, 44.8, t);
  S.p = v3(C.x, BED_Y - 3 + 3.25 * up, C.z + 0.6); S.rotY = 0;
  S.lookUp = 0.3 * Q(43, 44, t) * (1 - Q(46, 47.4, t));
  S.headYaw = 0.6 * Math.sin((t - 44) * 0.9) * Q(44, 45, t) * (1 - Q(47, 48, t));
  if (t > 47.6 && t < 79) {
    S.gun = true;
    const draw = Q(47.6, 48.2, t) * (1 - Q(48.2, 48.8, t)), aimK = Q(48.2, 48.8, t) * (1 - Q(77.8, 78.6, t));
    const sh = SHOTS.find(s => t >= s && t < s + 0.06), kick = sh ? 1 - (t - sh) / 0.06 : 0;
    const k = SHOTS.findIndex(s => s > t), tgt = SOLD[shotTarget[Math.max(0, (k < 0 ? SHOTS.length : k) - 1)]], tp = sAt(tgt, t);
    S.rotY = t < 66 ? faceTo(P2(S.p.x, S.p.z), tp) : lerpAng(faceTo(P2(S.p.x, S.p.z), tp), 0.0, Q(66, 67.5, t));
    S.armRo = draw > 0.01 ? { x: -2.7, z: -0.4, ex: -1.4, w: draw } : { x: -1.5 - 0.12 * kick, y: 0, z: 0.08, ex: -0.3, w: aimK };
    S.armLo = { x: -1.3, z: -0.3, ex: -0.9, w: aimK }; S.lean = 0.05 * aimK - 0.05 * kick; S.crouch = 0.12 * aimK;
    if (t > 70 && t < 77.6) { S.headYaw = -1.2 * Q(70.4, 71.4, t); S.lookUp = 0.3 * Q(72, 74, t); }
  }
  if (t > 78.6) {
    S.rotY = lerpAng(0, PI, Q(78.6, 79.6, t)); S.gun = t < 79.2; S.lookUp = 0.35 * Q(79, 80, t) * (1 - Q(81, 82, t));
    const k = Q(80.0, T_JUMP, t), z = lerp(C.z + 0.6, G.z + 1.6, k);
    S.p.z = z; S.p.y = GY(C.x, z) + (Math.abs(z - C.z) < 2 ? 0.25 : 0); S.run = Q(80, 80.4, t) * (1 - Q(82.6, 83, t)); S.walk = S.run; S.phase = (t - 80) * 9; S.lean = 0.15 * S.run;
    if (t > T_JUMP) { const j = Q(T_JUMP, T_WORM - 0.2, t); S.p.y += 6.4 * Math.sin(j * PI / 2); S.p.z = lerp(G.z + 1.6, G.z - 0.8, j); S.jet = 1; S.run = 0; S.walk = 0; S.crouch = 0.3 * (1 - j); S.armRo = { x: 0.3, z: -0.5, ex: -0.3, w: 1 }; S.armLo = { x: 0.3, z: 0.5, ex: -0.3, w: 1 }; S.lean = 0.3; }
  }
  if (t >= T_WORM) { S.loc = 'W'; S.p = v3(0, 0, 0); S.rotY = PI + 0.4 * Math.sin(t * 0.3); S.jet = 0; S.crouch = 0.2; S.lookUp = 0.2; S.lean = 0; S.armRo = { x: -0.4, z: -0.9, ex: -0.4, w: 1 }; S.armLo = { x: -0.4, z: 0.9, ex: -0.4, w: 1 }; S.headYaw = 0.3 * Math.sin(t * 0.4); }
  return S;
}

const FOOT = footsteps(devState, T_JUMP).filter(f => !(f.t > T_DOWN && f.t < T_IN + 0.2));
window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false, run: f.run })), shots: SHOTS,
  hits: SOLD.filter(s => s.die < 80 && s.by !== 'shock').map(s => +s.die.toFixed(3)).sort((a, b) => a - b),
  rises: SOLD.map(s => +(s.t0 + 0.2).toFixed(3)).filter((x, i) => i % 3 === 0).sort((a, b) => a - b) };
const look = new THREE.Vector3();
const VISOR = [[13.6, 17.4, 'KEYS  4 / 4\n▸ GLASS ▸ OCEAN ▸ ICE ▸ KESTREL'], [44.0, 46.0, 'GATE  ▸ 58\nCONTACTS  ▮▮▮▮▮▮▮▮▮▮']];
for (let s = 46; s < 76; s += 2) VISOR.push([s, s + 2, `GATE  ▸ ${String(Math.max(0, Math.round(60 - (s - 42) * 2))).padStart(2, '0')}\nCONTACTS  ${Math.max(0, NS - SOLD.filter(q => q.die < s).length)}`]);
const hud = makeHud(EP, { visor: VISOR });
const zAxis = new THREE.Vector3(0, 0, 1), qq = new THREE.Quaternion();

function update(t) {
  const S = devState(t), loc = S.loc;
  outside.visible = loc === 'O'; inside.visible = loc === 'I'; worm.visible = loc === 'W';
  if (loc === 'W') { scene.fog.near = 1e4; scene.fog.far = 2e4; } else if (loc === 'I') { scene.fog.color.set(0x14122a); scene.fog.near = 30; scene.fog.far = 90; } else { scene.fog.color.set(0x30297a); scene.fog.near = 70; scene.fog.far = 700; }
  // ---- hero ----
  poseHero(hero, S, t);
  hero.root.position.copy(S.p).add(loc === 'I' ? HALL : loc === 'W' ? WH : v3()); hero.root.rotation.set(loc === 'W' ? 0.2 * Math.sin(t * 0.5) : 0, S.rotY, loc === 'W' ? 0.3 * Math.sin(t * 0.37) : 0);
  hero.root.visible = t >= T_OUT;
  hero.handGun.visible = S.gun; hero.gun.visible = !S.gun;
  hero.root.updateMatrixWorld(true);
  const head = wp(hero.head);
  // ---- Pixel ----
  {
    const onShoulder = t < 50.2 || (t > 81.2);
    let pp, rot = S.rotY + 0.3, walk = 0, curl = 0.3, sc = 0.5;
    if (onShoulder || t < T_OUT) { pp = wp(hero.shoulderL).add(v3(0, 0.03, 0)); }
    else {
      const base = v3(C.x + 1.1, BED_Y + 0.25, C.z + 1.8);
      if (t < 51.0) { const k = Q(50.2, 51.0, t); pp = wp(hero.shoulderL).lerp(base, k); pp.y += Math.sin(k * PI) * 0.6; sc = lerp(0.5, 0.9, k); }
      else if (t < 80.4) { pp = base; sc = 0.9; rot = 0; curl = 0; if (t > 51.4 && t < 53.4) { rot = 0; } }
      else { const k = Q(80.4, 81.2, t); pp = base.clone().lerp(wp(hero.shoulderL), k); pp.y += Math.sin(k * PI) * 0.8; sc = lerp(0.9, 0.5, k); }
    }
    pixel.g.position.copy(pp); pixel.g.rotation.set(t > 51.4 && t < 53.6 ? -0.6 : 0, rot, 0); pixel.g.scale.setScalar(sc);
    pixel.g.visible = loc !== 'W' || true;
    if (loc === 'W') { pixel.g.position.copy(wp(hero.shoulderL)).add(v3(0, 0.03, 0)); pixel.g.scale.setScalar(0.5); }
    poseSkitterling(pixel, { walk, phase: t * 8, curl: loc === 'W' ? 0.8 : curl, eyeOpen: 1, look: Math.sin(t * 1.3) * 0.4, t });
  }
  // ---- capsule + sky gate ----
  {
    let p, dir, burn = 0;
    if (t < 1.4) { p = SKYGATE.clone(); dir = v3(0, 0, 1); }
    else if (t < 6.6) {
      const k = Q(1.4, 6.6, t), above = CAP.clone().add(v3(0, 18, 0));
      const k1 = Math.min(1, k / 0.7), k2 = Math.max(0, (k - 0.7) / 0.3);
      p = k < 0.7 ? SKYGATE.clone().lerp(above, 1 - (1 - k1) ** 2) : above.clone().lerp(CAP, k2 * (2 - k2));
      dir = k < 0.7 ? above.clone().sub(SKYGATE).normalize().lerp(v3(0, 1, 0), Q(0.45, 0.7, k)) : v3(0, 1, 0); burn = 1;
    } else { p = CAP.clone(); dir = v3(0, 1, 0); burn = 0.4 * (1 - Q(6.6, 7.6, t)); }
    ship.g.position.copy(p); ship.g.lookAt(p.clone().add(dir)); ship.g.visible = t > 1.3; ship.set(t, burn);
    skyGate.set(t, Q(0.2, 1.4, t) * (1 - Q(3.6, 5.2, t))); skyGate.g.visible = t < 5.4;
  }
  // ---- armada + the lake gate ----
  armada.set(0.3 + 0.7 * Q(42, 60, t), t);
  const gk = Q(70, 76.2, t), gy = lerp(BED_Y - 8, BED_Y + GATE_R + 0.6, gk);
  gate.g.position.set(G.x, gy, G.z); gate.set(t, Q(76.2, 79.2, t)); gate.g.rotation.z = (1 - gk) * 0.6;
  gateLight.position.set(G.x, gy, G.z + 1.5); gateLight.intensity = 25 * Q(72, 79, t) + 80 * pulse(t, 85.2, 0.8);
  bedMat.emissiveIntensity = 0.06 + 0.4 * Q(40, 46, t) + 0.6 * Q(70, 76, t);
  lift.position.set(C.x, (t < T_IN ? BED_Y - 3 * Q(T_DOWN, T_IN, t) : t < T_UP ? BED_Y - 3 : BED_Y - 3 + 3.25 * Q(T_UP, 44.8, t)) - 0.25, C.z + 0.6);
  // ---- army ----
  if (loc === 'O') {
    const E = [], D = [];
    const L = SOLD.map((s, i) => {
      const on = t > s.t0 && t < s.die + 3.5;
      const p = sAt(s, Math.min(t, s.die)), rise = Q(s.t0, s.t0 + 1.2, t), dead = Q(s.die, s.die + 0.5, t);
      const facing = faceTo(p, P2(C.x, C.z));
      const blown = s.by === 'shock' ? dead : 0, bx = (p.x - G.x), bz = (p.z - G.z), bl = Math.hypot(bx, bz) || 1;
      const x = p.x + bx / bl * 5 * blown * (1 - Math.exp(-(t - s.die) * 2)), z = p.z + bz / bl * 5 * blown * (1 - Math.exp(-(t - s.die) * 2));
      const y = GY(x, z) - 1.2 * (1 - rise) - 0.6 * Q(s.die + 2, s.die + 3.5, t) + (s.by === 'shock' ? 1.6 * Math.sin(Math.min(1, (t - s.die) * 1.4) * PI) * (t > s.die ? 1 : 0) : 0);
      if (t > s.t0 && t < s.t0 + 1.0) for (let k = 0; k < 3; k++) { const u = (t - s.t0) / 1.0; D.push({ x: x + (hash2(i, k) - 0.5) * 1.4 * u, y: GY(x, z) + Math.sin(u * PI) * 0.8 * hash2(i, k + 3), z: z + (hash2(i, k + 6) - 0.5) * 1.4 * u, s: 0.08 }); }
      const dt = t - s.die; if (dt > 0 && dt < 1.2 && s.by !== 'shock') for (let k = 0; k < 10; k++) { const a = hash2(i * 13 + k, 1) * 6.283, sp = 1 + hash2(i, k) * 3; E.push({ x: x + Math.cos(a) * sp * dt, y: y + 1 + sp * dt * 0.8 - 2 * dt * dt, z: z + Math.sin(a) * sp * dt, s: 0.07 * (1 - dt / 1.2) }); }
      return { on, x, y, z, rotY: facing, rx: -1.4 * dead, scale: 1, eye: 1 - dead,
        pose: { crawl: 1 - Q(s.t0 + 1.5, s.t0 + 3, t) * 0.7, walk: dead > 0 ? 0 : 1, phase: t * 9 + s.ph, t, rise, twitch: 1, sprawl: dead, reach: t > 60 ? 0.5 : 0 } };
    });
    army.set(L);
    // skitterlings: pour out of the grass, run, leap on their soldier
    SK.forEach((sk, j) => {
      const R = SKR[j]; const s = SOLD[R.i ?? 0], arrive = R.die, t0 = arrive - 3.2;
      sk.g.visible = t > 52.6 + j * 0.08 && t < 79;
      if (!sk.g.visible) return;
      const tp = sAt(s, arrive), st = P2(C.x + Math.sin(R.a) * 30, C.z + Math.cos(R.a) * 30);
      const k = clamp01((t - t0) / 3.2), x = lerp(st.x, tp.x, k), z = lerp(st.z, tp.z, k), hop = k > 0.8 ? Math.sin((k - 0.8) / 0.2 * PI) * 1.4 : 0;
      const after = t > arrive;
      sk.g.position.set(after ? tp.x + 0.2 : x, (after ? GY(tp.x, tp.z) + 0.6 * (1 - Q(arrive, arrive + 0.8, t)) : GY(x, z) + hop), after ? tp.z : z);
      sk.g.rotation.set(after ? 0.4 : 0, faceTo(st, tp) + (after ? Math.sin(t * 9 + j) * 0.3 : 0), 0); sk.g.scale.setScalar(0.85);
      poseSkitterling(sk, { walk: after ? 0.3 : 1, phase: t * 14 + j, curl: 0, eyeOpen: 1, look: Math.sin(t * 3 + j) * 0.5, t });
    });
    // driftbacks: swoop over the lake, their belly lights pulse the Hollow down
    DB.forEach((d, k) => { const t0 = 55.6 + k * 4.6; d.g.visible = t > t0 - 0.5 && t < t0 + 8; if (!d.g.visible) return;
      const p = dbPos(k, t), q = dbPos(k, t + 0.1); d.g.position.copy(p); d.g.lookAt(q); poseDriftback(d, t, k);
      d.dotMat.color.setRGB(0.4, 1.4, 2.0).multiplyScalar(1 + 1.5 * Math.max(0, Math.sin(t * 6)));
    });
    SOLD.forEach((s, i) => { if (s.by !== 'db') return; const dt = t - s.die; if (dt < 0 || dt > 0.9) return; const p = sAt(s, s.die); for (let k = 0; k < 8; k++) E.push({ x: p.x + (hash2(i, k) - 0.5) * 0.6, y: GY(p.x, p.z) + 13 * (1 - dt / 0.5) * (dt < 0.5 ? 1 : 0) + hash2(k, i) * 1.5, z: p.z + (hash2(i, k + 9) - 0.5) * 0.6, s: 0.12 }); });
    // the gate breaking out of the lake bed
    if (t > 70 && t < 78) for (let k = 0; k < 120; k++) { const u = ((t - 70) * 0.6 + hash2(k, 1)) % 1, a = hash2(k, 2) * PI * 2, r = GATE_R * (0.6 + 0.6 * hash2(k, 3));
      D.push({ x: G.x + Math.cos(a) * r * (1 + u), y: BED_Y + Math.sin(u * PI) * (2 + 3 * hash2(k, 4)), z: G.z + Math.sin(a) * r * 0.4, s: 0.12 + 0.2 * hash2(k, 5) }); }
    const ds = t - 74; if (ds > 0 && ds < 1.6) for (let k = 0; k < 200; k++) { const a = k / 200 * PI * 2, r = 2 + ds * 22; E.push({ x: G.x + Math.cos(a) * r, y: BED_Y + 0.3, z: G.z + Math.sin(a) * r, s: 0.18 * (1 - ds / 1.6) }); }
    embers.set(E); dust.set(D);
    // gun
    const muzzle = wp(hero.muzzle);
    const last = SHOTS.filter(s => s <= t).pop(), fl = last !== undefined && t - last < 0.05 && S.gun;
    muzzleLight.position.copy(muzzle); muzzleLight.intensity = fl ? 14 : 0;
    const TR = [];
    SHOTS.forEach((sh, k) => { const dt = t - sh; if (dt < 0 || dt > 0.12 || !S.gun) return;
      const tp = sAt(SOLD[shotTarget[k]], sh), end = v3(tp.x + (hash2(k, 1) - 0.5) * 0.6, GY(tp.x, tp.z) + 0.8 + hash2(k, 2) * 0.4, tp.z), dir = end.clone().sub(muzzle);
      const Ld = dir.length(), u = Math.min(1, dt / 0.08), seg = Math.min(Ld * 0.35, 3), h2 = muzzle.clone().addScaledVector(dir, u), tl = muzzle.clone().addScaledVector(dir, Math.max(0, u - seg / Ld)), m = h2.clone().add(tl).multiplyScalar(0.5);
      qq.setFromUnitVectors(zAxis, dir.normalize()); const e = new THREE.Euler().setFromQuaternion(qq);
      TR.push({ x: m.x, y: m.y, z: m.z, s: 1, rx: e.x, ry: e.y, rz: e.z, sx: 0.035, sy: 0.035, sz: h2.distanceTo(tl) + 0.01 }); });
    tracers.set(TR);
    if (tracers.mesh.count !== undefined) { const m4 = new THREE.Matrix4(); TR.forEach((r, k) => { qq.setFromEuler(new THREE.Euler(r.rx, r.ry, r.rz)); tracers.mesh.setMatrixAt(k, m4.compose(v3(r.x, r.y, r.z), qq, v3(r.sx, r.sy, r.sz))); }); for (let k = TR.length; k < 24; k++) tracers.mesh.setMatrixAt(k, m4.makeScale(0, 0, 0)); tracers.mesh.instanceMatrix.needsUpdate = true; }
  }
  // ---- temple: keys, beams, galaxy ----
  if (loc === 'I') {
    const hand = wp(hero.handR).sub(HALL);
    KEYS.forEach((k, i) => {
      const tk = T_KEY[i], show = t > tk - 1.5; k.g.visible = show; k.spin(t);
      const sp = sockets[i].p.clone().add(v3(0, 0.12, 0));
      if (t < tk - 0.4) k.g.position.copy(hand).add(v3(0, 0.1, 0)); else k.g.position.copy(hand.clone().add(v3(0, 0.1, 0)).lerp(sp, Q(tk - 0.4, tk, t)));
      k.g.scale.setScalar(1 + 0.5 * pulse(t, tk, 0.6));
      sockets[i].m.scale.setScalar(1 + 2 * pulse(t, tk, 0.8)); beams[i].visible = t > tk; beams[i].scale.set(1, Q(tk, tk + 0.8, t), 1); beams[i].position.y = PED_TOP + 2.2 * Q(tk, tk + 0.8, t);
    });
    const nk = T_KEY.filter(x => t > x).length;
    bands.forEach((b, i) => b.emissiveIntensity = 0.2 + 0.35 * nk + 1.2 * Q(37.6, 39, t) * (0.6 + 0.4 * Math.sin(t * 3 + i)));
    galaxy.set(t, 0.35 + 0.16 * nk + 0.5 * Q(37.6, 40, t), 0.05);
    const e = galaxy.edge(t); earthDot.position.copy(e); earthDot.scale.setScalar(1 + 1.5 * Q(38, 40, t) * (0.7 + 0.3 * Math.sin(t * 5)));
    holoLight.intensity = 6 + 4 * nk + 20 * Q(37.6, 39, t);
    keyLight.intensity = 2.5 * T_KEY.reduce((a, tk) => a + pulse(t, tk, 0.6), 0) + 0.6 * nk;
    if (nk) keyLight.color.setRGB(...KEY_COLORS[Math.min(3, nk - 1)].map(c => c / 2.4));
  }
  // ---- wormhole ----
  if (loc === 'W') {
    const W = STR.map((s, i) => { const z = 40 - ((s.z + (t - T_WORM) * s.sp) % 160), a = s.a + (t - T_WORM) * 0.6 + z * 0.01; return { x: Math.cos(a) * s.r, y: Math.sin(a) * s.r, z, s: 1, rz: 0 }; });
    const m4 = new THREE.Matrix4(); STR.forEach((s, i) => { const w = W[i]; streaks.mesh.setMatrixAt(i, m4.compose(v3(w.x, w.y, w.z), new THREE.Quaternion(), v3(0.04, 0.04, s.l))); }); streaks.mesh.instanceMatrix.needsUpdate = true; streaks.mesh.count = NSTR;
    exitLight.scale.setScalar(1 + 18 * Q(93, 100, t) ** 2); exitLight.position.z = -120 + 60 * Q(93, 100, t);
    streaks.mesh.material.color.setRGB(0.4, 1.7, 2.3).lerp(new THREE.Color(2.2, 0.3, 0.4), pulse(t, 90.6, 2.6) * 0.8);
  }
  // ---- cameras ----
  let pos = v3(), fov = 56;
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY)), hp = hero.root.position;
  if (t < 3.6) { pos = v3(8, H(8, 6) + 1.6, 6); look.copy(ship.g.visible ? ship.g.position : SKYGATE).lerp(SKYGATE, t < 1.4 ? 1 : 0.35); fov = 60; }
  else if (t < T_OUT) { pos = v3(-6, H(-6, 4) + 2.2, 5); look.copy(ship.g.position).add(v3(0, -1, 0)); fov = 58; }
  else if (t < 10.8) { pos = hp.clone().addScaledVector(fwd, 2.6).addScaledVector(right, -0.8).add(v3(0, 1.4, 0)); look.copy(hp).add(v3(0, 1.3, 0)); fov = 54; }
  else if (t < T_DOWN) { pos = v3(C.x - 5, BED_Y + 5, C.z - 6); look.copy(hp).add(v3(0, 0.8, 0)); fov = 60; }
  else if (t < T_IN) { pos = v3(C.x + 4.5, BED_Y + 3.2, C.z + 5.5); look.copy(hp).add(v3(0, 0.6, 0)); fov = 60; }
  else if (t < 18.4) { const k = Q(T_IN, 18.4, t); pos = HALL.clone().add(v3(1.2, 1.8 + 1.5 * k, 13 - 2 * k)); look.copy(HALL).add(v3(0, 3.5 + 2 * k, 0)); fov = 66; }
  else if (t < 21.8) { pos = HALL.clone().add(v3(-3.5, 2.4, -3.6)); look.copy(hp).add(v3(0, 1.2, 0)); fov = 56; }
  else if (t < 25.2) { pos = head.clone().add(v3(0.35, 0.05, -0.85)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 28.6) { pos = HALL.clone().add(v3(2.6, 2.6, 4.2)); look.copy(HALL).add(v3(0, 2.4, 0)); fov = 54; }
  else if (t < 33.2) { pos = HALL.clone().add(v3(1.3, PED_TOP + 0.8, -1.2)); look.copy(HALL).add(v3(0, PED_TOP + 0.05, 0)); fov = 48; }
  else if (t < 35.8) { pos = head.clone().add(v3(-0.25, 0.1, -0.8)); look.copy(head).add(v3(0, -0.12, 0)); fov = 44; }
  else if (t < 38.2) { pos = HALL.clone().add(v3(-1.3, PED_TOP + 0.9, -1.1)); look.copy(HALL).add(v3(0, PED_TOP + 0.05, 0)); fov = 50; }
  else if (t < T_UP) { const k = Q(38.2, T_UP, t); pos = HALL.clone().add(v3(0, 1.4 + 1.6 * k, 7.5 + 2 * k)); look.copy(HALL).add(v3(0, 5.6, 0)); fov = 70; }
  else if (t < 47.6) { const k = Q(T_UP, 47.6, t); pos = v3(C.x + 3, BED_Y + 2.2 + 2 * k, C.z - 7.5); look.copy(hp).add(v3(0, 1.2, 9)); fov = 64; }
  else if (t < 51.6) { pos = hp.clone().addScaledVector(fwd, -2.2).addScaledVector(right, 0.7).add(v3(0, 1.6, 0)); look.copy(hp).addScaledVector(fwd, 8).add(v3(0, 1.0, 0)); fov = 60; }
  else if (t < 55.2) { const pp = pixel.g.position; pos = pp.clone().add(v3(0.6, 0.35, 1.4)); look.copy(pp).add(v3(0, 0.25, 0)); fov = 48; }
  else if (t < 60.2) { pos = v3(C.x - 14, BED_Y + 7, C.z + 26); look.set(C.x + 2, BED_Y + 1, C.z + 8); fov = 60; }
  else if (t < 64.2) { pos = v3(C.x + 4, BED_Y + 1.0, C.z + 12); look.copy(dbPos(1, t)).lerp(v3(C.x, BED_Y + 4, C.z), 0.4); fov = 66; }
  else if (t < 70) { pos = head.clone().addScaledVector(fwd, 1.0).addScaledVector(right, -0.25); look.copy(head).add(v3(0, -0.05, 0)); fov = 44; }
  else if (t < 76.6) { pos = v3(C.x + 7, BED_Y + 2.0, C.z + 9); look.set(G.x, BED_Y + 3.5 * Q(70, 76, t) + 1.5, G.z); fov = 62; }
  else if (t < 80.4) { pos = v3(C.x - 1.5, BED_Y + 2.2, C.z + 6.5); look.set(G.x, BED_Y + GATE_R * 0.7, G.z); fov = 62; }
  else if (t < T_JUMP) { pos = hp.clone().add(v3(-1.6, 1.2, 2.6)); look.copy(hp).add(v3(0, 1.4, -2)); fov = 60; }
  else if (t < T_WORM) { pos = v3(G.x + 7, BED_Y + 1.6, G.z + 15); look.copy(hp).lerp(v3(G.x, BED_Y + GATE_R, G.z), 0.5); fov = 56; }
  else if (t < 90.2) { pos = hp.clone().add(v3(0.8, 0.6, -2.6)); look.copy(hp).add(v3(0, 0.9, 0)); fov = 56; }
  else if (t < 95) { pos = head.clone().add(v3(0.2, 0.05, -0.85)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else { const k = Q(95, 100, t); pos = hp.clone().add(v3(0.4, 1.0 + 0.5 * k, 3.2 + 2 * k)); look.copy(hp).add(v3(0, 0.6, -30)); fov = 62; }
  aim(camera, pos, look, loc === 'O' ? GY : null, fov);
  postFx(engine, EP, t, { exposure: loc === 'I' ? 2.8 : loc === 'W' ? 2.4 : 3.0, glitch: t > 90.2 && t < 90.8 ? 0.35 : 0,
    flashes: [[1.4, 0.4, 3], [30.0, 0.15, 4], [32.6, 0.15, 4], [35.2, 0.15, 4], [37.8, 0.35, 3], [74.0, 0.5, 3], [85.2, 0.8, 2]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { hero, devState } });
