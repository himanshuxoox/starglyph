// Episode 15 — "The Choice". The hive wakes with ECHO. A run to Mira's capsule, a launch up the hive spire,
// a chase through an asteroid field with ECHO flying, and Mira's choice: the Hollow track HER eye, so she goes
// out of the hatch and draws them away.
import { THREE, SET, tag, hash2, PI, Q, pulse, glow, P2, faceTo, lerpAng,
  loadEpisode, makeStage, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeHollowArmy } from './engine/hollow.js';
import { makeCorridor, makePodChamber, makeHiveSpire, makeMira, boneMat, veinMat } from './engine/hive.js';
import { makeCapsule, makeHollowShip, makeAsteroids, makeRockPlanet, makeGasGiant } from './engine/space.js';
import { makeGate } from './engine/props.js';

const EP = await loadEpisode('15');
const { engine, scene, camera, world } = makeStage({ fog: [0x1a0c10, 5, 46] });
const wp = o => o.getWorldPosition(new THREE.Vector3());

// =====================================================================
// HIVE INTERIOR: corridor -> hangar chamber with the capsule
// =====================================================================
const hive = new THREE.Group(); world.add(hive);
const bone = boneMat(), vein = veinMat();
const COR = makeCorridor([v3(0, 0, 0), v3(0, 0, -12), v3(-3, 0, -24), v3(-2, 0, -36), v3(0, 0, -46)], { bone, vein, w: 3.6, h: 3.8 }); hive.add(COR.g);
const HG = v3(0, 0, -62);
const hangar = makePodChamber({ R: 15, h: 22 }); hangar.g.position.copy(HG); hive.add(hangar.g);
const cradle = new THREE.Group(); cradle.position.copy(HG); hive.add(cradle);
for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2, r = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 3.4, 6), bone); r.position.set(Math.cos(a) * 2.4, 1.2, Math.sin(a) * 2.4); r.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); cradle.add(tag(r, SET.METAL)); }
const ship = makeCapsule(); world.add(ship.g);                           // shared by every shot
const alarm = []; for (const u of [0.1, 0.35, 0.6, 0.85]) { const p = COR.curve.getPointAt(u), l = new THREE.PointLight(0xff3040, 10, 14, 1.4); l.position.set(p.x, 3.0, p.z); hive.add(l); alarm.push(l); }
const hRed = new THREE.PointLight(0xff3040, 30, 50, 1.3); hRed.position.copy(HG).add(v3(0, 16, 0)); hive.add(hRed);
const hemiIn = new THREE.HemisphereLight(0x9a5a6a, 0x100810, 1.1); hive.add(hemiIn);
const faceFill = new THREE.PointLight(0xffc8b8, 4, 6, 1.2); world.add(faceFill);
const army = makeHollowArmy(40); hive.add(army.group);
const SOLD = [...Array(40)].map((_, i) => i < 16 ? { kind: 'cor', d: 4 + i * 1.7 + hash2(i, 1) * 1.2, side: (hash2(i, 2) - 0.5) * 2.4, h: hash2(i, 3) } : { kind: 'wall', a: hash2(i, 4) * PI * 2, y: 3 + hash2(i, 5) * 14, h: hash2(i, 6), t0: 16 + hash2(i, 7) * 7 });

