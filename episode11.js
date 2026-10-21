// Episode 11 — "Without ECHO". An ice world in a blizzard, no HUD. Pixel guides him to a frozen waterfall with the
// third key inside; he shoots his way in. Then red eyes in the snow, a fall down an ice slope... and they take Pixel.
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, d2, faceTo, lerpAng, ease,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeDaySky } from './engine/sky.js';
import { makeGate, makeKey } from './engine/props.js';
import { glassMat, makeSpireField, crystalClusterGeo } from './engine/glass.js';
import { makeHollow, poseHollow, makeHollowArmy } from './engine/hollow.js';

const EP = await loadEpisode('11');
const { engine, scene, camera, world } = makeStage({ fog: [0x586888, 20, 260] });
const FALL = P2(4, -46), SLOPE0 = P2(-6, -40), SLOPE1 = P2(-18, -10);
function H(x, z) {
  const base = (fbm(x * 0.04 + 2, z * 0.04) - 0.5) * 2.0;
  const canyon = 18 * smooth(14, 30, Math.abs(x - 2)) * smooth(-10, -30, z);           // canyon walls around the waterfall
  const slope = 7 * smooth(-36, -8, -z) * smooth(-30, -4, -x) * 0;
  const far = Math.hypot(x, z + 20);
  return base + canyon + slope + (fbm(x * 0.008, z * 0.008 + 3) - 0.4) * 60 * smooth(70, 260, far);
}
const sky = makeDaySky({ pal: { top: '#1e2640', mid: '#4a5878', horizon: '#7a88a4', below: '#5a6a88' }, suns: [{ dir: [0.3, 0.25, -1], r: 50, color: [2.2, 2.3, 2.6] }], seed: 11, clouds: 80 });
world.add(sky.group);
const cA = new THREE.Color(0xc8d4e4), cB = new THREE.Color(0x7a90b0);
world.add(makeTerrain({ H, col: (x, z, c) => c.copy(cA).lerp(cB, smooth(0.4, 0.75, fbm(x * 0.06, z * 0.06 + 1))), set: SET.ROCK, mat: { roughness: 0.6 } }));
const ice = glassMat(0xbfe0ff, 0x3a7ab8, { emissiveIntensity: 0.35, roughness: 0.15 });
world.add(makeSpireField({ n: 70, rMin: 40, rMax: 320, heightFn: H, mat: ice, hMin: 4, hMax: 30, avoid: (x, z) => Math.abs(x - 2) < 22 && z > -70 && z < 20 }));
// the frozen waterfall: a curtain of ice columns spilling over the canyon end, key glowing inside
const fallGeo = []; for (let i = 0; i < 26; i++) { const x = FALL.x - 11 + i * 0.9 + (hash2(i, 1) - 0.5) * 0.6, h = 14 + hash2(i, 2) * 8; const g = new THREE.CylinderGeometry(0.5 + hash2(i, 3) * 0.6, 0.9 + hash2(i, 4) * 0.8, h, 6); g.translate(x, H(x, FALL.z) + h / 2 - 0.5, FALL.z + (hash2(i, 5) - 0.5) * 1.2); fallGeo.push(g.toNonIndexed()); }
const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
const fallMat = glassMat(0xd8f0ff, 0x5aa8e8, { emissiveIntensity: 0.5, roughness: 0.1 });
const fall = new THREE.Mesh(mergeGeometries(fallGeo), fallMat); fall.castShadow = true; world.add(tag(fall, SET.METAL));
const block = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 0), glassMat(0xe8f6ff, 0x8a7ad8, { emissiveIntensity: 0.6, roughness: 0.05 })); block.position.set(FALL.x, H(FALL.x, FALL.z) + 4.2, FALL.z + 1.4); block.scale.set(1.3, 1.1, 0.8); world.add(tag(block, SET.METAL));
const key = makeKey(2, 1.5); key.g.position.copy(block.position); world.add(key.g);
const keyLight = new THREE.PointLight(0xc8a8ff, 18, 14, 1.4); keyLight.position.copy(block.position); world.add(keyLight);
const gate = makeGate(3.0, new THREE.MeshStandardMaterial({ color: 0x8a9ab0, roughness: 0.6, flatShading: true }), [0.8, 1.4, 2.4]); gate.g.position.set(0, H(0, 4) + 3.2, 4.2); world.add(gate.g);
const snow = makePool(2200, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x8090a0 }), SET.SUIT); world.add(snow.mesh);
const shards = makePool(900, new THREE.TetrahedronGeometry(1, 0), glassMat(0xe0f4ff, 0x6ab0e8, { emissiveIntensity: 0.8 }), SET.METAL); world.add(shards.mesh);
const tracers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glow(0.7, 2.2, 2.6), 12); tracers.frustumCulled = false; world.add(tag(tracers, SET.ENERGY));
const prints = makePool(200, new THREE.CylinderGeometry(1, 1, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x7088a8, roughness: 1 }), SET.ROCK); world.add(prints.mesh);
// the Hollow in the blizzard
const pack = makeHollowArmy(10); world.add(pack.group);
const grabber = makeHollow('scout'); world.add(grabber.root);
const sun = new THREE.DirectionalLight(0xe8f0ff, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 300 });
const hemi = new THREE.HemisphereLight(0xa8b8e0, 0x4a5a78, 0.9); world.add(sun, sun.target, hemi);

// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 6;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const SHOTS = []; for (let t = 41.2; t < 45.6; t += 0.13) if ((t - 41.2) % 1.3 < 0.85) SHOTS.push(+t.toFixed(3));
const STAND = P2(FALL.x - 1.2, FALL.z + 9);
function devState(t) {
  const S = { x: 0, z: 2.4, y: 0, rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0.12, jet: 0, air: 0, scene: 1 };
  S.scene = t < 9 ? 1 : t < 22 ? 2 : t < 36 ? 3 : t < 50 ? 4 : t < 62 ? 5 : t < 74 ? 6 : t < 86 ? 7 : 8;
  if (t < 34) {
    const path = [P2(0, 2.4), P2(-3, -14), P2(STAND.x, STAND.z)], k = Q(1.4, 33.4, t), f = k * 2, i = Math.min(1, Math.floor(f)), kk = f - i;
    S.x = lerp(path[i].x, path[i + 1].x, kk); S.z = lerp(path[i].z, path[i + 1].z, kk); S.rotY = faceTo(path[i], path[i + 1]);
    S.walk = Q(1.4, 1.8, t) * (1 - Q(33, 33.4, t)); S.phase = k * 36 / 0.45 * PI; S.lookUp = 0.5 * Q(23, 26, t) - 0.1;
    S.headYaw = 0.5 * Math.sin(t * 0.5) * (1 - Q(20, 22, t)) + 0.6 * Q(14, 15, t) * (1 - Q(17, 18, t));
    return S;
  }
  S.x = STAND.x; S.z = STAND.z; S.rotY = faceTo(STAND, FALL);
  if (t < 50) { const aimK = Q(40.2, 41.0, t) * (1 - Q(45.8, 46.6, t)); S.armRo = { x: -1.6, z: 0.08, ex: -0.3, w: aimK }; S.armLo = { x: -1.5, z: -0.3, ex: -0.9, w: aimK }; S.lookUp = 0.3 + 0.2 * aimK; S.lean = 0; S.crouch = 0.4 * Q(46.2, 46.6, t) * (1 - Q(48, 49, t)); return S; }
  if (t < 62) {                                                                // climbs the rubble to the key
    const top = P2(FALL.x - 0.2, FALL.z + 3.2), k = Q(50.4, 54.6, t); S.x = lerp(STAND.x, top.x, k); S.z = lerp(STAND.z, top.z, k); S.y = 2.2 * Q(51, 54.6, t);
    S.walk = Q(50.4, 50.8, t) * (1 - Q(54.2, 54.6, t)); S.phase = k * 14; S.crouch = 0.3 * S.walk; S.lean = 0.2 * S.walk;
    const reach = Q(55, 56.2, t) * (1 - Q(59.5, 60.5, t)); S.armRo = { x: -1.9, z: -0.05, ex: -0.3, w: reach }; S.lookUp = 0.4 * reach;
    return S;
  }
  // red eyes; he runs, slides down the slope, Pixel is thrown off
  const top = P2(FALL.x - 0.2, FALL.z + 3.2);
  if (t < 75.6) { const k = Q(66.4, 75.6, t); S.x = lerp(top.x, SLOPE0.x, k); S.z = lerp(top.z, SLOPE0.z, k); S.y = 2.2 * (1 - Q(66.4, 67.4, t)); S.rotY = lerpAng(faceTo(STAND, FALL), faceTo(top, SLOPE0), Q(65.6, 66.6, t)); S.run = Q(66.4, 66.8, t); S.walk = S.run; S.phase = k * 14 / 0.85 * PI; S.headYaw = 0.8 * Math.sin(t * 1.3) * Q(68, 69, t); S.lookUp = 0.2 * (1 - Q(62, 64, t)) + 0.35 * Q(62.6, 63.6, t) * (1 - Q(65, 66, t)); return S; }
  if (t < 80.2) { const k = ease(Q(75.6, 79.6, t)); S.x = lerp(SLOPE0.x, SLOPE1.x, k); S.z = lerp(SLOPE0.z, SLOPE1.z, k); S.rotY = faceTo(SLOPE0, SLOPE1); S.crouch = 0.7; S.lean = -0.5; S.armRo = { x: -0.5, z: -0.9, ex: -0.3, w: 1 }; S.armLo = { x: -0.5, z: 0.9, ex: -0.3, w: 1 }; return S; }
  S.x = SLOPE1.x; S.z = SLOPE1.z; S.rotY = faceTo(SLOPE1, P2(-12, -16)); S.crouch = 0.8 * (1 - Q(82, 84, t)) + 0.3 * Q(88, 89, t);
  const reachOut = Q(88.6, 89.6, t); S.armRo = { x: -1.6, z: 0.2, ex: -0.1, w: reachOut }; S.lookUp = 0.2 * reachOut; S.lean = 0.2 * reachOut;
  return S;
}
const FOOT = footsteps(devState, EP.duration, S => ({ x: S.x, z: S.z }));
const PIXP = P2(-14.2, -14.6);                                                  // where Pixel lands in the snow
window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false, run: f.run })), shots: SHOTS };

