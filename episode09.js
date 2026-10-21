// Episode 9 — "Titan". A desert with two suns; a 40 m Hollow rises out of the sand, hunts him, smashes his
// visor. O2 4%. ECHO: "I can save you."
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, d2, faceTo, lerpAng, ease,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeDaySky } from './engine/sky.js';
import { makeGate, makeVaelorStatue } from './engine/props.js';
import { makeHollow, poseHollow } from './engine/hollow.js';

const EP = await loadEpisode('09');
const { engine, scene, camera, world } = makeStage({ fog: [0xc08a6a, 80, 900] });
const TP = P2(12, -48), ROCKS = P2(-16, -22), HIT_LAND = P2(-25, -8);
function H(x, z) {
  const dunes = Math.sin(x * 0.05 + z * 0.02) * 2.2 + Math.sin(x * 0.013 - z * 0.04) * 3.5 + (fbm(x * 0.03, z * 0.03) - 0.5) * 2;
  const rocks = 2.5 * Math.exp(-((d2(P2(x, z), ROCKS) / 5) ** 2));
  const far = Math.hypot(x, z + 30);
  return dunes + rocks + (fbm(x * 0.006, z * 0.006 + 1) - 0.4) * 60 * smooth(120, 380, far);
}
const sky = makeDaySky({ pal: { top: '#3a5a9a', mid: '#9ab0c8', horizon: '#f0c8a0', below: '#a07050' },
  suns: [{ dir: [0.4, 0.55, -1], r: 70, color: [3, 2.8, 2.2] }, { dir: [-0.6, 0.35, -1], r: 40, color: [3, 2.2, 1.6] }], seed: 9, clouds: 20 });
world.add(sky.group);
const cA = new THREE.Color(0xc89a6a), cB = new THREE.Color(0x9a6a48);
world.add(makeTerrain({ H, col: (x, z, c) => c.copy(cA).lerp(cB, smooth(0.3, 0.7, fbm(x * 0.05, z * 0.05 + 5))), set: SET.ROCK }));
const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a4a3a, roughness: 0.95, flatShading: true });
for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 + hash2(i, 1) * 2.5, 0), rockMat); r.position.set(ROCKS.x + (hash2(i, 2) - 0.5) * 8, H(ROCKS.x, ROCKS.z) + 0.5, ROCKS.z + (hash2(i, 3) - 0.5) * 8); r.rotation.set(i, i * 2, 0); r.castShadow = true; world.add(tag(r, SET.ROCK)); }
const stone = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.85, flatShading: true });
for (let i = 0; i < 4; i++) { const s = makeVaelorStatue(46, stone); const a = -0.9 + i * 0.6, r = 150 + i * 30; s.position.set(Math.sin(a) * r, H(Math.sin(a) * r, -Math.cos(a) * r) - 12, -Math.cos(a) * r); s.rotation.set((hash2(i, 5) - 0.5) * 0.4, a + PI, (hash2(i, 6) - 0.5) * 0.5); world.add(s); }
const gate0 = makeGate(3.0, stone, [1.6, 1.2, 0.6]); gate0.g.position.set(0, H(0, 2) + 3.2, 2.2); world.add(gate0.g);
// the titan: a Hollow scout at 12x scale
const titan = makeHollow('scout'); titan.root.scale.setScalar(12); world.add(titan.root);
titan.bone.color.set(0x6a6470); titan.bone.metalness = 0.6;
const sandP = makePool(2400, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xd8a878, roughness: 1, flatShading: true }), SET.ROCK); world.add(sandP.mesh);
const tracers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glow(0.7, 2.2, 2.6), 12); tracers.frustumCulled = false; world.add(tag(tracers, SET.ENERGY));
const eyeLight = new THREE.PointLight(0xff2030, 0, 60, 1.3); world.add(eyeLight);
const sun = new THREE.DirectionalLight(0xfff0d8, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 400 });
const hemi = new THREE.HemisphereLight(0xb8c8ff, 0x8a5a3a, 1.0); world.add(sun, sun.target, hemi);
// visor crack overlay (HTML/SVG on top of the frame)
const crack = document.createElement('div'); crack.style.cssText = 'position:absolute;inset:0;opacity:0;pointer-events:none';
crack.innerHTML = `<svg width="720" height="1280" viewBox="0 0 720 1280"><g stroke="#eaf6ff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85">
  ${[...Array(11)].map((_, i) => { let x = 470, y = 520, a = i / 11 * PI * 2 + 0.3, d = `M${x} ${y}`; for (let s = 0; s < 7; s++) { a += (hash2(i, s) - 0.5) * 0.7; x += Math.cos(a) * (40 + hash2(i, s + 9) * 60); y += Math.sin(a) * (40 + hash2(i, s + 9) * 60); d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; } return `<path d="${d}"/>`; }).join('')}
  <circle cx="470" cy="520" r="34"/><circle cx="470" cy="520" r="70" stroke-dasharray="12 18"/></g></svg>`;