// =====================================================================
// SPACE: the spire from outside, the ice planet, the asteroid field, the raiders, the gate far away
// =====================================================================
const SPC = v3(9000, 0, 0);
const space = new THREE.Group(); space.position.copy(SPC); world.add(space);
const planet = makeRockPlanet({ r: 1400, color: 0xc8d4e4, detail: 6, rough: 0.02, seed: 11 }); planet.position.set(0, -1430, 0); space.add(planet);
const spire = makeHiveSpire(0.6); spire.g.position.set(0, -32, 0); space.add(spire.g);
const giant = makeGasGiant({ r: 520, bands: ['#3a4a8a', '#5a6aa8', '#8a9ac8', '#4a5a98', '#6a7ab8', '#2a3a7a'], spot: null, seed: 5, emissive: 0.12 }); giant.position.set(-2600, 800, -9500); giant.scale.setScalar(1.8); space.add(giant);
const sun = new THREE.DirectionalLight(0xfff0e0, 2.6); sun.position.set(600, 400, 300); space.add(sun, sun.target, new THREE.AmbientLight(0x50586a, 0.7));
const FIELD_Z0 = -260, SPEED = 62;
const pathAt = (tt) => { const k = Math.max(0, tt - 40); return v3(9 * Math.sin(k * 0.55) + 4 * Math.sin(k * 1.3), 120 + 4 * Math.sin(k * 0.9), FIELD_Z0 - SPEED * k); };
const rocks = makeAsteroids({ n: 520, spread: [170, 70, 1800], size: [1.2, 15], seed: 3, color: 0x6a6670 });
rocks.mesh.position.set(0, 120, FIELD_Z0 - 860); space.add(rocks.mesh);
for (const r of rocks.rocks) {                                  // clear a weaving tunnel for the capsule
  const tt = 40 + -(r.z - 860 + 0) / SPEED; const p = pathAt(40 + ((-(r.z) + 860) - 0) / SPEED);
  const dx = r.x - p.x, dy = r.y + 120 - p.y, d = Math.hypot(dx, dy), need = 9 + r.s;
  if (d < need) { const k = need / Math.max(d, 0.01); r.x = p.x + dx * k; r.y = p.y - 120 + dy * k; }
  r.dx = 0;
}
rocks.set(0);
const RAID = [...Array(7)].map((_, i) => { const r = makeHollowShip(0.75); space.add(r.g); return { r, lag: 40 + i * 14 + hash2(i, 1) * 10, dx: (hash2(i, 2) - 0.5) * 30, dy: (hash2(i, 3) - 0.5) * 16, die: [52.6, 55.4, 61.6, 64.2, 999, 999, 999][i] }; });
const embers = makePool(900, new THREE.IcosahedronGeometry(1, 0), glow(2.4, 0.5, 0.25), SET.ENERGY); space.add(embers.mesh);
const gate = makeGate(40, new THREE.MeshStandardMaterial({ color: 0x4a4458, roughness: 0.6, metalness: 0.4, flatShading: true }), [0.4, 1.6, 2.2]); space.add(gate.g);
const redFlash = new THREE.PointLight(0xff3040, 0, 400, 1.2); space.add(redFlash);

// =====================================================================
// CAPSULE INTERIOR (cockpit) - far away, its own little set
// =====================================================================
const CK = v3(-9000, 0, 0);
const cockpit = new THREE.Group(); cockpit.position.copy(CK); world.add(cockpit);
const wallM = new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.6, metalness: 0.4, side: THREE.BackSide, flatShading: true });
const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.9, 3.2, 14, 1, false), wallM); shell.rotation.x = PI / 2; shell.position.set(0, 1.1, 0); cockpit.add(tag(shell, SET.METAL));
const win = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0x000000 })); win.position.set(0, 1.35, -1.55); cockpit.add(tag(win, SET.SKY));
const panelM = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, emissive: 0x1a6a8a, emissiveIntensity: 0.6 });
const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.4), panelM); panel.position.set(0, 0.85, -1.15); panel.rotation.x = -0.5; cockpit.add(tag(panel, SET.METAL));
const leds = []; for (let i = 0; i < 18; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), glow(...(i % 3 ? [0.3, 1.8, 0.6] : [2.2, 0.4, 0.3]))); l.position.set(-0.75 + (i % 9) * 0.19, 0.95 + Math.floor(i / 9) * 0.1, -1.0 - Math.floor(i / 9) * 0.06); l.rotation.x = -0.5; cockpit.add(tag(l, SET.ENERGY)); leds.push(l); }
const hatchDoor = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshStandardMaterial({ color: 0xc8c2b6, roughness: 0.6, side: THREE.DoubleSide })); hatchDoor.position.set(1.25, 1.1, 0.4); hatchDoor.rotation.y = -PI / 2; cockpit.add(tag(hatchDoor, SET.METAL));
const ckRed = new THREE.PointLight(0xff3040, 0, 4, 1.4); ckRed.position.set(0, 1.9, 0); cockpit.add(ckRed);
const ckLight = new THREE.PointLight(0xbfe8ff, 4, 6, 1.3); ckLight.position.set(0, 1.9, -0.6); cockpit.add(ckLight, new THREE.HemisphereLight(0x8a9aa8, 0x202024, 0.8));

