// Episode 19 — "Earthfall". ECHO, in its ship, brings Dev to Earth with the Moon falling and the Hollow behind.
// In the ship's core Dev plays Anaya's voice note to it. The biggest fragment heads for the night side; ECHO puts
// the ship in the way and holds it with a shield. Then it loads Dev into the capsule: "I WILL TAKE THEM WITH ME."
import { THREE, SET, tag, hash2, PI, Q, pulse, glow, lerpAng,
  loadEpisode, makeStage, makeHud, postFx, run, aim } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { glyphMaterial, makeKey, makeHoloPlanet } from './engine/props.js';
import { makeCapsule, makeEarth, makeMoon, makeHollowShip, makeVaelorShip, makeRockPlanet, makeCockpit } from './engine/space.js';

const EP = await loadEpisode('19');
const { engine, scene, camera, world } = makeStage({ fog: [0x000000, 1e5, 2e5] });
const wp = o => o.getWorldPosition(new THREE.Vector3());
const CYAN = [0.3, 1.5, 1.8], RED = [2.2, 0.2, 0.3];
const mix3 = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));

// =====================================================================
// SPACE: night-side Earth, the fragments, the big one, ECHO's ship + shield, the armada, the capsule
// =====================================================================
const space = new THREE.Group(); world.add(space);
const earth = makeEarth({ r: 60, lightDir: [-0.9, 0.25, 0.25], cities: 1.6 }); earth.g.rotation.y = 0.4; space.add(earth.g);
const MOONP = v3(170, 24, -60);
const moon = makeMoon({ r: 16, seed: 7 }); moon.g.position.copy(MOONP); space.add(moon.g);
const sun = new THREE.DirectionalLight(0xfff0e0, 2.2); sun.position.set(-800, 200, 200); space.add(sun, sun.target, new THREE.AmbientLight(0x303848, 0.7));
const NF = 40, FR = [...Array(NF)].map((_, i) => { const a = hash2(i, 1) * 1.4 - 0.2, b = (hash2(i, 2) - 0.5) * 1.1;
  const to = v3(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)).multiplyScalar(59.5);
  return { from: to.clone().multiplyScalar(2.4).add(v3(60, 30, 0)), to, t0: -4 + hash2(i, 4) * 60, dur: 5 + hash2(i, 5) * 4, s: 0.5 + hash2(i, 6) * 1.6 }; });
const frags = makePool(NF, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x8a8894, roughness: 1, flatShading: true }), SET.ROCK); space.add(frags.mesh);
const fire = makePool(NF * 8 + 200, new THREE.IcosahedronGeometry(1, 0), glow(2.4, 1.0, 0.35), SET.ENERGY); space.add(fire.mesh);
const BIG_A = v3(110, 60, 190), BIG_HIT = v3(36, 20, 96), T_HIT = 70.0;
const big = makeRockPlanet({ r: 7, color: 0x8a8894, detail: 2, rough: 0.25, seed: 3, set: SET.ROCK }); space.add(big);
const vship = makeVaelorShip(0.5); space.add(vship.g);
const SHIELD = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16, 0, PI * 2, 0, PI * 0.42), glow(0.3, 1.5, 1.9, { transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, wireframe: true }));
SHIELD.rotation.x = PI / 2; const shieldG = new THREE.Group(); shieldG.add(tag(SHIELD, SET.ENERGY)); space.add(shieldG);
const shieldL = new THREE.PointLight(0x66e8ff, 0, 120, 1.2); space.add(shieldL);
const NA = 36, ARM = [...Array(NA)].map((_, i) => { const r = makeHollowShip(0.4); space.add(r.g); return { r, o: v3((hash2(i, 1) - 0.5) * 90, (hash2(i, 2) - 0.5) * 50, (hash2(i, 3) - 0.5) * 60), d: hash2(i, 4) }; });
const capsule = makeCapsule(); space.add(capsule.g);