document.getElementById('hud').appendChild(crack);
const alarm = document.createElement('div'); alarm.style.cssText = 'position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 160px 40px rgba(255,30,40,0.7);opacity:0';
document.getElementById('hud').appendChild(alarm);

// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 4;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const SHOTS = []; for (let t = 52.2; t < 57.6; t += 0.14) if ((t - 52.2) % 1.4 < 0.9) SHOTS.push(+t.toFixed(3));
function devState(t) {
  const S = { x: 0, z: 1.2, rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0, y: 0, lie: 0, air: 0, scene: 1 };
  S.scene = t < 9 ? 1 : t < 22 ? 2 : t < 36 ? 3 : t < 50 ? 4 : t < 62 ? 5 : t < 74 ? 6 : t < 88 ? 7 : 8;
  if (t < 23) { const k = Q(1.2, 22.6, t); S.z = lerp(1.2, -26, k); S.walk = Q(1.2, 1.6, t) * (1 - Q(22.2, 22.6, t)); S.phase = k * 27 / 0.52 * PI; S.headYaw = 0.5 * Math.sin(t * 0.4) * (1 - Q(14, 16, t)); S.lookUp = 0.15; return S; }
  if (t < 36) { S.z = -26; S.lookUp = 0.85 * Q(24, 28, t); S.lean = -0.1 * Q(26, 28, t); S.walk = Q(28, 28.3, t) * (1 - Q(29.6, 30, t)) * 0.6; S.phase = -Q(28, 30, t) * 5; S.z += 0.8 * Q(28, 30, t); return S; }
  if (t < 50) {                                                                 // runs for the rocks, gets thrown by the slam
    const p0 = P2(0, -25.2), p1 = P2(-11, -21.8), k = Q(36.2, 44.2, t); S.x = lerp(p0.x, p1.x, k); S.z = lerp(p0.z, p1.z, k); S.rotY = faceTo(p0, p1);
    S.run = Q(36.2, 36.6, t) * (1 - Q(44.1, 44.3, t)); S.walk = S.run; S.phase = k * 12 / 0.85 * PI; S.headYaw = 0.9 * Q(39, 39.6, t) * (1 - Q(41, 41.6, t));
    if (t > 44.3) { const j = Q(44.3, 45.8, t), q1 = P2(-17.5, -19.6); S.x = lerp(p1.x, q1.x, j); S.z = lerp(p1.z, q1.z, j); S.y = 3.2 * Math.sin(PI * j); S.air = 1; S.lean = 0.6 * (1 - j); S.crouch = 0.6 * j + 0.6 * Q(45.8, 46.3, t) * (1 - Q(47.6, 49.4, t)); if (t > 45.8) S.air = 0; }
    return S;
  }
  if (t < 65.2) {                                                               // up on the rocks, fires at the eye
    S.x = -17.5; S.z = -19.6; S.y = 0; const tp = titanState(t); S.rotY = faceTo(P2(S.x, S.z), P2(tp.x, tp.z));
    const aimK = Q(51.0, 52.0, t) * (1 - Q(63.6, 64.4, t));
    S.armRo = { x: -1.9, z: 0.08, ex: -0.3, w: aimK }; S.armLo = { x: -1.8, z: -0.3, ex: -0.9, w: aimK }; S.lookUp = 0.55 * aimK;
    return S;
  }
  // hit by the sweep: thrown, lands on his back, lies there
  const j = Q(65.2, 67.2, t), p0 = P2(-17.5, -19.6);
  S.x = lerp(p0.x, HIT_LAND.x, j); S.z = lerp(p0.z, HIT_LAND.z, j); S.y = 5 * Math.sin(PI * j) + 0.15 * Q(67, 67.4, t); S.air = j < 1 ? 1 : 0;
  S.lie = Q(66.4, 67.3, t); S.rotY = faceTo(p0, HIT_LAND);
  S.armRo = { x: -0.3, z: -1.2, ex: -0.4, w: S.lie }; S.armLo = { x: -0.2, z: 1.0, ex: -0.6, w: S.lie };
  S.headYaw = 0.3 * Math.sin(t * 0.5) * Q(70, 72, t); S.lookUp = 0.1;
  return S;
}
// titan: rises out of the sand, crawls after him, slams, sweeps, looms
function titanState(t) {
  const T = { x: TP.x, z: TP.z, y: 0, rotY: faceTo(TP, P2(0, -26)), crawl: 0.7, walk: 0, phase: 0, rise: 0, reach: 0, lookUp: 0, eye: 0 };
  T.rise = ease(Q(22.4, 31, t)); T.y = -42 * (1 - T.rise); T.eye = Q(29.3, 29.8, t); T.lookUp = 0.5 * Q(29, 31, t) * (1 - Q(34, 36, t));
  if (t > 35) {
    const k = Q(35.2, 43.6, t), p1 = P2(-2, -32); T.x = lerp(TP.x, p1.x, k); T.z = lerp(TP.z, p1.z, k); T.crawl = 1; T.walk = Q(35.2, 35.8, t) * (1 - Q(43.2, 43.8, t)); T.phase = t * 3.2;
    T.rotY = faceTo(P2(T.x, T.z), P2(-11, -22));
    T.reach = Q(43.4, 44.2, t) * (1 - Q(45.6, 47, t));
  }
  if (t > 47) { const k = Q(48, 62, t), p2 = P2(-8, -30); T.x = lerp(-2, p2.x, k); T.z = lerp(-32, p2.z, k); T.walk = 0.4 * Q(48, 49, t) * (1 - Q(61, 62, t)); T.rotY = faceTo(P2(T.x, T.z), P2(-17.5, -19.6)); T.crawl = 1 - 0.5 * Q(56.5, 58, t) * (1 - Q(59.5, 61, t)); T.lookUp = 0.4 * Q(56.6, 57.4, t) * (1 - Q(59, 60.5, t)); }
  if (t > 62) { T.reach = Q(63.8, 65.0, t) * (1 - Q(66, 68, t)); T.rotY = faceTo(P2(T.x, T.z), P2(-17.5, -19.6)) + 0.6 * Q(63.8, 65.2, t); }
  if (t > 70) { const k = Q(70, 86, t), p3 = P2(-20, -19); T.x = lerp(-8, p3.x, k); T.z = lerp(-30, p3.z, k); T.walk = 0.35 * (1 - Q(85, 86, t)); T.rotY = faceTo(P2(T.x, T.z), HIT_LAND); T.crawl = 1; T.lookUp = -0.35 * Q(80, 86, t); T.reach = Q(89, 92, t) * 0.8; }
  return T;
}
const FOOT = footsteps(devState, EP.duration);
window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false, run: f.run })), shots: SHOTS };