// =====================================================================
// CHARACTERS
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 0;
const mira = makeMira(); scene.add(mira.root);
const pixel = makeSkitterling(1); scene.add(pixel.g);
const T_SEAT = 24.2, T_LAUNCH = 26.0, T_OUT = 84.4;
function runner(t, lead) {                                  // position along the corridor, then into the hangar
  if (t < 14) { const u = clamp01(0.04 + (t - 0.4) / 13.4 * 0.94) - lead * 0.03, p = COR.curve.getPointAt(Math.max(0, Math.min(1, u))), q = COR.curve.getPointAt(Math.max(0, Math.min(1, u + 0.01)));
    return { p: v3(p.x + lead * 0.7, 0, p.z), rotY: faceTo(P2(p.x, p.z), P2(q.x, q.z)), run: Q(0.4, 1.0, t), phase: u * COR.L / 0.85 * PI }; }
  const a = COR.curve.getPointAt(0.98), b = HG.clone().add(v3(lead * 1.2 - 0.6, 0, 2.6)), k = Q(14, 18, t);
  return { p: a.clone().lerp(b, k).setY(0).add(v3(lead * 0.7 * (1 - k), 0, 0)), rotY: faceTo(P2(a.x, a.z), P2(b.x, b.z)), run: 1 - Q(17.4, 18.0, t), phase: (t - 14) * 9 };
}
function devState(t) {
  const S = { loc: 'H', p: v3(), rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0 };
  if (t < T_SEAT) { const r = runner(t, 0); S.p = r.p; S.rotY = r.rotY; S.run = r.run; S.walk = Math.max(r.run, 0.3 * (t > 18 && t < 23.4 ? Q(18.6, 19, t) * (1 - Q(23, 23.4, t)) : 0)); S.phase = r.phase; S.lean = 0.12 * r.run;
    if (t > 7 && t < 11) S.headYaw = 0.9 * Q(7.4, 8.0, t) * (1 - Q(10, 10.6, t));
    if (t > 18) { const k = Q(18.6, 23.6, t); S.p = S.p.clone().lerp(HG.clone().add(v3(0.4, 0, 0.9)), k); S.rotY = lerpAng(S.rotY, faceTo(P2(S.p.x, S.p.z), P2(HG.x, HG.z)), Q(18.4, 19.2, t)); S.phase = (t - 18) * 4; S.lookUp = 0.3 * Q(14.6, 15.6, t) * (1 - Q(20, 21, t)); }
    return S; }
  S.loc = 'C'; S.p = v3(-0.45, 0.2, 0); S.rotY = PI; S.crouch = 1; S.lean = -0.25; S.lookUp = 0.2;
  S.armRo = { x: -1.1, z: -0.1, ex: -0.9, w: 1 }; S.armLo = { x: -1.1, z: 0.1, ex: -0.9, w: 1 };
  if (t > 40.4 && t < 52) { const k = Q(44, 45, t) * (1 - Q(50.6, 51.4, t)); S.headYaw = 0.4 * k; S.armRo.w = 1 - 0.8 * Q(48.2, 49.2, t); }
  if (t > 66) S.headYaw = -0.7 * Q(66.4, 67.2, t);
  return S;
}
function miraState(t) {
  const S = { loc: 'H', p: v3(), rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0, jet: 0, out: false };
  if (t < T_SEAT) { const r = runner(t + 0.15, 1); S.p = r.p; S.rotY = r.rotY; S.run = r.run; S.walk = r.run; S.phase = r.phase + 1.4; S.lean = 0.12 * r.run;
    if (t > 14) { S.rotY = lerpAng(r.rotY, faceTo(P2(S.p.x, S.p.z), P2(HG.x, HG.z)), Q(17.6, 18.4, t)); if (t > 18) { const k = Q(19, 23.4, t); S.p = S.p.clone().lerp(HG.clone().add(v3(-0.9, 0, 0.7)), k); S.walk = 0.5 * (1 - Q(23, 23.4, t)); S.phase = (t - 18) * 4; } S.lookUp = 0.4 * Q(14.4, 15.4, t) * (1 - Q(18.2, 19, t)); S.headYaw = t > 18 ? 0.6 * Q(18.4, 19, t) * (1 - Q(21.6, 22.4, t)) : 0; }
    return S; }
  S.loc = 'C'; S.p = v3(0.5, 0.2, 0.05); S.rotY = PI; S.crouch = 1; S.lean = -0.2; S.lookUp = 0.15;
  if (t > 66) { S.headYaw = 0.6 * Q(66, 67, t); S.lookUp = -0.1; }
  if (t > 73.6) { const st = Q(73.6, 75.0, t); S.crouch = 1 - 0.6 * st; S.p = v3(lerp(0.5, 0.75, st), 0.2, lerp(0.05, 0.5, st)); S.rotY = lerpAng(PI, -PI / 2 + 0.6, st); S.armRo = { x: -1.3, z: -0.2, ex: -0.4, w: Q(74.4, 75.2, t) * (1 - Q(77, 78, t)) }; }
  if (t > 78.6) { S.headYaw = -0.5; S.rotY = lerpAng(-PI / 2 + 0.6, PI / 2 + 0.2, Q(78.6, 79.4, t)); }
  if (t >= T_OUT) { S.loc = 'S'; S.out = true; S.jet = 1; S.crouch = 0.2; S.lean = 0.5; S.armRo = { x: 0.3, z: -0.5, ex: -0.3, w: 1 }; S.armLo = { x: 0.3, z: 0.5, ex: -0.3, w: 1 }; }
  return S;
}
// capsule world position over time (SPC space)
function shipState(t) {
  if (t < T_LAUNCH) return { p: HG.clone().add(v3(0, 2.0, 0)), loc: 'H', up: true, burn: 0 };
  if (t < 40) { const k = Q(T_LAUNCH, 40, t), y = lerp(-20, 120, k * k * 0.4 + k * 0.6); return { p: v3(lerp(0, 0, k), y, lerp(0, FIELD_Z0, Q(31, 40, t))), loc: 'S', up: t < 31, burn: 1 }; }
  return { p: pathAt(t), loc: 'S', up: false, burn: 1 };
}

