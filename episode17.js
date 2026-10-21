// Episode 17 — "Home?". Dev tumbles out of the gate beside Jupiter. ECHO brings Mira's capsule through after him.
// Anaya's voice note, Mars, the belt, Earth: blue and alive. Then the Moon: gone. A debris ring round a Hollow hive
// core, and a red eye that turns toward them. ECHO: "AND THEY FOUND MY SHIP."
import { THREE, SET, tag, hash2, PI, Q, pulse, glow, lerpAng,
  loadEpisode, makeStage, makeHud, postFx, run, aim } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeGate } from './engine/props.js';
import { makeCapsule, makeGasGiant, makeRockPlanet, makeAsteroids, makeEarth, makeMoon, makeHollowShip, makeCockpit } from './engine/space.js';

const EP = await loadEpisode('17');
const { engine, scene, camera, world } = makeStage({ fog: [0x000000, 1e4, 2e4] });
const wp = o => o.getWorldPosition(new THREE.Vector3());
const stone = new THREE.MeshStandardMaterial({ color: 0x4a4458, roughness: 0.6, metalness: 0.4, flatShading: true });

// ---- JUPITER + the gate (origin) ----
const jup = new THREE.Group(); world.add(jup);
const giant = makeGasGiant({ r: 900, seed: 2, emissive: 0.1 }); giant.position.set(-700, -380, -2400); giant.rotation.z = 0.12; jup.add(giant);
const gate = makeGate(26, stone, [0.4, 1.6, 2.2]); jup.add(gate.g);
const jSun = new THREE.DirectionalLight(0xfff0e0, 2.6); jSun.position.set(600, 300, 500); jup.add(jSun, jSun.target, new THREE.AmbientLight(0x404858, 0.8));
// ---- MARS + the belt (far away) ----
const MARS = v3(0, 0, -40000);
const mars = new THREE.Group(); mars.position.copy(MARS); world.add(mars);
const marsP = makeRockPlanet({ r: 260, color: 0xb0583a, detail: 6, rough: 0.03, seed: 4 }); marsP.position.set(-180, -60, -420); mars.add(marsP);
const belt = makeAsteroids({ n: 420, spread: [500, 120, 900], size: [0.8, 12], seed: 9, color: 0x6a625c }); belt.mesh.position.set(0, 0, 400); mars.add(belt.mesh);
const mSun = new THREE.DirectionalLight(0xfff0e0, 2.8); mSun.position.set(500, 200, 300); mSun.target.position.set(0, 0, 0); mars.add(mSun, mSun.target, new THREE.AmbientLight(0x403838, 0.6));
// ---- EARTH + what is left of the Moon ----
const E0 = v3(40000, 0, 0);
const home = new THREE.Group(); home.position.copy(E0); world.add(home);
const earth = makeEarth({ r: 60, lightDir: [0.7, 0.25, 0.8] }); earth.g.rotation.y = 1.2; home.add(earth.g);
const MOONP = v3(170, 24, -60);
const moon = makeMoon({ r: 16, seed: 7 }); moon.g.position.copy(MOONP); home.add(moon.g); moon.eye.position.set(0, 0, 16 * 0.44);
const eSun = new THREE.DirectionalLight(0xfff0e0, 2.6); eSun.position.set(700, 250, 800); home.add(eSun, eSun.target, new THREE.AmbientLight(0x303848, 0.6));
const redL = new THREE.PointLight(0xff3040, 0, 300, 1.2); redL.position.copy(MOONP); home.add(redL);
const RAID = [...Array(14)].map((_, i) => { const r = makeHollowShip(0.35); home.add(r.g); return { r, a: hash2(i, 1) * PI * 2, rr: 26 + hash2(i, 2) * 22, y: (hash2(i, 3) - 0.5) * 14, w: 0.15 + hash2(i, 4) * 0.2 }; });
// ---- capsule + cockpit ----
const ship = makeCapsule(); world.add(ship.g);
const CK = v3(-9000, 0, 0);
const ck = makeCockpit(); ck.g.position.copy(CK); world.add(ck.g);
const winGlow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), glow(0.3, 0.6, 1.4)); winGlow.position.copy(CK).add(v3(0, 1.35, -1.54)); world.add(tag(winGlow, SET.PLANET));
const faceFill = new THREE.PointLight(0xffc8b8, 3, 5, 1.2); world.add(faceFill);
const sparks = makePool(400, new THREE.IcosahedronGeometry(1, 0), glow(1.8, 1.4, 2.4), SET.ENERGY); world.add(sparks.mesh);