const look = new THREE.Vector3();
const VISOR = [[1.2, 8.6, 'WORLD  ·  DESERT\nTEMP  61 °C\nGATE  ▸ 2.0 km'], [66.8, 100, 'SUIT BREACH\nO2  ▮▯▯▯▯▯▯▯▯▯  4%\nPRESSURE  FALLING']];
const hud = makeHud(EP, { visor: VISOR });
const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sv = new THREE.Vector3(), zA = new THREE.Vector3(0, 0, 1);

function update(t) {
  const S = devState(t), T = titanState(t);
  poseHero(hero, S, t);
  hero.root.position.set(S.x, H(S.x, S.z) + S.y, S.z);
  hero.root.rotation.set(-PI / 2 * S.lie, S.rotY, 0, 'YXZ');
  if (S.lie > 0) hero.root.position.y += 0.18 * S.lie;
  hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = hero.head.getWorldPosition(new THREE.Vector3());
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  hero.handGun.visible = t > 50.6 && t < 64.6; hero.gun.visible = !hero.handGun.visible;
  gate0.set(t, 1 - Q(1.0, 2.6, t));
  // titan
  titan.root.position.set(T.x, H(T.x, T.z) + T.y, T.z); titan.root.rotation.set(0, T.rotY, 0);
  poseHollow(titan, { crawl: T.crawl, walk: T.walk, phase: T.phase, t, reach: T.reach, lookUp: T.lookUp, twitch: 0.4 });
  titan.red.color.setRGB(2.4, 0.16, 0.2).multiplyScalar(0.1 + T.eye * (1 + 0.5 * Math.sin(t * 5)) + 2 * pulse(t, 29.5, 2));
  titan.eye2.visible = T.eye > 0.5; titan.root.updateMatrixWorld(true);
  const tHead = titan.head.getWorldPosition(new THREE.Vector3()), tEye = titan.eye.getWorldPosition(new THREE.Vector3()), claw = titan.armR.wr.getWorldPosition(new THREE.Vector3());
  eyeLight.position.copy(tEye); eyeLight.intensity = 80 * T.eye * (t > 70 ? 1.6 : 1);
  // sand: cascading off the titan as it rises, the slam, the sweep
  const SP = [];
  if (t > 22 && t < 34) for (let i = 0; i < 1200; i++) { const t0 = 22.4 + hash2(i, 1) * 9, dt = t - t0; if (dt < 0 || dt > 3) continue;
    const h0 = hash2(i, 2) * 30 * T.rise, ang = hash2(i, 3) * 6.28, r = 4 + hash2(i, 4) * 6, x = T.x + Math.cos(ang) * r, z = T.z + Math.sin(ang) * r, y = H(T.x, T.z) + h0 - 4.9 * dt * dt;
    if (y > H(x, z)) SP.push({ x, y, z, s: 0.25 + hash2(i, 5) * 0.4, rx: dt * 3, ry: i }); }
  for (const [t0, c, n] of [[44.3, P2(-10, -24), 500], [65.1, P2(-17, -19.6), 400]]) { const dt = t - t0; if (dt < 0 || dt > 3.5) continue;
    for (let i = 0; i < n; i++) { const ang = hash2(i + n, 7) * 6.28, hv = 3 + hash2(i, 8) * 10, vv = 3 + hash2(i, 9) * 9, x = c.x + Math.cos(ang) * hv * dt, z = c.z + Math.sin(ang) * hv * dt, y = H(c.x, c.z) + vv * dt - 6 * dt * dt;
      if (y > H(x, z)) SP.push({ x, y, z, s: 0.12 + hash2(i, 10) * 0.25, rx: dt * 4, ry: i }); } }
  sandP.set(SP);
  // carbine tracers at the eye
  let nt = 0; const muzzle = hero.muzzle.getWorldPosition(new THREE.Vector3());
  for (const [k, sh] of SHOTS.entries()) { const dt = t - sh; if (dt < 0 || dt > 0.12) continue; const end = tEye.clone().add(v3((hash2(k, 1) - 0.5) * 3, (hash2(k, 2) - 0.5) * 3, 0)), dir = end.clone().sub(muzzle), u = Math.min(1, dt / 0.1);
    const hp = muzzle.clone().addScaledVector(dir, u), tp = muzzle.clone().addScaledVector(dir, Math.max(0, u - 0.08)); sv.set(0.05, 0.05, hp.distanceTo(tp) + 0.01); qq.setFromUnitVectors(zA, dir.normalize());
    tracers.setMatrixAt(nt++, m4.compose(hp.clone().add(tp).multiplyScalar(0.5), qq, sv)); if (nt >= 12) break; }
  for (let k = nt; k < 12; k++) tracers.setMatrixAt(k, m4.makeScale(0, 0, 0)); tracers.instanceMatrix.needsUpdate = true;
  // pixel stays hidden in the pocket (peeks once he is down)
  { const pk = hero.pocket.getWorldPosition(new THREE.Vector3()), peek = Q(84, 85, t);
    pixel.g.position.copy(pk).add(v3(0, 0.04 * peek, 0)); pixel.g.rotation.set(0, S.rotY, 0); pixel.g.scale.setScalar(0.42); poseSkitterling(pixel, { curl: 1 - peek, eyeOpen: 1, look: 0, t }); pixel.g.visible = peek > 0.05; }
  sun.target.position.copy(a); sun.position.copy(a).add(v3(80, 110, -200));
  crack.style.opacity = t > 65.3 && (S.scene >= 7 || t < 66.2) ? 1 : 0;
  alarm.style.opacity = t > 66 ? 0.35 + 0.35 * Math.max(0, Math.sin(t * 6)) : 0;

  // ---- cameras ----
  let pos, fov = 58;
  switch (S.scene) {
    case 1: pos = a.clone().addScaledVector(fwd, 4.5).addScaledVector(right, 1.6).add(v3(0, 1.4, 0)); look.copy(a).add(v3(0, 1.3, 0)); fov = 60; break;
    case 2: if (t < 15) { const k = Q(9, 15, t); pos = a.clone().addScaledVector(fwd, -6 - 6 * k).addScaledVector(right, 3).add(v3(0, 2 + 6 * k, 0)); look.copy(a).addScaledVector(fwd, 30).add(v3(0, 6, 0)); fov = 64; }
      else { pos = a.clone().addScaledVector(fwd, 3.2).addScaledVector(right, 1.0).add(v3(0, 0.8, 0)); look.copy(a).add(v3(0, 1.2, 0)); fov = 62; }
      break;
    case 3: { const k = Q(22.4, 31, t); pos = a.clone().addScaledVector(fwd, -4).addScaledVector(right, -2).add(v3(0, 0.8, 0)); look.copy(tHead).lerp(v3(T.x, H(T.x, T.z) + 4, T.z), 1 - k); fov = 70; break; }
    case 4: if (t < 44.3) { pos = a.clone().addScaledVector(fwd, 4.5).addScaledVector(right, 2).add(v3(0, 1.2, 0)); look.copy(a).add(v3(0, 3, 0)).lerp(tHead, 0.35); fov = 70; }
      else { pos = v3(-3, H(-3, -12) + 3.5, -12); look.copy(a).lerp(claw, 0.4); fov = 64; }
      break;
    case 5: if (t < 58) { pos = head.clone().addScaledVector(fwd, -1.8).addScaledVector(right, 0.7).add(v3(0, 0.3, 0)); look.copy(tEye); fov = 60; }
      else { pos = a.clone().add(v3(-8, 3, 10)); look.copy(a).lerp(tHead, 0.5); fov = 66; }
      break;
    case 6: pos = v3(-30, H(-30, -26) + 4, -26); look.copy(a).lerp(claw, 0.4).add(v3(0, 2, 0)); fov = 64; break;
    case 7: { pos = head.clone().add(v3(0, 1.3, 0.25)); look.copy(head); fov = 50; break; }                       // above his cracked visor
    default: { const k = Q(88, 100, t); pos = head.clone().add(v3(1.0 + 2 * k, 0.6 + 1.5 * k, 1.5 + 2 * k)); look.copy(head).lerp(tHead, 0.5 + 0.2 * k); fov = 66; }
  }
  aim(camera, pos, look, H, fov);
  if ((t > 22 && t < 31) || (t > 44.3 && t < 45.5) || (t > 65.1 && t < 66.3)) { const sk = 0.03; camera.rotation.z += (hash2(Math.floor(t * 60), 3) - 0.5) * sk; camera.rotation.x += (hash2(Math.floor(t * 60), 4) - 0.5) * sk; }
  postFx(engine, EP, t, { exposure: 2.2, flashes: [[0.5, 0.8, 2.5], [44.3, 0.3, 4], [65.2, 0.9, 3]], glitch: t > 65.2 && t < 66 ? 0.3 : 0 });
}

run({ EP, engine, scene, camera, update, hud, dbg: { moonH: H, hero, devState } });
