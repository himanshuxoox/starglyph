// Episode 8 — "The Last Vaelor". A dead ash world, the wreckage of a battle with the Hollow, and the last Vaelor
// knight: "You answered the beacon. Now they know where your world is." Then a warning ECHO won't translate.
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, d2, faceTo, lerpAng, ease,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeDaySky } from './engine/sky.js';
import { glyphMaterial, makePillar, makeGate, makeVaelorKnight, makeHoloPlanet } from './engine/props.js';
import { makeHollowArmy, cloakable } from './engine/hollow.js';

const EP = await loadEpisode('08');
const { engine, scene, camera, world } = makeStage({ fog: [0x5a3a38, 30, 420] });

const SHRINE = P2(0, -26), KN = P2(0.6, -30.2), GATE = P2(0, 6);
function H(x, z) {
  const dunes = (fbm(x * 0.04 + 1, z * 0.04) - 0.5) * 2.4 + Math.sin(x * 0.08 + z * 0.03) * 0.5;
  const flat = smooth(16, 8, d2(P2(x, z), SHRINE));
  const far = Math.hypot(x, z + 20);
  return dunes * (1 - flat * 0.9) + (fbm(x * 0.007, z * 0.007 + 3) - 0.4) * 70 * smooth(80, 300, far);
}
const sky = makeDaySky({ pal: { top: '#120c12', mid: '#3a2428', horizon: '#9a5a48', below: '#2a1c1c' }, suns: [{ dir: [-0.3, 0.14, -1], r: 110, color: [2.6, 0.9, 0.5] }], seed: 8, clouds: 60 });
world.add(sky.group);
const cA = new THREE.Color(0x4a4448), cB = new THREE.Color(0x2a2428);
world.add(makeTerrain({ H, col: (x, z, c) => c.copy(cA).lerp(cB, smooth(0.35, 0.7, fbm(x * 0.06, z * 0.06 + 2))), set: SET.ROCK }));
const stone = new THREE.MeshStandardMaterial({ color: 0x5a5458, roughness: 0.85, metalness: 0.1, flatShading: true });
const gmat = glyphMaterial({ color: 0x4a4448, glow: 0xffb050, seed: 8, repeat: [2, 2] }); gmat.emissiveIntensity = 0.08;
// the shrine: a broken ring of pillars and fallen arches
for (let i = 0; i < 12; i++) {
  const a = i / 12 * PI * 2, r = 9.5, x = SHRINE.x + Math.sin(a) * r, z = SHRINE.z + Math.cos(a) * r;
  if (i === 0) continue;                                                           // entrance
  const broken = hash2(i, 2) < 0.45, h = broken ? 3 + hash2(i, 3) * 4 : 11;
  const p = makePillar(h, 0.75, stone, gmat); p.g.position.set(x, H(x, z) - 0.2, z); p.g.rotation.set((hash2(i, 4) - 0.5) * 0.12, 0, (hash2(i, 5) - 0.5) * 0.12); world.add(p.g);
  if (broken) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, 7, 6), stone); f.position.set(x + Math.sin(a + 1.4) * 3.6, H(x, z) + 0.5, z + Math.cos(a + 1.4) * 3.6); f.rotation.set(PI / 2, a + 0.3, 0); f.castShadow = true; world.add(tag(f, SET.METAL)); }
}
const backP = makePillar(9, 0.9, stone, gmat); backP.g.position.set(KN.x, H(KN.x, KN.z) - 0.2, KN.z - 0.75); world.add(backP.g);
const gate = makeGate(3.0, stone, [1.8, 1.2, 0.5]); gate.g.position.set(GATE.x, H(GATE.x, GATE.z) + 3.3, GATE.z + 1.5); world.add(gate.g);
// battlefield: wrecked Hollow half buried in ash
const WRECK_N = 22, wreck = makeHollowArmy(WRECK_N); world.add(wreck.group);
const WRECKS = [...Array(WRECK_N)].map((_, i) => { const a = hash2(i, 11) * PI * 2, r = 4 + hash2(i, 12) * 22; const x = SHRINE.x + Math.sin(a) * r * 1.2, z = SHRINE.z + 10 + Math.cos(a) * r;
  return { on: true, x, y: H(x, z) - 0.35, z, rotY: hash2(i, 13) * 6.28, rx: -1.1 - hash2(i, 14) * 0.5, rz: (hash2(i, 15) - 0.5) * 1.2, scale: 0.9 + hash2(i, 16) * 0.3, pose: { crawl: 0.5, sprawl: 1, rise: 0.8, t: i, twitch: 0 }, eye: 0 }; });