const FOOT = footsteps(devState, T_SEAT);
window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false, run: f.run })) };
const look = new THREE.Vector3();
const VISOR = [[40.0, 52.0, 'PILOT  ▸ ECHO\nTHRUST  ▮▮▮▮▮▮▮▮▮▮\nPURSUIT  7 ▸ 3'], [64.6, 70.0, 'PURSUIT  3\nLOCK  ▸ ~~ MIRA SEN ~~']];
const hud = makeHud(EP, { visor: VISOR });

function update(t) {
  const S = devState(t), M = miraState(t), sh = shipState(t);
  // which set: H hive, S space exterior, C cockpit
  const cockpitShot = (t >= 43.6 && t < 52) || (t >= 66 && t < T_OUT);
  const loc = t < T_LAUNCH ? 'H' : (cockpitShot ? 'C' : 'S');
  hive.visible = loc === 'H'; space.visible = loc === 'S'; cockpit.visible = loc === 'C';
  if (loc === 'S') { scene.fog.near = 1e5; scene.fog.far = 2e5; } else if (loc === 'C') { scene.fog.near = 8; scene.fog.far = 40; scene.fog.color.set(0x05060a); } else { scene.fog.color.set(0x1a0c10); scene.fog.near = 5; scene.fog.far = 46; }
  // capsule
  ship.g.visible = loc !== 'C';
  if (sh.loc === 'H') ship.g.position.copy(sh.p); else ship.g.position.copy(sh.p).add(SPC);
  if (sh.up) ship.g.rotation.set(-PI / 2, 0, 0); else if (t < 40) ship.g.rotation.set(-PI / 2 * (1 - Q(31, 34, t)) + PI, 0, 0);
  else { const q = pathAt(t + 0.1), dir = q.clone().sub(pathAt(t)); ship.g.rotation.set(0, Math.atan2(dir.x, dir.z), -0.6 * Math.sin((t - 40) * 0.55)); }
  if (sh.loc === 'S' && t >= 34) ship.g.rotation.x = 0;
  ship.set(t, sh.burn * (t > T_LAUNCH ? 1.2 : 0));
  // characters
  const inHive = loc === 'H', inCk = loc === 'C';
  poseHero(hero, S, t); poseHero(mira, M, t);
  hero.root.visible = inHive || inCk; mira.root.visible = inHive || (inCk && t < T_OUT) || (loc === 'S' && M.out);
  if (inCk) { hero.root.position.copy(CK).add(S.p); mira.root.position.copy(CK).add(M.p); } else { hero.root.position.copy(S.p); mira.root.position.copy(M.p); }
  hero.root.rotation.set(0, S.rotY, 0); mira.root.rotation.set(0, M.rotY, 0);
  hero.handGun.visible = false; hero.gun.visible = true;
  // Mira outside: she jets from the hatch toward the raiders
  let miraOut = null;
  if (M.out) {
    const k = Q(T_OUT, 92, t), base = pathAt(T_OUT).add(SPC), tgt = pathAt(T_OUT).add(v3(30, 10, 120)).add(SPC);
    miraOut = base.clone().lerp(tgt, k).add(v3(2 + 6 * k, 1, 0)); mira.root.position.copy(miraOut); mira.root.rotation.set(-0.4, PI * 0.15 + PI, 0);
  }
  hero.root.updateMatrixWorld(true); mira.root.updateMatrixWorld(true);
  const head = wp(hero.head), mh = wp(mira.head);
  const eyeK = t > 64 ? 0.8 + 0.4 * Math.sin(t * 4) : 0.6;
  mira.hollowEye.visible = true; mira.hollowEye.scale.setScalar(1.6 * eyeK + (M.out ? 2 : 0));
  hero.cyanMat.color.setRGB(0.35, 1.6, 1.8).multiplyScalar(t > 40 && t < 66 ? 1.6 : 1);
  faceFill.position.copy(head.clone().lerp(mh, 0.5)).add(v3(0, 0.6, 0.8)); faceFill.intensity = inCk ? 3 : 4;
  ckRed.intensity = inCk && t > 66 ? 3 * eyeK : 0;
  leds.forEach((l, i) => l.visible = Math.sin(t * (3 + i) + i) > -0.3);
  // Pixel on Dev's shoulder
  { const s2 = wp(hero.shoulderL); pixel.g.visible = inHive || inCk; pixel.g.position.copy(s2).add(v3(0, 0.03, 0)); pixel.g.rotation.set(0, S.rotY + 0.3, 0); pixel.g.scale.setScalar(0.5); poseSkitterling(pixel, { curl: inHive ? 0.6 : 0.2, eyeOpen: 1, look: Math.sin(t) * 0.4, t }); }
  // hive: alarm pulse + the swarm
  const beat = 0.5 + 0.5 * Math.sin(t * 6);
  alarm.forEach(l => l.intensity = 4 + 14 * beat); vein.color.setRGB(1.8, 0.12, 0.18).multiplyScalar(0.4 + beat);
  if (inHive) {
    const L = SOLD.map((s, i) => {
      if (s.kind === 'cor') { const u = Math.max(0, clamp01((t - 0.4) / 13.4 * 0.94) - s.d / COR.L - 0.02), p = COR.curve.getPointAt(Math.max(0.001, Math.min(1, u))), q = COR.curve.getPointAt(Math.min(1, u + 0.01));
        return { on: t > 2 + s.h * 2 && t < 18, x: p.x + s.side * 0.5, y: 0, z: p.z, rotY: faceTo(P2(p.x, p.z), P2(q.x, q.z)), scale: 1, pose: { crawl: 1, walk: 1, phase: t * 12 + i, t, twitch: 1 }, eye: 1 }; }
      const k = Q(s.t0, s.t0 + 3, t), r = 14.5 - 4 * k, y = s.y * (1 - k * 0.4);
      return { on: t > s.t0, x: HG.x + Math.sin(s.a) * r, y: y * (1 - k) , z: HG.z + Math.cos(s.a) * r, rotY: s.a + PI, rx: -1.2 * (1 - k), scale: 1, pose: { crawl: 1, walk: 1, phase: t * 10 + i, t, twitch: 1 }, eye: 1 };
    });
    army.set(L);
  }
  // space: rocks, raiders, embers, gate, Mira's red flash
  if (loc === 'S') {
    rocks.set(t * 0.2);
    const E = [];
    RAID.forEach((R, i) => {
      const tt = t - R.lag / SPEED; const base = t < 40 ? shipState(Math.max(T_LAUNCH, t - 3 - i * 0.4)).p : pathAt(tt);
      let p = base.clone().add(v3(R.dx * Q(30, 42, t), R.dy * Q(30, 42, t), 0));
      if (M.out) { const k = Q(T_OUT + 1 + i * 0.3, 90 + i * 0.2, t); p = p.clone().lerp((miraOut ? miraOut.clone().sub(SPC) : p).add(v3(R.dx * 0.3, R.dy * 0.3, 18 + i * 4)), k); }
      R.r.g.visible = t > 34 + i * 0.6 && t < R.die && !(M.out && t > 91);
      R.r.g.position.copy(p); const q = pathAt(tt + 0.1); R.r.g.lookAt(M.out ? (miraOut || p) : q.clone().add(SPC)); R.r.g.position.add(SPC);
      if (M.out) R.r.g.lookAt(miraOut || R.r.g.position);
      R.r.core.material.color.setRGB(2.4, 0.15, 0.2).multiplyScalar(1 + 0.5 * Math.sin(t * 8 + i));
      const dt = t - R.die; if (dt > 0 && dt < 2.2) for (let k = 0; k < 90; k++) { const a = hash2(i * 9 + k, 1) * 6.283, b = hash2(i * 9 + k, 2) * 3.14, sp = 6 + hash2(k, 3) * 14; E.push({ x: p.x + Math.cos(a) * Math.sin(b) * sp * dt, y: p.y + Math.cos(b) * sp * dt, z: p.z + Math.sin(a) * Math.sin(b) * sp * dt, s: 0.5 * (1 - dt / 2.2) }); }
    });
    const df = t - 91; if (df > 0 && df < 3 && miraOut) for (let k = 0; k < 160; k++) { if (k > 150) break; const a = hash2(k, 11) * 6.283, b = hash2(k, 12) * 3.14, sp = 10 + hash2(k, 13) * 20, c = miraOut.clone().sub(SPC); E.push({ x: c.x + Math.cos(a) * Math.sin(b) * sp * df, y: c.y + Math.cos(b) * sp * df, z: c.z + Math.sin(a) * Math.sin(b) * sp * df, s: 0.25 * (1 - df / 3) }); }
    embers.set(E);
    redFlash.position.copy(miraOut ? miraOut.clone().sub(SPC) : v3()); redFlash.intensity = 300 * pulse(t, 91, 1.2);
    const gp = pathAt(100).add(v3(0, 10, -500)); gate.g.position.copy(gp); gate.set(t, Q(90, 96, t));
  }
  // ---- cameras ----
  let pos = v3(), fov = 56;
  const sp = ship.g.position, fwdS = v3(0, 0, 1).applyEuler(ship.g.rotation), mf = v3(Math.sin(M.rotY), 0, Math.cos(M.rotY));
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  if (t < 7.6) { const a = hero.root.position; pos = a.clone().addScaledVector(fwd, 3.6).addScaledVector(right, 0.9).add(v3(0, 1.25, 0)); look.copy(a).add(v3(0, 1.2, 0)).addScaledVector(fwd, -2); fov = 62; }
  else if (t < 11) { pos = head.clone().addScaledVector(fwd, 0.9).addScaledVector(right, -0.2); look.copy(head).add(v3(0, -0.05, 0)); fov = 40; }
  else if (t < 14) { const a = hero.root.position; pos = a.clone().addScaledVector(fwd, -1.6).addScaledVector(right, 0.6).add(v3(0, 1.0, 0)); look.copy(a).addScaledVector(fwd, -9).add(v3(0, 0.6, 0)); fov = 66; }       // looking back at the swarm
  else if (t < 18.2) { pos = HG.clone().add(v3(-6, 3.2, 9)); look.copy(HG).add(v3(0, 3, 0)); fov = 64; }
  else if (t < 22.4) { pos = mh.clone().addScaledVector(mf, 1.3).add(v3(0, 0.05, 0)).addScaledVector(v3(mf.z, 0, -mf.x), 0.3); look.copy(mh).add(v3(0, -0.1, 0)); fov = 42; }
  else if (t < T_LAUNCH) { const k = Q(22.4, 26, t); pos = HG.clone().add(v3(-9 + 2 * k, 2.0 + 3 * k, 7)); look.copy(HG).add(v3(0, 2 + 3 * k, 0)); fov = 60; }
  else if (t < 31) { const k = Q(T_LAUNCH, 31, t); pos = SPC.clone().add(v3(70, 30 + 40 * k, 90)); look.copy(sp); fov = 56; }
  else if (t < 36) { pos = sp.clone().add(v3(0, -6, 26)); look.copy(sp).add(v3(0, 0, -30)); fov = 60; }
  else if (t < 40) { pos = sp.clone().add(v3(5, 3, -12)); look.copy(sp).add(v3(0, -6, 40)); fov = 64; }      // raiders coming up behind
  else if (t < 43.6) { pos = sp.clone().addScaledVector(fwdS, -22).add(v3(0, 6, 0)); look.copy(sp).addScaledVector(fwdS, 40); fov = 60; }
  else if (t < 52) { if (t < 48) { pos = head.clone().add(v3(0.6, 0.05, -0.9)); look.copy(head).add(v3(0, -0.05, 0)); fov = 40; } else { pos = CK.clone().add(v3(0.1, 1.5, 1.4)); look.copy(CK).add(v3(0, 1.3, -1.5)); fov = 58; } }
  else if (t < 58) { pos = pathAt(t + 0.22).add(SPC).add(v3(3, 2, 0)); look.copy(sp).addScaledVector(fwdS, -20); fov = 64; }    // ahead, looking back: raiders hitting rocks
  else if (t < 66) { pos = pathAt(t - 0.28).add(SPC).add(v3(-3, 3, 0)); look.copy(pathAt(t + 0.6)).add(SPC); fov = 62; }
  else if (t < 73.6) { if (t < 70.2) { pos = mh.clone().add(v3(-0.55, 0.0, -0.95)); look.copy(mh).add(v3(0, -0.12, 0)); fov = 42; } else { const ew = wp(mira.hollowEye); pos = ew.clone().add(v3(-0.2, 0.06, -0.55)); look.copy(ew); fov = 40; } }
  else if (t < 80) { pos = CK.clone().add(v3(-0.9, 1.6, 1.3)); look.copy(mh).add(v3(0, -0.2, 0)); fov = 56; }
  else if (t < T_OUT) { pos = head.clone().add(v3(0.5, 0.0, -0.95)); look.copy(head).add(v3(0, -0.05, 0)); fov = 40; }
  else if (t < 91.6) { const mo = miraOut || sp; pos = mo.clone().add(v3(1.2, 1.4, -3.6)); look.copy(mo).add(v3(0, 0.6, 5)); fov = 62; }
  else if (t < 94.6) { const mo = pathAt(T_OUT).add(SPC); pos = mo.clone().add(v3(-20, 12, -70)); look.copy(mo).add(v3(20, 6, 130)); fov = 60; }
  else { const k = Q(94.6, 100, t); pos = sp.clone().add(v3(-6, 4, 24 + 10 * k)); look.copy(sp).addScaledVector(fwdS, 60); fov = 60; }
  aim(camera, pos, look, null, fov);
  postFx(engine, EP, t, { exposure: loc === 'S' ? 2.4 : loc === 'C' ? 3.0 : 3.2, glitch: t > 40.2 && t < 40.8 ? 0.3 : 0, flashes: [[T_LAUNCH, 0.5, 3], [30.4, 0.3, 4], [52.6, 0.15, 5], [55.4, 0.15, 5], [61.6, 0.15, 5], [64.2, 0.15, 5], [91.0, 0.7, 2.2]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { hero, mira, devState } });
