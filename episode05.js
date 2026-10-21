// Episode 5 — "World of Glass". Through the gate to a planet of glass: singing spires, cracks under every
// step, a shard storm, shelter behind a "rock" that is a sleeping crystal giant with the first key inside.
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, d2, faceTo, lerpAng, ease,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeDaySky } from './engine/sky.js';
import { glyphMaterial, makePillar, makeHall, makeGate, makeKey } from './engine/props.js';
import { glassMat, makeSpireField, crystalClusterGeo, makeCrystalGiant, poseCrystalGiant, makeShardStorm, crackTexture } from './engine/glass.js';

const EP = await loadEpisode('05');
const { engine, scene, camera, world } = makeStage({ fog: [0x5a6aa8, 60, 600] });

// =====================================================================
// TEMPLE (opening): the gate behind the altar wakes up
// =====================================================================
const HALL = v3(-3000, 0, 0);
const temple = new THREE.Group(); temple.position.copy(HALL); world.add(temple);
const stone = new THREE.MeshStandardMaterial({ color: 0x4a4866, roughness: 0.75, metalness: 0.15, flatShading: true });
const gm = [0, 1, 2].map(i => glyphMaterial({ color: 0x2e2c48, glow: 0x55e6ff, seed: i + 1 }));
const hall = makeHall({ R: 18, h: 15, n: 18, stone, glyphMats: gm }); temple.add(hall.g);
for (let i = 0; i < 6; i++) { const p = makePillar(13, 0.75, stone, gm[i % 3]); p.g.position.set((i % 2 ? 1 : -1) * 4.8, 0, 10 - Math.floor(i / 2) * 4.2); temple.add(p.g); }
const gate0 = makeGate(3.2, stone); gate0.g.position.set(0, 3.4, -6); temple.add(gate0.g);
temple.add(new THREE.HemisphereLight(0x6a7ad0, 0x18142c, 1.5));
const tLight = new THREE.PointLight(0x66e8ff, 0, 30, 1.3); tLight.position.set(0, 3.4, -5); temple.add(tLight);

// =====================================================================
// GLASS WORLD
// =====================================================================
const glassW = new THREE.Group(); world.add(glassW);
const GATE = P2(0, 2), MOUND = P2(5, -32);
function H(x, z) {
  const dunes = (fbm(x * 0.03 + 3, z * 0.03) - 0.5) * 3.0 + Math.sin(x * 0.06 + z * 0.02) * 0.6;
  const crater = -1.2 * Math.exp(-((Math.hypot(x - MOUND.x, z - MOUND.z) / 14) ** 2));
  const far = Math.hypot(x, z + 20);
  return dunes + crater + (fbm(x * 0.006, z * 0.006 + 5) - 0.4) * 80 * smooth(90, 320, far);
}
const sky = makeDaySky({ pal: { top: '#0a1840', mid: '#2f5aa0', horizon: '#e4a0c8', below: '#3a2a50' },
  suns: [{ dir: [0.55, 0.32, -1], r: 70, color: [3, 2.7, 2.3] }, { dir: [0.9, 0.18, -0.6], r: 34, color: [3, 2.2, 2.6] }],
  ring: { dir: [-0.7, 0.45, -1], radius: 380 }, seed: 5 });
glassW.add(sky.group);
const cA = new THREE.Color(0x14204a), cB = new THREE.Color(0x2c3e78), cC = new THREE.Color(0x6a5aa0);
glassW.add(makeTerrain({ H, size: 1400, seg: 240, col: (x, z, c) => { const n = fbm(x * 0.05, z * 0.05 + 3); c.copy(cA).lerp(cB, smooth(0.3, 0.7, n)).lerp(cC, smooth(0.62, 0.8, n) * 0.6); },
  set: SET.METAL, mat: { roughness: 0.12, metalness: 0.6 } }));
const spireMat = glassMat(0xbfe8ff, 0x2a6a9a, { emissiveIntensity: 0.55 });
glassW.add(makeSpireField({ n: 140, rMin: 22, rMax: 420, heightFn: H, mat: spireMat, hMin: 6, hMax: 55,
  avoid: (x, z) => x > -26 && x < 34 && z < 22 && z > -62 }));