// =====================================================================
// THE CORE inside ECHO's ship (its own set)
// =====================================================================
const CR = v3(-9000, 0, 0);
const core = new THREE.Group(); core.position.copy(CR); world.add(core);
const wallG = glyphMaterial({ color: 0x24223a, glow: 0x55e6ff, seed: 21, repeat: [6, 2] }); wallG.side = THREE.BackSide;
const wall = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 12, 24, 1, true), wallG); wall.position.y = 5; core.add(tag(wall, SET.METAL));
const floorG = glyphMaterial({ color: 0x2a2840, glow: 0x55e6ff, seed: 22, repeat: [3, 3] });
const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), floorG); floor.rotation.x = -PI / 2; floor.receiveShadow = true; core.add(tag(floor, SET.METAL));
const ORB = v3(0, 2.7, -3.2);
const orb = makeKey(0, 5); orb.g.position.copy(ORB); core.add(orb.g);
const orbL = new THREE.PointLight(0xff3040, 14, 14, 1.2); orbL.position.copy(ORB); core.add(orbL);
const holo = makeHoloPlanet(0.6, [0.4, 1.5, 2.0], 2); holo.g.position.copy(ORB).add(v3(-1.6, -0.6, 1.4)); core.add(holo.g);
const holoDots = makePool(60, new THREE.IcosahedronGeometry(1, 0), glow(2.4, 0.2, 0.3), SET.ENERGY); core.add(holoDots.mesh);
core.add(new THREE.HemisphereLight(0x5a6ab0, 0x10101c, 1.0));
const faceFill = new THREE.PointLight(0xffc8b8, 1.4, 4, 1.2); world.add(faceFill);
const CK = v3(9000, 0, 0);
const ck = makeCockpit(); ck.g.position.copy(CK); world.add(ck.g);

// =====================================================================
// HERO + PIXEL
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 0;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const inCore = t => (t >= 8 && t < 21) || (t >= 24.6 && t < 31) || (t >= 34 && t < 48.6) || (t >= 52.6 && t < 57) || (t >= 62.4 && t < 66.2);
const inCk = t => (t >= 86 && t < 90) || t >= 96.6;
function devState(t) {
  const S = { p: v3(0.2, 0, 0.6), rotY: PI, rx: 0, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0.35, headYaw: 0, armRo: null, armLo: null, lean: 0 };
  if (t < 13) { const up = Q(10.6, 12.8, t); S.rx = -PI / 2 * (1 - up); S.p.y = 0.2 * (1 - up); S.crouch = 0.5 * Math.sin(up * PI); S.lookUp = 0.2; S.armLo = { x: -0.4, z: 0.5, ex: -0.6, w: 1 - up }; }
  if (t > 13.4 && t < 17) S.headYaw = 0.15 * Math.sin(t * 3);
  if (t > 25 && t < 29) { S.lean = 0.1; S.armRo = { x: -0.9, z: -0.2, ex: -0.5, w: Q(25, 25.6, t) * (1 - Q(28.2, 28.8, t)) }; }
  if (t > 35 && t < 48.6) { const w = Q(36.4, 37.4, t) * (1 - Q(44.6, 45.6, t)); S.armLo = { x: -1.3, z: 0.3, ex: -1.4, w }; S.lookUp = 0.35 - 0.6 * w + 0.6 * Q(45, 46, t); }
  if (t > 52 && t < 57) { S.lookUp = 0.4; S.headYaw = 0.1; S.lean = 0.12; }
  if (t > 62) { S.lookUp = 0.45; }
  if (inCk(t)) { S.p = v3(0, 0.2, 0.1); S.crouch = 1; S.lean = -0.25; S.lookUp = 0.15; S.armRo = { x: -1.5, z: -0.6, ex: -0.4, w: 1 }; S.armLo = { x: -1.1, z: 0.1, ex: -0.9, w: 1 }; S.headYaw = t > 96.6 ? -0.3 : 0.4 * Math.sin(t * 2); }
  return S;
}
window.AUDIO_META = {};
const look = new THREE.Vector3();
const VISOR = [[38.0, 45.0, 'VOICE NOTE  ▸ ANAYA\n▶ 0:06  ▮▮▮▮▮▮▮▮▮▯'], [49.0, 70.0, 'IMPACT  ▸ NIGHT SIDE\nPOP.  ▸ 21,000,000'], [76.0, 86.0, 'CONTACTS  ▸ 36\nSHIELD  ▸ 12%']];
const hud = makeHud(EP, { visor: VISOR });