wreck.set(WRECKS);
// the knight
const KU = { uReveal: { value: 1 }, uGhost: { value: 0 }, uTime: { value: 0 } };
const kArm = cloakable(new THREE.MeshStandardMaterial({ color: 0x9a8e78, roughness: 0.42, metalness: 0.6, flatShading: true }), KU, [2.4, 1.6, 0.6]);
const kCloth = cloakable(new THREE.MeshStandardMaterial({ color: 0x4a3046, roughness: 0.9, flatShading: true }), KU, [2.4, 1.6, 0.6]);
const kRune = cloakable(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 0.4), fog: false }), KU, [2.4, 1.6, 0.6]);
const knight = makeVaelorKnight({ armour: kArm, cloth: kCloth, rune: kRune });
knight.root.position.set(KN.x, H(KN.x, KN.z) + 0.02, KN.z); knight.root.rotation.y = 0.05; world.add(knight.root);
const holo = makeHoloPlanet(0.32, [0.4, 1.4, 2.2], 2); world.add(holo.g);
const redArcs = [...Array(7)].map((_, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.06, 0.006, 4, 40, PI * 0.7), glow(2.2, 0.2, 0.25, { transparent: true })); world.add(tag(m, SET.ENERGY)); return m; });
const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), glow(2.4, 1.6, 0.6)); shard.scale.y = 2.2; world.add(tag(shard, SET.ENERGY));
const ash = makePool(900, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xb8aaa8, roughness: 1, emissive: 0x302020 }), SET.ROCK); world.add(ash.mesh);
const dust = makePool(700, new THREE.IcosahedronGeometry(1, 0), glow(2.4, 1.5, 0.5), SET.ENERGY); world.add(dust.mesh);
const sun = new THREE.DirectionalLight(0xffa070, 2.0); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 300 });
const hemi = new THREE.HemisphereLight(0x8a6a7a, 0x2a1a1a, 1.0); world.add(sun, sun.target, hemi);
const kLight = new THREE.PointLight(0xffb060, 0, 10, 1.6); world.add(kLight);

// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 5;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const STAND = P2(KN.x - 0.1, KN.z + 2.3);
function devState(t) {
  const S = { x: GATE.x, z: GATE.z - 0.8, rotY: PI, walk: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0, scene: 1, air: 0 };
  const path = [P2(GATE.x, GATE.z - 0.8), P2(-1.5, -10), P2(-0.6, -18.5), STAND];
  const k = Q(2.0, 27.6, t), segs = 3, f = k * segs, i = Math.min(segs - 1, Math.floor(f)), kk = f - i;
  S.x = lerp(path[i].x, path[i + 1].x, kk); S.z = lerp(path[i].z, path[i + 1].z, kk); S.rotY = faceTo(path[i], path[i + 1]);
  S.walk = Q(2.0, 2.4, t) * (1 - Q(27.2, 27.6, t)); S.phase = k * 37 / 0.55 * PI;
  S.headYaw = 0.6 * Math.sin((t - 6) * 0.35) * Q(6, 7, t) * (1 - Q(19, 20, t)); S.lookUp = -0.25 * Q(8, 10, t) * (1 - Q(18, 20, t));
  S.scene = t < 8 ? 1 : t < 20 ? 2 : t < 32 ? 3 : t < 46 ? 4 : t < 58 ? 5 : t < 70 ? 6 : t < 84 ? 7 : 8;
  if (t > 27.6) {
    S.rotY = faceTo(STAND, KN); S.crouch = 0.85 * Q(28.6, 30.2, t); S.lookUp = -0.2 + 0.25 * Q(31, 33, t);
    const take = Q(68.2, 69.4, t) * (1 - Q(80, 81, t)); S.armRo = { x: -1.0, z: 0, ex: -0.5, w: take };
    if (t > 80) { S.crouch = 0.85 * (1 - Q(80.6, 82.4, t)); const look = Q(82.4, 83.4, t); S.armRo = { x: -0.95, z: 0.15, ex: -1.25, w: look }; S.lookUp = -0.35 * look; }
  }
  return S;
}
const FOOT = footsteps(devState, EP.duration);
window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false })) };

const look = new THREE.Vector3();
const VISOR = [[1.0, 7.0, 'WORLD  ·  UNKNOWN\nATMOSPHERE  ASH / CO2\nLIFE SIGNS  1'], [86.0, 93.0, 'SHARD TEXT · VAELOR\nLOCAL TRANSLATOR\n(ECHO BYPASSED)']];
const hud = makeHud(EP, { visor: VISOR });