// spires along his path: individual materials so each one chimes (lights up) as he passes
const NEAR = [];
for (let i = 0; i < 12; i++) {
  const side = i % 2 ? 1 : -1, z = -2 - i * 2.4, x = 2 + side * (5.0 + hash2(i, 5) * 3.0);
  const mat = glassMat(0xbfe8ff, 0x3a9ad8, { emissiveIntensity: 0.4 });
  const m = new THREE.Mesh(crystalClusterGeo(500 + i, 1.2 + hash2(i, 6) * 1.6), mat); m.position.set(x, H(x, z) - 0.2, z); m.castShadow = true;
  glassW.add(tag(m, SET.METAL)); NEAR.push({ x, z, mat, t: 999 });
}
const gate1 = makeGate(3.2, stone); gate1.g.position.set(GATE.x, H(GATE.x, GATE.z) + 3.4, GATE.z + 1.2); glassW.add(gate1.g);
const giant = makeCrystalGiant(1.0); giant.root.position.set(MOUND.x, H(MOUND.x, MOUND.z) - 0.3, MOUND.z); giant.root.rotation.y = faceTo(MOUND, P2(MOUND.x - 4.4, MOUND.z + 7.4)); glassW.add(giant.root);
const key = makeKey(0, 1.3); glassW.add(key.g);
const storm = makeShardStorm(3200); glassW.add(storm.im);
const sun = new THREE.DirectionalLight(0xfff0e4, 3.0); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 300 });
const hemi = new THREE.HemisphereLight(0x9ad0ff, 0x2a1a40, 1.2), rim = new THREE.DirectionalLight(0xff9ad8, 1.4);
glassW.add(sun, sun.target, hemi, rim, rim.target);
const coreLight = new THREE.PointLight(0x7ae8ff, 0, 16, 1.5); glassW.add(coreLight);
// glowing cracks under his feet
const crackTex = crackTexture();
const crackGeo = new THREE.PlaneGeometry(1.6, 1.6).rotateX(-PI / 2);