// ECHO's ship: arrives, waits, moves into the big fragment's path, holds, turns to the armada
function shipState(t) {
  if (t < 8) { const k = Q(-1, 8, t); return { p: v3(150, 50, 220).lerp(v3(56, 24, 118), 1 - (1 - k) ** 2), look: v3(0, 0, 0) }; }
  if (t < 62) return { p: v3(56, 24, 118), look: v3(0, 0, 0) };
  if (t < 70) { const k = Q(62, 67.6, t); return { p: v3(56, 24, 118).lerp(BIG_HIT.clone().sub(v3(4, 2, 10)), k * k * (3 - 2 * k)), look: BIG_HIT.clone().add(v3(0, 4, 30)) }; }
  if (t < 80) return { p: BIG_HIT.clone().sub(v3(4, 2, 10)).add(v3(0, 0, -3 * pulse(t, T_HIT, 1.2))), look: BIG_HIT.clone().add(v3(0, 4, 30)) };
  const k = Q(80, 100, t); return { p: BIG_HIT.clone().sub(v3(4, 2, 10)).lerp(v3(90, 30, 60), k * k), look: MOONP };
}
const bigAt = t => BIG_A.clone().lerp(BIG_HIT, Q(44, T_HIT, t) ** 1.3);

function update(t) {
  const S = devState(t), C = inCore(t), K = inCk(t);
  space.visible = !C && !K; core.visible = C; ck.g.visible = K;
  // ---- space ----
  earth.U.uT.value = t; earth.U.uRed.value = 0.12 * (1 - Q(72, 80, t)); earth.U.uShield.value = 0.5 * pulse(t, T_HIT, 2.5);
  moon.set(t, 2.6); moon.core.visible = false;
  const FA = [], FI = [];
  FR.forEach((f, i) => { const k = (t - f.t0) / f.dur; if (k < 0 || k > 1) return; const p = f.from.clone().lerp(f.to, k * k); FA.push({ x: p.x, y: p.y, z: p.z, s: f.s, rx: t + i, ry: i });
    const hot = p.length() < 80 ? 1 : 0.35, back = f.from.clone().sub(f.to).normalize(); for (let j = 0; j < 8; j++) { const q = p.clone().addScaledVector(back, j * f.s * (1.2 + 2 * hot)); FI.push({ x: q.x, y: q.y, z: q.z, s: f.s * (1.1 - j * 0.12) * hot }); } });
  // the big one: burning, then shattering on the shield
  const bp = bigAt(t); big.position.copy(bp); big.rotation.set(t * 0.3, t * 0.2, 0); big.visible = t < T_HIT + 0.05;
  if (t > 44 && t < T_HIT) { const back = BIG_A.clone().sub(BIG_HIT).normalize(); for (let j = 0; j < 26; j++) { const q = bp.clone().addScaledVector(back, 6 + j * 2.2); FI.push({ x: q.x + (hash2(j, 1) - 0.5) * 2, y: q.y + (hash2(j, 2) - 0.5) * 2, z: q.z, s: 5 * (1 - j / 26) * Q(44, 52, t) }); } }
  const dh = t - T_HIT; if (dh > 0 && dh < 6) for (let k = 0; k < 160; k++) { const a = hash2(k, 1) * PI * 2, b = (hash2(k, 2) - 0.5) * 2, sp = 6 + hash2(k, 3) * 16; FI.push({ x: BIG_HIT.x + Math.cos(a) * sp * dh, y: BIG_HIT.y + b * sp * dh * 0.6, z: BIG_HIT.z + Math.sin(a) * sp * dh * 0.5 + 6 * dh, s: 1.4 * (1 - dh / 6) }); }
  frags.set(FA); fire.set(FI);
  // ECHO's ship + shield: red until the voice note, cyan after
  const sh = shipState(t), cyanK = Q(45, 47, t);
  vship.g.position.copy(sh.p); vship.g.lookAt(sh.look); vship.bandMat.color.setRGB(...mix3(RED, CYAN, cyanK)).multiplyScalar(1 + 0.8 * pulse(t, T_HIT, 1.0) * Math.sin(t * 40)); vship.flame.visible = t < 8 || (t > 62 && t < 68) || t > 80;
  const shOn = Q(65, 67.4, t) * (1 - Q(78, 80, t));
  shieldG.visible = shOn > 0.01; shieldG.position.copy(sh.p).add(BIG_HIT.clone().sub(sh.p).normalize().multiplyScalar(6)); shieldG.lookAt(BIG_HIT.clone().add(BIG_HIT.clone().sub(sh.p).normalize().multiplyScalar(30)));
  shieldG.scale.setScalar(shOn * (1 + 0.2 * pulse(t, T_HIT, 1.2))); SHIELD.material.opacity = 0.25 + 0.6 * pulse(t, T_HIT, 2.0) * (0.5 + 0.5 * Math.sin(t * 50));
  shieldL.position.copy(shieldG.position); shieldL.intensity = 30 * shOn + 400 * pulse(t, T_HIT, 1.0);
  // armada: shadows round the Moon, then closing on ECHO's ship
  ARM.forEach((A, i) => { const k = Q(26 + A.d * 8, 96, t), base = MOONP.clone().add(A.o), tgt = sh.p.clone().add(A.o.clone().multiplyScalar(0.4)).add(v3(30, 10, -20));
    const p = base.lerp(tgt, k * 0.85); A.r.g.position.copy(p); A.r.g.lookAt(sh.p); A.r.g.visible = t > 26; A.r.core.material.color.setRGB(2.4, 0.15, 0.2); });
  // capsule ejects from the ship's belly and burns for Earth
  capsule.g.visible = t > 90; if (t > 90) { const k = Q(90, 100, t), p0 = shipState(90).p.clone().add(v3(0, -7, 0)), p1 = p0.clone().lerp(v3(0, 0, 0), 0.35); capsule.g.position.copy(p0).lerp(p1, k); capsule.g.lookAt(v3(0, 0, 0)); capsule.set(t, Q(91, 92, t)); }
  // ---- core ----
  orb.spin(t); orb.g.position.copy(ORB).add(v3(0, 0.12 * Math.sin(t * 1.3), 0));
  const flick = t > 38.6 && t < 45 ? (Math.sin(t * 23) > 0.2 ? 1 : 0) * 0.6 : 0;
  orb.crystal.material.color.setRGB(...mix3(RED, CYAN, Math.min(1, cyanK + flick))); orbL.color.setRGB(...mix3(RED, CYAN, Math.min(1, cyanK + flick)).map(c => c / 2.2));
  orbL.intensity = 10 + 6 * Math.sin(t * 2) + 20 * pulse(t, 45.4, 1.6);
  wallG.emissive.setRGB(...mix3([1, 0.2, 0.3], [0.33, 0.9, 1], cyanK)); floorG.emissive.copy(wallG.emissive); wallG.emissiveIntensity = floorG.emissiveIntensity = 0.3 + 0.3 * Math.sin(t * 1.7) + 0.8 * pulse(t, 45.4, 1.6);
  holo.g.visible = t > 21 && t < 31; holo.U.uT.value = t;
  holoDots.set(t > 21 && t < 31 ? [...Array(60)].map((_, i) => { const k = clamp01((t - 21 - hash2(i, 1) * 3) / 9), a = hash2(i, 2) * PI * 2; const c = holo.g.position; return { x: c.x + Math.cos(a) * (2.2 - 1.4 * k), y: c.y + (hash2(i, 3) - 0.5) * 0.8, z: c.z + Math.sin(a) * (2.2 - 1.4 * k), s: 0.03 }; }).map(d => ({ ...d, x: d.x + CR.x, y: d.y + CR.y, z: d.z + CR.z })) : []);
  holoDots.mesh.position.copy(CR).multiplyScalar(-1);
  ck.set(t); ck.light.intensity = 1.6; ck.red.intensity = 2 * (0.5 + 0.5 * Math.sin(t * 6));
  // ---- hero ----
  poseHero(hero, S, t);
  hero.root.visible = C || K;
  hero.root.position.copy(S.p).add(K ? CK : CR); hero.root.rotation.set(S.rx, S.rotY, 0, 'YXZ');
  hero.handGun.visible = false; hero.gun.visible = true;
  hero.cyanMat.color.setRGB(...mix3(RED, CYAN, cyanK));
  hero.root.updateMatrixWorld(true);
  const head = wp(hero.head);
  faceFill.position.copy(head).add(v3(0, 0.3, -0.8)); faceFill.intensity = C || K ? 1.2 : 0;
  { const s2 = wp(hero.shoulderL); pixel.g.visible = hero.root.visible; pixel.g.position.copy(s2).add(v3(0, 0.03, 0)); pixel.g.rotation.set(0, S.rotY + 0.3, 0); pixel.g.scale.setScalar(0.5);
    if (t < 12.4 && C) { pixel.g.position.copy(CR).add(v3(0.9, 0.15, 0.2)); pixel.g.scale.setScalar(0.9); pixel.g.rotation.set(0, -PI / 2, 0); }
    poseSkitterling(pixel, { curl: 0.3, eyeOpen: 1, look: Math.sin(t) * 0.4, t }); }
  // ---- cameras ----
  let pos = v3(), fov = 56;
  const vp = vship.g.position;
  if (t < 4) { pos = v3(48, 30, 150); look.set(10, 0, 0); fov = 56; }
  else if (t < 8) { pos = vp.clone().add(v3(-14, 6, 30)); look.copy(vp).lerp(v3(0, 0, 0), 0.4); fov = 58; }
  else if (t < 13.4) { const k = Q(8, 13.4, t); pos = CR.clone().add(v3(2.2, 2.2 - 0.6 * k, 2.4)); look.copy(hero.root.position).add(v3(0, 0.5 * k, 0)); fov = 56; }
  else if (t < 17) { pos = head.clone().add(v3(0.45, 0.05, -0.8)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 21) { pos = CR.clone().add(v3(1.6, 1.6, 3.6)); look.copy(CR).add(ORB).lerp(head, 0.3); fov = 56; }
  else if (t < 24.6) { pos = space.position.clone().add(MOONP).add(v3(-40, 20, 120)); look.copy(MOONP); fov = 54; }
  else if (t < 28.8) { pos = head.clone().add(v3(-0.45, 0.05, -0.8)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 31) { pos = CR.clone().add(v3(-2.2, 1.4, 1.8)); look.copy(holo.g.position).add(CR); fov = 52; }
  else if (t < 34) { pos = vp.clone().add(v3(18, 10, 30)); look.copy(MOONP).lerp(vp, 0.3); fov = 56; }
  else if (t < 39.2) { pos = CR.clone().add(v3(1.4, 1.5, 2.2)); look.copy(head).add(v3(0, -0.3, 0)); fov = 50; }
  else if (t < 45) { pos = head.clone().add(v3(0.4, 0.0, -0.8)); look.copy(head).add(v3(0, -0.1, 0)); fov = 42; }
  else if (t < 48.6) { pos = CR.clone().add(v3(0, 1.4, 3.4)); look.copy(CR).add(ORB); fov = 58; }
  else if (t < 52.6) { pos = bigAt(t).add(v3(14, 6, 30)); look.copy(bigAt(t)).lerp(v3(0, 0, 0), 0.6); fov = 58; }
  else if (t < 57) { pos = head.clone().add(v3(0.45, 0.05, -0.8)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 62.4) { pos = v3(60, 46, 170); look.copy(bigAt(t)).lerp(v3(0, 0, 0), 0.5); fov = 52; }
  else if (t < 66.2) { pos = CR.clone().add(v3(-1.6, 1.0, 2.6)); look.copy(CR).add(ORB); fov = 58; }
  else if (t < 72) { pos = vp.clone().add(v3(-26, 8, -20)); look.copy(BIG_HIT); fov = 60; }
  else if (t < 76) { pos = v3(-20, 30, 170); look.copy(vp).lerp(v3(0, 0, 0), 0.4); fov = 54; }
  else if (t < 81.6) { pos = vp.clone().add(v3(-20, 6, 36)); look.copy(vp).lerp(MOONP, 0.3); fov = 58; }
  else if (t < 86) { pos = vp.clone().add(v3(12, 4, 22)); look.copy(vp); fov = 56; }
  else if (t < 90) { pos = head.clone().add(v3(0.45, 0.04, -0.85)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 96.6) { const k = Q(90, 96.6, t); const cpp = capsule.g.position; pos = v3(26, 4, 112); look.copy(cpp).lerp(vp, 0.25); fov = 58 - 10 * k; }
  else { pos = head.clone().add(v3(0.45, 0.04, -0.85)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  aim(camera, pos, look, null, fov);
  postFx(engine, EP, t, { exposure: C || K ? 2.6 : 2.4, glitch: (t > 38.6 && t < 45 ? 0.12 : 0) + (t > 45 && t < 45.8 ? 0.3 : 0), flashes: [[45.4, 0.3, 3], [T_HIT, 0.9, 1.6], [90.0, 0.2, 4]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { hero, devState } });