// ---- hero + Pixel ----
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 6;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const T_CK = 19.0, T_GO = 35.0, T_MARS = 40.0, T_EARTH = 46.0;
const devP = t => v3(0.4 * Math.sin(t * 0.3), 0.3 * Math.sin(t * 0.21), 2 + 2.2 * Math.min(t, 16));
function devState(t) {
  const S = { loc: 'J', p: devP(t), rotY: PI, rx: 0, rz: 0, walk: 0, run: 0, phase: 0, crouch: 0.2, lookUp: 0.1, headYaw: 0, armRo: { x: -0.4, z: -0.9, ex: -0.4, w: 1 }, armLo: { x: -0.4, z: 0.9, ex: -0.4, w: 1 }, lean: 0, jet: 0 };
  const spin = Math.max(0, 1 - t / 7);
  S.rx = 3.2 * (1 - (1 - spin) ** 0) * 0 + Math.sin(t * 1.1) * 0.6 * spin + (1 - spin) * 0.1 * Math.sin(t * 0.5); S.rz = t * 1.4 * spin * spin;
  S.rotY = PI + 2.4 * spin;
  if (t > 7) { S.headYaw = 0.5 * Math.sin(t * 0.6); S.lookUp = 0.3; }
  if (t > 11) { S.rotY = lerpAng(S.rotY, PI * 2, Q(11, 12.4, t)); S.headYaw = 0.3 * (1 - Q(13, 14, t)); }       // turns round to the capsule
  if (t > 15.6) { const k = Q(15.6, T_CK - 0.6, t); S.p = devP(t).lerp(capP(15.6).add(v3(-1.6, 0.2, 0.4)), k); S.armRo = { x: -1.6, z: -0.3, ex: -0.3, w: Q(16, 17, t) }; S.rotY = lerpAng(PI * 2, -PI / 2, Q(15.6, 16.6, t)); }
  if (t >= T_CK && t < T_GO + 0 || (t >= 50.8 && t < 59) || (t >= 61 && t < 68)) {
    S.loc = 'C'; S.p = v3(0, 0.2, 0.1); S.rotY = PI; S.rx = 0; S.rz = 0; S.crouch = 1; S.lean = -0.25; S.lookUp = 0.15;
    S.armRo = { x: -1.1, z: -0.1, ex: -0.9, w: 1 }; S.armLo = { x: -1.1, z: 0.1, ex: -0.9, w: 1 };
    if (t < 30) { S.lookUp = -0.3 * Q(19.6, 20.4, t) * (1 - Q(29, 30, t)); S.armLo = { x: -1.3, z: 0.3, ex: -1.4, w: Q(19.2, 20, t) * (1 - Q(29, 30, t)) }; }
    if (t > 50) S.lookUp = 0.35;
    if (t > 61) { S.headYaw = 0.6 * Math.sin((t - 61) * 1.3) * Q(61.4, 62.4, t); S.lookUp = 0.2; }
  } else if (t >= T_CK) S.loc = 'X';                                     // inside the capsule, seen from outside
  return S;
}
const capP = t => {                                                      // capsule near Jupiter: out of the gate to beside Dev
  if (t < 10.5) return v3(0, 0, -8);
  const k = Q(10.5, 15.6, t), a = v3(0, 0, -4), b = devP(15.6).add(v3(2.6, 0, -1.2));
  return a.lerp(b, 1 - (1 - k) ** 2);
};
window.AUDIO_META = {};
const look = new THREE.Vector3();
const VISOR = [[19.6, 30.0, 'VOICE NOTE  ▸ ANAYA\n▶ 0:06  ▮▮▮▮▮▮▮▮▮▯'], [35.4, 46.0, 'COURSE  ▸ EARTH\nPILOT  ▸ ECHO'], [47.0, 59.0, 'EARTH  ▸ 384,000 KM\nSIGNAL  ▸ HOME'], [61.4, 72.0, 'LUNA  ▸ NO SIGNAL\nLUNA  ▸ NO SIGNAL\nLUNA  ▸ ---']];
const hud = makeHud(EP, { visor: VISOR });