// =====================================================================
// HERO + PIXEL
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 6;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const T_GATE_IN = 8.8, T_RISE = 86.0;
function devState(t) {
  const S = { x: 0, z: 6, y: 0, rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0, scene: 1, world: 0, air: 0 };
  if (t < T_GATE_IN) {                                              // temple: walks into the gate
    const k = Q(5.6, 8.8, t); S.z = lerp(4, -5.6, k); S.walk = Q(5.6, 5.9, t); S.phase = k * 9.6 / 0.52 * PI; S.lookUp = 0.3 * (1 - Q(5, 6, t));
    return S;
  }
  S.world = 1;
  if (t < 34) {
    S.scene = t < 21 ? 2 : 3;
    const k = Q(9.6, 33.6, t); S.x = lerp(GATE.x, 2.2, k); S.z = lerp(GATE.z - 1.2, -26, k);
    S.walk = Q(9.6, 10.2, t); S.phase = k * 25 / 0.52 * PI; S.rotY = PI + 0.08;
    S.lookUp = 0.3 * Q(10, 12, t) * (1 - Q(14, 16, t)) + 0.2 * Math.max(0, Math.sin((t - 16) * 0.5));
    S.headYaw = 0.5 * Math.sin((t - 12) * 0.35) * (1 - Q(27.5, 28.5, t)) - 0.9 * Q(28.4, 29.4, t) * (1 - Q(31.5, 32.5, t));
    return S;
  }
  if (t < 50) {                                                     // runs for the mound, crouches against it
    S.scene = 4; const k = Q(34.4, 40.6, t), p0 = P2(2.2, -26), p1 = P2(MOUND.x - 4.4, MOUND.z + 7.4);
    S.x = lerp(p0.x, p1.x, k); S.z = lerp(p0.z, p1.z, k); S.rotY = faceTo(p0, p1);
    S.run = Q(34.4, 34.8, t) * (1 - Q(40.2, 40.6, t)); S.walk = Math.max(S.run, 0); S.phase = k * 7.5 / 0.85 * PI;
    S.crouch = Q(40.6, 41.4, t) * 0.75; S.rotY = lerpAng(S.rotY, faceTo(p1, MOUND) + PI * 0.75, Q(40.4, 41.2, t));
    const shield = Q(36, 36.6, t);
    S.armRo = { x: -2.1, z: 0.35, ex: -1.6, w: shield }; S.armLo = { x: -1.9, z: -0.35, ex: -1.7, w: shield * 0.8 };
    S.lookUp = -0.3 * shield; S.lean = 0.15 * shield;
    return S;
  }
  const P = P2(MOUND.x - 4.4, MOUND.z + 7.4);
  S.x = P.x; S.z = P.z; S.scene = t < 62 ? 5 : t < 74 ? 6 : t < 86 ? 7 : 8;
  const back = Q(52.6, 55.6, t) * 3.2, toG = faceTo(MOUND, P);
  S.x += Math.sin(toG) * back; S.z += Math.cos(toG) * back;
  S.crouch = 0.75 * (1 - Q(50.4, 52.0, t)); S.rotY = lerpAng(faceTo(P, MOUND) + PI * 0.75, faceTo(P, MOUND), Q(51.6, 52.6, t));
  S.walk = Q(52.6, 52.9, t) * (1 - Q(55.3, 55.6, t)); S.phase = -back / 0.52 * PI;
  S.lookUp = 0.75 * Q(54.5, 57, t) * (1 - Q(61, 63, t)) + 0.35 * Q(63, 65, t) * (1 - Q(80, 82, t));
  if (t > 80) {                                                     // catches Pixel with the key
    const c = Q(80.6, 81.4, t) * (1 - Q(85.4, 86.4, t));
    S.armRo = { x: -0.9, z: 0.2, ex: -1.3, w: c }; S.armLo = { x: -0.9, z: -0.2, ex: -1.3, w: c }; S.lookUp = -0.25 * c;
  }
  if (t > T_RISE) {                                                 // runs back to the gate, dives in
    const p0 = P2(S.x, S.z), p1 = P2(GATE.x, GATE.z - 0.4), k = Q(88.2, 97.0, t);
    S.x = lerp(p0.x, p1.x, k); S.z = lerp(p0.z, p1.z, k); S.rotY = lerpAng(S.rotY, faceTo(p0, p1), Q(87.4, 88.4, t));
    S.run = Q(88.2, 88.6, t); S.walk = S.run; S.phase = k * 33 / 0.85 * PI; S.lookUp = 0.3 * (1 - Q(88, 89, t));
    S.headYaw = 0.9 * Q(91.6, 92.4, t) * (1 - Q(93.4, 94.2, t));
  }
  return S;
}
const FOOT = footsteps(devState, EP.duration, S => ({ x: S.x, z: S.z, w: S.world }));
const CRACKS = FOOT.filter(f => f.w === 1).map((f, i) => {
  const m = new THREE.Mesh(crackGeo, new THREE.MeshBasicMaterial({ map: crackTex, color: new THREE.Color(0.5, 1.6, 2.2), transparent: true, depthWrite: false, fog: false }));
  m.position.set(f.x, H(f.x, f.z) + 0.04, f.z); m.rotation.y = hash2(i, 3) * PI; m.scale.setScalar(0.7 + hash2(i, 4) * 0.6); glassW.add(tag(m, SET.ENERGY, true));
  return { m, t: f.t };
});
for (const s of NEAR) for (let t = 9.6; t < 34; t += 1 / 30) { const S = devState(t); if (s.t === 999 && Math.hypot(S.x - s.x, S.z - s.z) < 4.2) s.t = t; }
const STORM = { origin: v3(-160, 0, -30), dir: v3(1, 0, 0), t0: 33.0, frontSpeed: 32 };
const PIX = { climb0: 63.0, inside: 71.0, out: 75.0, caught: 81.4 };

window.AUDIO_META = {
  foot: FOOT.map(f => ({ t: f.t, water: false, run: f.run })),
  chimes: NEAR.filter(s => s.t < 900).sort((a, b) => a.t - b.t).map((s, i) => ({ t: +s.t.toFixed(3), note: [4, 7, 9, 12, 9, 7, 4, 2, 4, 7, 9, 11][i] })),
};