function update(t) {
  const S = devState(t);
  poseHero(hero, S, t);
  hero.root.position.set(S.x, H(S.x, S.z), S.z); hero.root.rotation.set(0, S.rotY, 0); hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = hero.head.getWorldPosition(new THREE.Vector3()), hand = hero.handR.getWorldPosition(new THREE.Vector3());
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  gate.set(t, 1 - Q(1.2, 3.0, t));
  // knight: wakes, lifts its head, speaks, reaches out, dissolves into light
  const lift = Q(29.0, 32.0, t), reach = Q(47, 49, t) * (1 - Q(56, 58, t)) + Q(66.6, 68.4, t) * (1 - Q(71, 72, t));
  knight.pose({ lift, reach, t, breathe: 1 - Q(70, 72, t) });
  const speaking = [[34.4, 38.8], [40, 45.4], [59.6, 63.6]].some(([a0, a1]) => t > a0 && t < a1);
  kRune.color.setRGB(2.2, 1.4, 0.4).multiplyScalar(0.15 + 0.85 * lift * (speaking ? 0.7 + 0.6 * Math.abs(Math.sin(t * 9)) : 0.8) + 0.8 * pulse(t, 29, 1.5));
  const diss = Q(71.4, 79, t); KU.uReveal.value = 1 - diss; KU.uTime.value = t; knight.root.visible = diss < 0.999;
  knight.root.traverse(o => { if (o.isMesh) o.userData.noId = diss > 0.7; });
  kLight.position.set(KN.x, H(KN.x, KN.z) + 1.6, KN.z + 0.6); kLight.intensity = 8 * lift * (1 - diss) + 14 * Q(72, 74, t) * (1 - Q(80, 84, t));
  knight.root.updateMatrixWorld(true);
  const kHand = knight.armR.hand.getWorldPosition(new THREE.Vector3());
  // hologram of Earth with red lines converging on it (from his hand)
  const holoOn = Q(47.4, 48.6, t) * (1 - Q(56.4, 57.6, t));
  holo.g.visible = holoOn > 0.01; holo.g.position.copy(kHand).add(v3(0, 0.45, 0.1)); holo.U.uT.value = t; holo.U.uOn.value = holoOn; holo.g.scale.setScalar(0.6 + 0.4 * holoOn);
  redArcs.forEach((r, i) => { r.visible = holoOn > 0.01 && t > 50 + i * 0.3; r.position.copy(holo.g.position); r.rotation.set(i * 0.7, t * 0.3 + i, i * 1.3); r.material.opacity = holoOn; });
  // the shard: from his hand into Dev's palm, glowing words
  shard.visible = t > 67.6 && t < 100;
  shard.position.copy(t < 69.4 ? kHand.clone().add(v3(0, 0.05, 0.06)) : hand.clone().add(v3(0, 0.08, 0))); shard.rotation.y = t * 1.5;
  shard.material.color.setRGB(2.4, 1.6, 0.6).multiplyScalar(0.6 + 0.3 * Math.sin(t * 4) + 0.5 * Q(85.6, 86.6, t));
  // ash falling + the knight's light drifting away on the wind
  { const L = []; for (let i = 0; i < 900; i++) { const ph = ((hash2(i, 3) * 14 + t * (0.5 + hash2(i, 4) * 0.4)) % 14); L.push({ x: a.x + (hash2(i, 1) - 0.5) * 34 + Math.sin(t * 0.5 + i) * 0.5 + ph * 0.6, y: a.y + 12 - ph, z: a.z + (hash2(i, 2) - 0.5) * 34, s: 0.02 + hash2(i, 5) * 0.035, rx: t + i, ry: i }); } ash.set(L); }
  { const D = []; if (t > 71.4) for (let i = 0; i < 700; i++) { const t0 = 71.4 + hash2(i, 1) * 7.6, dt = t - t0; if (dt < 0 || dt > 9) continue;
    const kp = knight.root.position, y0 = kp.y + 0.3 + hash2(i, 2) * 2.2;
    D.push({ x: kp.x + (hash2(i, 3) - 0.5) * 0.8 + dt * (1.2 + hash2(i, 4)) + Math.sin(dt * 2 + i) * 0.3, y: y0 + dt * (0.5 + hash2(i, 5) * 0.6), z: kp.z + (hash2(i, 6) - 0.5) * 0.8 + dt * 0.6, s: 0.03 * (1 - dt / 9) }); }
    dust.set(D); }
  // pixel peeks from the pocket at the knight
  { const pk = hero.pocket.getWorldPosition(new THREE.Vector3()), peek = Q(36, 37, t) * (1 - Q(58, 59, t)) + Q(76, 77, t) * (1 - Q(84, 85, t));
    pixel.g.position.copy(pk).add(v3(0, -0.06 + 0.08 * peek, 0)); pixel.g.rotation.set(0, S.rotY, 0); pixel.g.scale.setScalar(0.42);
    poseSkitterling(pixel, { curl: 1 - peek, eyeOpen: 1, look: Math.sin(t) * 0.3, t }); pixel.g.visible = peek > 0.05; }
  sun.target.position.copy(a); sun.position.copy(a).add(v3(-60, 30, -200));
  gmat.emissiveIntensity = 0.08 + 0.5 * pulse(t, 29, 0.8) + 0.25 * lift * (1 - diss);

  // ---- cameras ----
  let pos, fov = 58; const kp = knight.head.getWorldPosition(new THREE.Vector3());
  switch (S.scene) {
    case 1: { const k = Q(0, 8, t); pos = a.clone().addScaledVector(fwd, 4.5 + 1.5 * k).addScaledVector(right, 1.6).add(v3(0, 1.5 + 0.8 * k, 0)); look.copy(a).add(v3(0, 1.4, 0)); fov = 62; break; }
    case 2: if (t < 14) { pos = a.clone().addScaledVector(fwd, 3.5).addScaledVector(right, -2.2).add(v3(0, 0.9, 0)); look.copy(a).add(v3(0, 0.8, 0)).addScaledVector(fwd, -2); fov = 62; }
      else { pos = a.clone().addScaledVector(right, -5).addScaledVector(fwd, -2).add(v3(0, 2.6, 0)); look.copy(a).addScaledVector(fwd, 8).add(v3(0, 0.5, 0)); fov = 64; }
      break;
    case 3: if (t < 26) { pos = a.clone().addScaledVector(fwd, -3.2).addScaledVector(right, 0.8).add(v3(0, 1.6, 0)); look.set(KN.x, H(KN.x, KN.z) + 1.0, KN.z); fov = 58; }
      else { pos = v3(KN.x + 2.4, H(KN.x, KN.z) + 1.1, KN.z + 2.8); look.copy(kp).lerp(head, 0.3); fov = 52; }
      break;
    case 4: if (t < 39.4) { pos = kp.clone().add(v3(-1.0, 0.0, 2.3)); look.copy(kp).add(v3(0, -0.2, 0)); fov = 46; }
      else { pos = head.clone().addScaledVector(fwd, -1.2).addScaledVector(right, 0.5).add(v3(0, 0.25, 0)); look.copy(kp).add(v3(0, -0.1, 0)); fov = 50; }
      break;
    case 5: if (t < 52) { const hp = holo.g.position; pos = hp.clone().add(v3(0.9, 0.2, 1.3)); look.copy(hp); fov = 46; }
      else { pos = head.clone().addScaledVector(fwd, 0.95).addScaledVector(right, 0.25).add(v3(0, 0.03, 0)); look.copy(head).add(v3(0, 0.04, 0)); fov = 40; }
      break;
    case 6: if (t < 64) { pos = kp.clone().add(v3(0.9, 0.1, 2.2)); look.copy(kp).add(v3(0, -0.2, 0)); fov = 46; }
      else { pos = head.clone().addScaledVector(fwd, 0.95).addScaledVector(right, -0.25); look.copy(head); fov = 40; }
      break;
    case 7: { const k = Q(70, 84, t); pos = v3(KN.x + 3.2 + 1.5 * k, H(KN.x, KN.z) + 1.4 + 1.2 * k, KN.z + 3.4 + 1.5 * k); look.copy(knight.root.position).add(v3(0.6 * k, 1.0 + 1.5 * k, 0)); fov = 58; break; }
    default: if (t < 93) { pos = hand.clone().add(v3(0.45, 0.75, 0.55)).addScaledVector(fwd, 0.1); look.copy(hand); fov = 48; }
      else { pos = a.clone().addScaledVector(fwd, 3.0).addScaledVector(right, 0.7).add(v3(0, 1.3, 0)); look.copy(head).add(v3(0, -0.15, 0)); fov = 52; }
  }
  aim(camera, pos, look, H, fov);
  postFx(engine, EP, t, { exposure: 2.6, flashes: [[0.4, 0.8, 2.5], [29, 0.08, 3]], glitch: t > 62.4 && t < 64.6 ? 0.5 : 0 });
}

run({ EP, engine, scene, camera, update, hud, dbg: { moonH: H, hero, devState } });