function update(t) {
  const S = devState(t);
  // which set is on screen
  const ckShot = S.loc === 'C';
  const set = ckShot ? 'C' : t < T_GO ? 'J' : t < T_EARTH ? 'M' : 'E';
  jup.visible = set === 'J'; mars.visible = set === 'M'; home.visible = set === 'E'; ck.g.visible = winGlow.visible = set === 'C';
  // capsule
  let cp, burn = 0, cdir = v3(0, 0, 1);
  if (t < T_GO) cp = capP(Math.min(t, 15.6));
  else if (t < T_MARS) { const k = Q(T_GO, T_MARS, t); cp = v3(0, 0, -40 - 260 * k * k); cdir = v3(0, 0, -1); burn = 1.4; }
  else if (t < T_EARTH) { const k = Q(T_MARS, T_EARTH, t); cp = MARS.clone().add(v3(lerp(-40, 60, k), lerp(10, -6, k), lerp(700, -60, k))); cdir = v3(0.15, -0.02, -1); burn = 1.2; }
  else { const k = Q(T_EARTH, 100, t); cp = E0.clone().add(v3(lerp(-30, 20, k), lerp(20, 12, k), lerp(330, 210, k))); cdir = v3(0.05, -0.03, -1); burn = 0.3; }
  if (t < T_GO) cp = jup.position.clone().add(cp);
  ship.g.position.copy(cp); ship.g.lookAt(cp.clone().add(cdir)); ship.set(t, t > 10.5 && t < 15.8 ? 0.6 * (1 - Q(15, 15.8, t)) : burn); ship.g.visible = set !== 'C' && t > 10.4;
  // gate opens twice: Dev, then the capsule
  gate.set(t, Math.max(1 - Q(0.5, 3.0, t), Q(10.0, 10.8, t) * (1 - Q(13, 15, t))));
  // hero
  poseHero(hero, S, t);
  hero.root.visible = S.loc !== 'X' && set !== 'M' && set !== 'E';
  if (S.loc === 'C') hero.root.position.copy(CK).add(S.p); else hero.root.position.copy(S.p);
  hero.root.rotation.set(S.rx, S.rotY, S.rz, 'YXZ');
  hero.handGun.visible = false; hero.gun.visible = true;
  hero.root.updateMatrixWorld(true);
  const head = wp(hero.head);
  { const s2 = wp(hero.shoulderL); pixel.g.visible = hero.root.visible; pixel.g.position.copy(s2).add(v3(0, 0.03, 0)); pixel.g.rotation.set(0, S.rotY + 0.3, 0); pixel.g.scale.setScalar(0.5);
    poseSkitterling(pixel, { curl: S.loc === 'C' ? 0.2 : 0.8, eyeOpen: 1, look: Math.sin(t) * 0.4 + (t > 47 && t < 55 ? -0.6 : 0), t }); }
  faceFill.position.copy(head).add(v3(0, 0.3, -0.7)); faceFill.intensity = S.loc === 'C' ? 1.2 : 0; hero.headLight.intensity = S.loc === 'C' ? 0 : 6;
  ck.set(t); ck.light.intensity = 1.6; ck.screen.intensity = S.loc === 'C' ? (t < 30 ? 2.5 * Q(19.4, 20, t) : 0) + (t > 61 ? 2 * (0.5 + 0.5 * Math.sin(t * 8)) : 0) : 0;
  ck.red.intensity = t > 61 && S.loc === 'C' ? 2.5 * (0.5 + 0.5 * Math.sin(t * 6)) : 0;
  winGlow.material.color.setRGB(...(t > 46 ? [0.3, 0.8, 1.8] : t > 35 ? [1.2, 0.5, 0.3] : [1.4, 1.0, 0.6])).multiplyScalar(t > 61 ? 0.5 + 0.5 * pulse(t, 64, 3) : 1);
  // Earth + the broken Moon
  earth.U.uT.value = t; earth.g.rotation.y = 1.2 + t * 0.004;
  moon.set(t, 1); moon.eye.scale.setScalar((0.5 + 0.8 * Q(78, 84, t)) * (1 + 0.15 * Math.sin(t * 3)));
  moon.core.lookAt(ship.g.position);
  redL.intensity = 60 * Q(76, 84, t) + 600 * pulse(t, 86, 1.4);
  RAID.forEach((R, i) => { const a = R.a + t * R.w, p = MOONP.clone().add(v3(Math.cos(a) * R.rr, R.y, Math.sin(a) * R.rr)); R.r.g.position.copy(p); R.r.g.lookAt(MOONP.clone().add(v3(Math.cos(a + 0.2) * R.rr, R.y, Math.sin(a + 0.2) * R.rr))); R.r.g.visible = t > 70; });
  // sparks: capsule exhaust trail in the montage
  const SP = []; if (set === 'M' || set === 'J' && t > T_GO - 0.1) for (let k = 0; k < 120; k++) { const u = ((t * 3 + hash2(k, 1)) % 1); SP.push({ x: cp.x + (hash2(k, 2) - 0.5) * 2 * u, y: cp.y + (hash2(k, 3) - 0.5) * 2 * u, z: cp.z - cdir.z * (4 + u * 30), s: 0.25 * (1 - u) }); }
  sparks.set(SP);
  // ---- cameras ----
  let pos = v3(), fov = 56;
  if (t < 3.6) { pos = v3(1.2, 0.6, 2 + 2.2 * t + 4.5); look.copy(hero.root.position); fov = 50; }
  else if (t < 7.0) { pos = hero.root.position.clone().add(v3(-3, 1.2, 9)); look.copy(giant.position).lerp(hero.root.position, 0.6); fov = 60; }
  else if (t < 10.4) { pos = head.clone().add(v3(0.25, 0.05, -0.85)); look.copy(head); fov = 42; }
  else if (t < 16.2) { pos = hero.root.position.clone().add(v3(3.5, 1.6, 5)); look.copy(ship.g.position).lerp(hero.root.position, 0.4); fov = 58; }
  else if (t < T_CK) { pos = ship.g.position.clone().add(v3(-6, 2, 6)); look.copy(ship.g.position).lerp(hero.root.position, 0.5); fov = 54; }
  else if (t < 25.4) { pos = head.clone().add(v3(0.45, 0.0, -1.0)); look.copy(head).add(v3(0, -0.1, 0)); fov = 42; }
  else if (t < T_GO) { const k = Q(25.4, T_GO, t); pos = CK.clone().add(v3(-0.5 + 0.4 * k, 1.5, 1.3)); look.copy(CK).add(v3(0, 1.2, -1.5)); fov = 58; }
  else if (t < T_MARS) { pos = jup.position.clone().add(v3(14, 6, 10)); look.copy(ship.g.position); fov = 56; }
  else if (t < T_EARTH) { pos = ship.g.position.clone().add(v3(8, 3, 22)); look.copy(ship.g.position).lerp(MARS.clone().add(marsP.position), 0.35); fov = 60; }
  else if (t < 50.8) { const k = Q(T_EARTH, 50.8, t); pos = ship.g.position.clone().add(v3(6 - 3 * k, 3, 18 - 4 * k)); look.copy(ship.g.position).lerp(E0, 0.55); fov = 60; }
  else if (t < 55.0) { pos = head.clone().add(v3(-0.45, 0.02, -1.0)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 59.0) { pos = CK.clone().add(v3(0.4, 1.5, 1.3)); look.copy(CK).add(v3(0, 1.3, -1.5)); fov = 56; }
  else if (t < 61.0) { pos = E0.clone().add(v3(-10, 30, 300)); look.copy(E0); fov = 50; }
  else if (t < 68.0) { pos = head.clone().add(v3(0.45, 0.04, -1.0)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 76.8) { const k = Q(68, 76.8, t); pos = ship.g.position.clone().add(v3(-4, 4, 12)); look.copy(E0).lerp(E0.clone().add(MOONP), 0.3 + 0.7 * k * k * (3 - 2 * k)); fov = lerp(58, 30, Q(70, 76, t)); }
  else if (t < 86) { const k = Q(76.8, 86, t), mp = E0.clone().add(MOONP); pos = mp.clone().add(v3(30 - 16 * k, 8, 110 - 30 * k)); look.copy(mp); fov = 52; }
  else if (t < 93.6) { pos = ship.g.position.clone().add(v3(3, 2, 9)); look.copy(E0.clone().add(MOONP)); fov = 58; }
  else { const mp = E0.clone().add(MOONP); pos = mp.clone().add(v3(10, 4, 70)); look.copy(mp); fov = 50; }
  aim(camera, pos, look, null, fov);
  postFx(engine, EP, t, { exposure: set === 'C' ? 2.5 : 2.4, glitch: t > 88.4 && t < 89.0 ? 0.35 : 0, flashes: [[0.3, 0.6, 2.5], [10.4, 0.3, 3], [86.0, 0.6, 2]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { hero, devState } });