// =====================================================================
const look = new THREE.Vector3();
const VISOR = [[10.5, 18.5, 'WORLD  ·  GLASS\nGRAVITY  0.8 g\nKEY SIGNAL  ▸▸ 0.4 km'], [38.0, 50.0, 'SUIT INTEGRITY\n▮▮▮▮▮▮▮▮▯▯  78%\nVISOR SCRATCHED'], [81.8, 86.0, 'KEYS  1 / 4\n▸ GLASS   ✓']];
const hud = makeHud(EP, { visor: VISOR });

function update(t) {
  const S = devState(t), inGlass = S.world === 1;
  temple.visible = !inGlass; glassW.visible = inGlass;
  scene.fog.color.set(inGlass ? 0x5a6aa8 : 0x0c0b1e); scene.fog.near = inGlass ? 60 : 20; scene.fog.far = inGlass ? 600 : 90;
  const base = inGlass ? v3(0, 0, 0) : HALL, gy = inGlass ? H(S.x, S.z) : 0;
  poseHero(hero, S, t);
  hero.root.position.set(base.x + S.x, base.y + gy + S.y, base.z + S.z); hero.root.rotation.set(0, S.rotY, 0); hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = hero.head.getWorldPosition(new THREE.Vector3());
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));

  // ---- temple gate ----
  if (!inGlass) { const o = Q(2.6, 5.4, t); gate0.set(t, o); tLight.intensity = 30 * o; for (const m of gm) m.emissiveIntensity = 0.3 + 0.8 * o; }

  // ---- glass world ----
  const giantPos = giant.root.position;
  let keyPos = null;
  if (inGlass) {
    gate1.set(t, (1 - Q(10.6, 12.6, t)) + Q(94.0, 95.6, t));
    for (const s of NEAR) s.mat.emissiveIntensity = 0.4 + 2.4 * pulse(t, s.t, 0.8) + 0.4 * Math.sin(t * 2 + s.x);
    spireMat.emissiveIntensity = 0.5 + 0.15 * Math.sin(t * 0.7);
    for (const c of CRACKS) { const age = t - c.t; c.m.visible = age > 0 && age < 3.5; if (c.m.visible) { c.m.material.opacity = Math.min(1, age * 6) * (1 - age / 3.5); } }
    // storm
    const sStr = Q(33, 35, t) * (1 - Q(49, 53, t));
    storm.set(t, { origin: STORM.origin, dir: STORM.dir, frontSpeed: STORM.frontSpeed, t0: STORM.t0, width: 26, height: 7, focus: camera.position.clone().lerp(a, 0.5).setY(H(a.x, a.z)), radius: 16, strength: sStr });
    storm.im.visible = sStr > 0.01;
    hemi.intensity = 1.2 - 0.5 * sStr; sun.intensity = 3.0 - 1.6 * sStr;
    scene.fog.near = 60 - 52 * sStr; scene.fog.far = 600 - 560 * sStr; scene.fog.color.set(0x5a6aa8).lerp(new THREE.Color(0xb8d4f0), sStr);
    // giant
    const rise = ease(Q(T_RISE, 92.0, t));
    poseCrystalGiant(giant, { rise, t, reach: Q(93.6, 95.4, t), look: -0.4 * Q(88, 92, t), breathe: 1 });
    giant.root.rotation.y = faceTo(MOUND, P2(MOUND.x - 4.4, MOUND.z + 7.4)) + 0.25 * Q(88, 93, t);
    const awake = Q(76.8, 77.6, t);
    giant.eyeMat.color.setRGB(2.5, 2.6, 2.8).multiplyScalar(0.05 + awake);
    giant.body.emissiveIntensity = 0.2 + 0.3 * Q(62, 70, t) + 1.2 * pulse(t, 76.8, 1.2) + 0.3 * awake;
    giant.root.updateMatrixWorld(true);
    const corePos = giant.core.getWorldPosition(new THREE.Vector3());
    giant.coreGlow.visible = t < PIX.out; giant.coreGlow.material.color.setRGB(0.6, 1.8, 2.4).multiplyScalar(0.6 + 0.4 * Math.sin(t * 3) + 0.8 * Q(70, 74, t));
    coreLight.position.copy(corePos); coreLight.intensity = t < PIX.out ? 16 + 16 * Q(70, 74, t) : 6 * pulse(t, PIX.out, 0.5);
    // key: inside the chest -> carried out by Pixel -> in Dev's hand
    const hand = hero.handR.getWorldPosition(new THREE.Vector3());
    if (t < PIX.out) keyPos = corePos;
    else if (t < PIX.caught) { keyPos = pixel.g.position.clone().add(v3(0, 0.18, 0)); }
    else keyPos = hand.clone().add(v3(0, 0.12, 0));
    key.g.visible = t > PIX.inside - 0.3; key.g.position.copy(keyPos); key.spin(t); key.g.scale.setScalar(t < PIX.caught ? 0.8 : 1);
    sun.target.position.copy(a); sun.position.copy(a).add(v3(55, 35, -90)); rim.target.position.copy(a); rim.position.copy(a).add(v3(-40, 10, 40));
  }

  // ---- Pixel ----
  {
    const sh = hero.shoulderL.getWorldPosition(new THREE.Vector3());
    if (!inGlass || t < PIX.climb0 - 0.6 || t > PIX.caught + 0.2) {
      const hold = t > PIX.caught;
      pixel.g.position.copy(hold ? hero.handR.getWorldPosition(new THREE.Vector3()).add(v3(0, 0.02, 0)) : sh);
      pixel.g.rotation.set(0, S.rotY + 0.3 * Math.sin(t * 0.7), 0); pixel.g.scale.setScalar(0.55);
      poseSkitterling(pixel, { curl: S.scene === 4 ? 1 : 0, eyeOpen: (t % 3.9) < 0.12 ? 0.1 : 1, look: Math.sin(t * 0.9) * 0.5, t });
      pixel.g.visible = true;
    } else if (inGlass) {
      // hop down, scuttle up the giant's arm to the chest crack, slip inside, come back out with the key
      const corePos = giant.core.getWorldPosition(new THREE.Vector3()), crack = corePos.clone().add(v3(0.3, 0.1, 0.5));
      const ground = v3(a.x + 0.8, H(a.x + 0.8, a.z - 0.6), a.z - 0.6), knee = giant.legR.knee.getWorldPosition(new THREE.Vector3()).add(v3(0.4, 0.9, 0.9));
      let p, walk = 1;
      if (t < PIX.climb0) p = sh.clone().lerp(ground, Q(PIX.climb0 - 0.6, PIX.climb0, t)).add(v3(0, 0.25 * Math.sin(PI * Q(PIX.climb0 - 0.6, PIX.climb0, t)), 0));
      else if (t < 67) p = ground.clone().lerp(knee, Q(PIX.climb0, 67, t));
      else if (t < PIX.inside) p = knee.clone().lerp(crack, Q(67, PIX.inside, t));
      else if (t < PIX.out) { p = crack.clone(); walk = 0; }
      else if (t < 78.2) { p = crack.clone().add(v3(0, 0.15, 0.2)); walk = 0; }
      else p = crack.clone().lerp(knee, Q(78.2, 79.6, t)).lerp(hero.handR.getWorldPosition(new THREE.Vector3()), Q(79.6, PIX.caught, t));
      pixel.g.position.copy(p); pixel.g.scale.setScalar(0.55);
      pixel.g.rotation.set(0, faceTo(P2(a.x, a.z), P2(giantPos.x, giantPos.z)), 0);
      pixel.g.visible = !(t > PIX.inside && t < PIX.out);
      poseSkitterling(pixel, { walk, phase: t * 18, eyeOpen: 1, look: Math.sin(t * 1.3) * 0.4, t });
      pixel.stripe.color.setRGB(0.3, 1.7, 1.9).multiplyScalar(1 + 1.5 * pulse(t, PIX.out, 1));
    }
  }

  // ---- cameras ----
  let pos, fov = 58; const Hc = inGlass ? H : null;
  if (!inGlass) {
    if (t < 5.4) { pos = v3(HALL.x + 1.4, 1.5, 7.5); look.set(HALL.x, 3.2, -6); fov = 60; }
    else { pos = a.clone().addScaledVector(fwd, -3.4).addScaledVector(right, 0.8).add(v3(0, 1.5, 0)); look.set(HALL.x, 3.0, -6); fov = 62; }
  } else switch (S.scene) {
    case 2: if (t < 14.6) { pos = v3(GATE.x + 3.5, H(GATE.x, GATE.z) + 1.4, GATE.z - 7.5); look.copy(a).add(v3(0, 1.2, 0)); fov = 60; }        // he steps out of the gate
      else { const k = Q(14.6, 21, t); pos = a.clone().addScaledVector(fwd, -4 - 2 * k).addScaledVector(right, 1.5).add(v3(0, 1.6 + 3 * k, 0)); look.copy(a).addScaledVector(fwd, 14).add(v3(0, 4, 0)); fov = 64; }
      break;
    case 3: if (t < 28.4) { pos = a.clone().addScaledVector(right, 4.5).addScaledVector(fwd, 2.5).add(v3(0, 1.0, 0)); look.copy(a).add(v3(0, 1.4, 0)); fov = 58; }
      else { pos = a.clone().addScaledVector(fwd, 2.8).addScaledVector(right, 1.6).add(v3(0, 1.5, 0)); look.copy(a).add(v3(-40, 4, 0)); fov = 64; }      // the storm wall on the horizon
      break;
    case 4: if (t < 40.6) { pos = a.clone().addScaledVector(fwd, 3.2).addScaledVector(right, -0.6).add(v3(0, 0.9, 0)); look.copy(a).add(v3(0, 1.1, 0)); fov = 64; }
      else { pos = a.clone().add(v3(1.6, 1.1, 2.4)); look.copy(a).add(v3(0, 0.9, 0)); fov = 56; }
      break;
    case 5: { const k = ease(Q(53, 61, t)); pos = a.clone().addScaledVector(fwd, -2.0 - 3.5 * k).addScaledVector(right, 1.0).add(v3(0, 1.3 + 2.8 * k, 0)); look.copy(giantPos).add(v3(0, 3.6 * k + 1.2, 0)).lerp(a.clone().add(v3(0, 1.2, 0)), 0.4 * (1 - k)); fov = 60 + 8 * k; break; }
    case 6: case 7: if (S.scene === 6 || t < 80) {
        const corePos = giant.core.getWorldPosition(new THREE.Vector3()), gd = v3(a.x - giantPos.x, 0, a.z - giantPos.z).normalize(), sd = v3(-gd.z, 0, gd.x);
        pos = corePos.clone().addScaledVector(gd, 6.5).addScaledVector(sd, 2.2).add(v3(0, -0.6, 0)); look.copy(corePos).lerp(pixel.g.position, S.scene === 6 ? 0.5 : 0.2); fov = 54; break; }
      else { pos = a.clone().addScaledVector(fwd, 1.5).addScaledVector(right, 0.6).add(v3(0, 1.4, 0)); look.copy(a).add(v3(0, 1.15, 0)); fov = 52; }
      break;
    default: if (t < 92.4) { pos = a.clone().addScaledVector(fwd, -1.6).add(v3(0, 0.6, 0)).addScaledVector(right, 2.2); look.copy(giantPos).add(v3(0, 6 * ease(Q(86, 92, t)) + 2, 0)); fov = 66; }
      else { pos = a.clone().addScaledVector(fwd, 4.2).add(v3(0, 1.2, 0)); look.copy(a).add(v3(0, 2.6, 0)).addScaledVector(fwd, -6); fov = 66; }
  }
  aim(camera, pos, look, Hc, fov);
  if (t > 86 && t < 92) { const sk = 0.02 * Math.sin(t * 40); camera.rotation.z += sk; }
  postFx(engine, EP, t, { exposure: inGlass ? 2.4 : 3.0, flashes: [[T_GATE_IN, 0.9, 2.5], [76.8, 0.2, 4], [97.2, 0.9, 2.5]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { moonH: H, hero, devState } });