const look = new THREE.Vector3();
const hud = makeHud(EP, { visor: [[0.6, 9.0, 'ECHO ▯ OFFLINE\nHUD  ▯ OFFLINE\nMAP  ▯ —']] });
const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sv = new THREE.Vector3(), zA = new THREE.Vector3(0, 0, 1);
const PACK = [...Array(10)].map((_, i) => ({ a: -1.2 + i * 0.27, r: 14 + hash2(i, 3) * 8, on: 62.6 + i * 0.25 + hash2(i, 4) * 0.6 }));

function update(t) {
  const S = devState(t);
  poseHero(hero, S, t);
  hero.root.position.set(S.x, H(S.x, S.z) + S.y, S.z); hero.root.rotation.set(0, S.rotY, 0); hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = hero.head.getWorldPosition(new THREE.Vector3()), hand = hero.handR.getWorldPosition(new THREE.Vector3());
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  hero.cyanMat.color.setRGB(0.12, 0.3, 0.35);                                  // ECHO is gone: the suit's lights are dead
  hero.handGun.visible = t > 39.8 && t < 46.4; hero.gun.visible = !hero.handGun.visible;
  gate.set(t, 1 - Q(1.0, 2.6, t));
  // the waterfall breaks open
  const brk = Q(45.6, 47.0, t);
  fallMat.emissiveIntensity = 0.5 + 1.5 * pulse(t, 41.2, 1) * (t < 46 ? 1 : 0); block.visible = t < 46.2;
  // key: in the ice -> in his hand
  key.spin(t); if (t > 56.2) { key.g.position.copy(hand).add(v3(0, 0.12, 0)); key.g.scale.setScalar(0.45); } keyLight.position.copy(key.g.position); keyLight.intensity = 18 + 14 * pulse(t, 46.2, 0.6);
  // shards, snow, prints
  const SH = [];
  { const dt = t - 46.2; if (dt > 0 && dt < 4) for (let i = 0; i < 900; i++) { const ang = hash2(i, 1) * 6.28, hv = 2 + hash2(i, 2) * 8, vv = 1 + hash2(i, 3) * 7, c = block.position;
    const x = c.x + Math.cos(ang) * hv * dt, z = c.z + Math.abs(Math.sin(ang)) * hv * dt, y = Math.max(H(x, z) + 0.1, c.y + vv * dt - 6 * dt * dt); SH.push({ x, y, z, s: 0.06 + hash2(i, 4) * 0.22, rx: dt * 5 + i, ry: i }); } }
  for (const [k, sh] of SHOTS.entries()) { const dt = t - sh; if (dt < 0 || dt > 0.6) continue; for (let i = 0; i < 12; i++) { const c = block.position.clone().add(v3((hash2(k, 1) - 0.5) * 3, (hash2(k, 2) - 0.5) * 3, 1)); SH.push({ x: c.x + (hash2(k, i) - 0.5) * dt * 6, y: c.y + dt * 3 - 5 * dt * dt, z: c.z + hash2(k, i + 3) * dt * 5, s: 0.06, rx: i }); } }
  shards.set(SH);
  const blizz = 1 + 1.4 * Q(60, 66, t);
  { const L = []; for (let i = 0; i < 2200; i++) { const ph = (hash2(i, 1) * 30 + t * 9 * blizz * (0.6 + hash2(i, 2) * 0.6)) % 30; L.push({ x: a.x - 15 + ph, y: a.y + hash2(i, 3) * 9 - ph * 0.12, z: a.z + (hash2(i, 4) - 0.5) * 30, s: 0.02 + hash2(i, 5) * 0.03 }); } snow.set(L); }
  prints.set(FOOT.filter(f => f.t < t && t - f.t < 20).map(f => ({ x: f.x, y: H(f.x, f.z) + 0.01, z: f.z, s: 0.14 })));
  scene.fog.near = 20 / blizz; scene.fog.far = 260 / blizz;
  // tracers at the ice
  let nt = 0; const muzzle = hero.muzzle.getWorldPosition(new THREE.Vector3());
  for (const [k, sh] of SHOTS.entries()) { const dt = t - sh; if (dt < 0 || dt > 0.12) continue; const end = block.position.clone().add(v3((hash2(k, 1) - 0.5) * 3, (hash2(k, 2) - 0.5) * 3, 1.5)), dir = end.clone().sub(muzzle), u = Math.min(1, dt / 0.1);
    const hp = muzzle.clone().addScaledVector(dir, u), tp = muzzle.clone().addScaledVector(dir, Math.max(0, u - 0.15)); sv.set(0.04, 0.04, hp.distanceTo(tp) + 0.01); qq.setFromUnitVectors(zA, dir.normalize()); tracers.setMatrixAt(nt++, m4.compose(hp.clone().add(tp).multiplyScalar(0.5), qq, sv)); if (nt >= 12) break; }
  for (let k = nt; k < 12; k++) tracers.setMatrixAt(k, m4.makeScale(0, 0, 0)); tracers.instanceMatrix.needsUpdate = true;
  // red eyes in the blizzard, circling closer
  const PL = PACK.map((p, i) => { if (t < p.on) return null; const close = Q(p.on, 88, t), ang = p.a + Math.sin(t * 0.3 + i) * 0.2, r = p.r * (1 - 0.45 * close), cx = (FALL.x + SLOPE1.x) / 2, cz = (FALL.z + SLOPE1.z) / 2;
    const x = cx + Math.sin(ang) * r - 8, z = cz + Math.cos(ang) * r; return { on: true, x, y: H(x, z), z, rotY: faceTo(P2(x, z), P2(a.x, a.z)), pose: { crawl: 0.85, walk: 1, phase: t * 6 + i, t, twitch: 1 }, eye: Q(p.on, p.on + 0.3, t) * 1.4 }; });
  pack.set(PL);
  // the grabber: out of the snow, snatches Pixel, leaps away
  const gOn = t > 85.4;
  grabber.root.visible = gOn; grabber.setCloak(1, 0, t);
  if (gOn) { const k = Q(85.6, 87.6, t), out = Q(89.2, 92, t), p0 = P2(PIXP.x - 9, PIXP.z - 6), p2 = P2(PIXP.x - 20, PIXP.z - 22);
    const gx = out > 0 ? lerp(PIXP.x, p2.x, out) : lerp(p0.x, PIXP.x - 0.6, k), gz = out > 0 ? lerp(PIXP.z, p2.z, out) : lerp(p0.z, PIXP.z - 0.6, k);
    grabber.root.position.set(gx, H(gx, gz) + 4 * Math.sin(PI * out), gz); grabber.root.rotation.set(0, out > 0 ? faceTo(PIXP, p2) : faceTo(p0, PIXP), 0);
    poseHollow(grabber, { crawl: 1, walk: k < 1 ? 1 : out > 0 ? 1 : 0, phase: t * 10, t, reach: Q(87.4, 88.2, t), twitch: 1 }); }
  grabber.root.updateMatrixWorld(true);
  // pixel: shoulder -> guiding (stripes glow toward the key) -> thrown into the snow -> grabbed
  {
    const sh = hero.shoulderL.getWorldPosition(new THREE.Vector3());
    if (t < 77.4) { pixel.g.position.copy(sh); pixel.g.rotation.set(0, S.rotY + 0.5 * Math.sin(t) * (t > 9 && t < 22 ? 1 : 0.3), 0); pixel.g.scale.setScalar(0.55);
      poseSkitterling(pixel, { curl: t > 62.6 && t < 66 ? 0.3 : 0, eyeOpen: 1, look: Math.sin(t * 0.9) * 0.5, t }); }
    else if (t < 88.2) { const k = Q(77.4, 78.6, t), p = sh.clone().lerp(v3(PIXP.x, H(PIXP.x, PIXP.z), PIXP.z), k); p.y += 2.2 * Math.sin(PI * k); pixel.g.position.copy(p); pixel.g.rotation.set(k * 6, 0, 0);
      if (t > 78.6) { pixel.g.rotation.set(0, 0.6, 0); poseSkitterling(pixel, { curl: 1 - Q(80, 81, t), eyeOpen: 1, look: Math.sin(t * 3) * 0.6, t }); } pixel.g.scale.setScalar(0.65); }
    else { const claw = grabber.armR.wr.getWorldPosition(new THREE.Vector3()); pixel.g.position.copy(claw).add(v3(0, -0.3, 0)); poseSkitterling(pixel, { curl: 0.6, eyeOpen: 1, look: Math.sin(t * 8) * 0.8, t }); pixel.g.scale.setScalar(0.65); }
    pixel.stripe.color.setRGB(0.3, 1.7, 1.9).multiplyScalar(t > 9 && t < 22 ? 1 + 0.8 * Math.max(0, Math.sin(t * 4)) : t > 62.6 ? (Math.sin(t * 20) > 0 ? 2 : 0.6) : 1);
    if (t > 62.6) pixel.stripe.color.setRGB(1.9, 0.4, 0.4).multiplyScalar(Math.sin(t * 20) > 0 ? 1.4 : 0.5);
  }
  sun.target.position.copy(a); sun.position.copy(a).add(v3(40, 50, -100));

  // ---- cameras ----
  let pos, fov = 58;
  switch (S.scene) {
    case 1: pos = a.clone().addScaledVector(fwd, 4).addScaledVector(right, 1.5).add(v3(0, 1.4, 0)); look.copy(a).add(v3(0, 1.3, 0)); fov = 60; break;
    case 2: if (t < 15.6) { pos = sh2(a, fwd, right, 1.2); look.copy(pixel.g.position); fov = 46; } else { pos = a.clone().addScaledVector(fwd, -5).addScaledVector(right, 2).add(v3(0, 2.2, 0)); look.copy(a).addScaledVector(fwd, 12).add(v3(0, 2, 0)); fov = 62; } break;
    case 3: { const k = Q(22, 36, t); pos = a.clone().addScaledVector(fwd, -4 - 4 * k).addScaledVector(right, 1.5).add(v3(0, 1.4 + 2 * k, 0)); look.copy(block.position).lerp(a.clone().add(v3(0, 1.5, 0)), 0.3 * (1 - k)); fov = 62; break; }
    case 4: if (t < 45.6) { pos = head.clone().addScaledVector(fwd, -1.4).addScaledVector(right, 0.6).add(v3(0, 0.2, 0)); look.copy(block.position); fov = 54; } else { pos = v3(FALL.x + 9, H(FALL.x, FALL.z) + 3, FALL.z + 14); look.copy(block.position); fov = 62; } break;
    case 5: if (t < 55) { pos = a.clone().addScaledVector(fwd, -3).addScaledVector(right, 2).add(v3(0, 1.4, 0)); look.copy(a).add(v3(0, 1.8, 0)).lerp(block.position, 0.3); fov = 60; } else { pos = a.clone().addScaledVector(fwd, 2.0).addScaledVector(right, 1.3).add(v3(0, 1.9, 0)); look.copy(hand).lerp(head, 0.3); fov = 50; } break;
    case 6: if (t < 66) { pos = a.clone().addScaledVector(fwd, 3.2).addScaledVector(right, 0.8).add(v3(0, 1.7, 0)); look.copy(a).add(v3(0, 1.6, 0)); fov = 54; } else { pos = a.clone().addScaledVector(fwd, 4).addScaledVector(right, -1.4).add(v3(0, 1.3, 0)); look.copy(a).add(v3(0, 1.3, 0)); fov = 64; } break;
    case 7: pos = a.clone().addScaledVector(fwd, 5).add(v3(0, 1.5, 0)).addScaledVector(right, 2.5); look.copy(a).add(v3(0, 0.8, 0)); fov = 66; break;
    default: { const g = grabber.root.position; pos = a.clone().addScaledVector(right, 2.5).addScaledVector(fwd, -2.2).add(v3(0, 1.4, 0)); look.copy(v3(PIXP.x, H(PIXP.x, PIXP.z) + 0.8, PIXP.z)).lerp(g, Q(89, 92, t) * 0.6); fov = 58; }
  }
  aim(camera, pos, look, H, fov);
  postFx(engine, EP, t, { exposure: 2.0, flashes: [[0.5, 0.8, 2.5], [46.2, 0.3, 3]] });
}
function sh2(a, fwd, right, d) { return a.clone().addScaledVector(fwd, d * 0.9).addScaledVector(right, -0.5).add(v3(0, 1.75, 0)); }

run({ EP, engine, scene, camera, update, hud, dbg: { moonH: H, hero, devState } });
