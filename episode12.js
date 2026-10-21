// Episode 12 — "The Hive". Tracks in the snow lead to a hive spire. Bone corridors, a patrol, a chamber of captured
// creatures, Pixel in a red cage. The hive wakes; a dead end; a human hand pulls him into the dark.
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, d2, faceTo, lerpAng, ease,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeDaySky } from './engine/sky.js';
import { makeHollowArmy } from './engine/hollow.js';
import { makeCorridor, makePodChamber, makeHiveSpire, makeMira, boneMat } from './engine/hive.js';

const EP = await loadEpisode('12');
const { engine, scene, camera, world } = makeStage({ fog: [0x586888, 20, 400] });

// ---- outside: the ice plain and the spire ----
const HIVE = v3(0, 0, -90);
const H = (x, z) => (fbm(x * 0.04 + 2, z * 0.04) - 0.5) * 2.0 + 6 * smooth(10, 0, Math.hypot(x, z)) * 0 + (fbm(x * 0.008, z * 0.008 + 3) - 0.4) * 60 * smooth(160, 400, Math.hypot(x, z + 80));
const outside = new THREE.Group(); world.add(outside);
outside.add(makeDaySky({ pal: { top: '#1e2640', mid: '#4a5878', horizon: '#7a88a4', below: '#5a6a88' }, suns: [{ dir: [0.3, 0.25, -1], r: 50, color: [2.2, 2.3, 2.6] }], seed: 12, clouds: 80 }).group);
outside.add(makeTerrain({ H, col: (x, z, c) => c.setRGB(0.78, 0.83, 0.9).lerp(new THREE.Color(0.48, 0.56, 0.69), smooth(0.4, 0.75, fbm(x * 0.06, z * 0.06 + 1))), set: SET.ROCK, mat: { roughness: 0.6 } }));
const spire = makeHiveSpire(1); spire.g.position.copy(HIVE); spire.g.position.y = H(HIVE.x, HIVE.z) - 1; outside.add(spire.g);
const tracks = makePool(160, new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: 0x485a78, roughness: 1 }), SET.ROCK); outside.add(tracks.mesh);
tracks.set([...Array(160)].map((_, i) => { const z = -2 - i * 0.37, x = Math.sin(i * 0.4) * 0.5 + (i % 2 ? 0.25 : -0.25); return { x, y: H(x, z), z, s: 0.12 }; }));
const snow = makePool(1600, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8090a0 }), SET.SUIT); outside.add(snow.mesh);
const oSun = new THREE.DirectionalLight(0xe8f0ff, 1.8); oSun.position.set(60, 80, 60); outside.add(oSun, new THREE.HemisphereLight(0xa8b8e0, 0x4a5a78, 0.9));

// ---- inside ----
const IN = v3(3000, 0, 0);
const inside = new THREE.Group(); inside.position.copy(IN); world.add(inside);
const bone = boneMat();
const C1 = makeCorridor([v3(0, 0, 0), v3(0, 0, -14), v3(2, 0, -26), v3(8, 0, -40), v3(12, 0, -50)], { bone }); inside.add(C1.g);
const CH = v3(12, 0, -64);
const chamber = makePodChamber({ R: 14, h: 16 }); chamber.g.position.copy(CH); inside.add(chamber.g);
const C2 = makeCorridor([v3(24, 0, -66), v3(34, 0, -68), v3(42, 0, -76), v3(46, 0, -88)], { bone }); inside.add(C2.g);
const deadEnd = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), new THREE.MeshStandardMaterial({ color: 0x241a20, roughness: 0.8, side: THREE.BackSide })); deadEnd.position.set(46, 1.6, -89);   // (not added: it hid the crevice)
const cageMat = glow(2.2, 0.2, 0.3, { transparent: true, opacity: 0.9 });
const cage = new THREE.Group(); cage.position.copy(CH).add(v3(0, 1.2, 0)); inside.add(cage);
cage.add(tag(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.2, 8), bone), SET.METAL)).children;
const ped = cage.children[0]; ped.position.y = -0.6;
const bars = []; for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), cageMat); b.position.set(Math.sin(a) * 0.4, 0.45, Math.cos(a) * 0.4); cage.add(tag(b, SET.ENERGY)); bars.push(b); }
const lockRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 4, 24), cageMat); lockRing.rotation.x = PI / 2; lockRing.position.y = 0.9; cage.add(tag(lockRing, SET.ENERGY));
// patrol + the hive waking
const army = makeHollowArmy(18); world.add(army.group);
const scanLight = new THREE.SpotLight(0xff2a30, 0, 18, 0.35, 0.5, 1); inside.add(scanLight, scanLight.target);
const scanCone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 16, 1, true), glow(1.2, 0.08, 0.12, { transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
inside.add(tag(scanCone, SET.ENERGY, true));
for (const u of [0.15, 0.4, 0.65, 0.9]) { const p = C1.curve.getPointAt(u); const l = new THREE.PointLight(0xff4a50, 14, 12, 1.5); l.position.set(p.x, 3.0, p.z); inside.add(l); }
for (const u of [0.2, 0.5, 0.85]) { const p = C2.curve.getPointAt(u); const l = new THREE.PointLight(0xff4a50, 14, 12, 1.5); l.position.set(p.x, 3.0, p.z); inside.add(l); }
const faceFill = new THREE.PointLight(0xffc8b8, 0, 6, 1.2); world.add(faceFill);
const inHemi = new THREE.HemisphereLight(0x8a4a5a, 0x100810, 1.2), inRed = new THREE.PointLight(0xff3040, 30, 40, 1.4); inRed.position.copy(CH).add(v3(0, 12, 0)); inside.add(inHemi, inRed);
const sparks = makePool(300, new THREE.IcosahedronGeometry(1, 0), glow(2.2, 0.3, 0.3), SET.ENERGY); inside.add(sparks.mesh);
const tracers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glow(0.7, 2.2, 2.6), 6); tracers.frustumCulled = false; inside.add(tag(tracers, SET.ENERGY));
// Mira hides in a crevice by the dead end
const mira = makeMira(); world.add(mira.root); const MIRA = v3(44.2, 0, -87.2);

// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 8; hero.cyanMat.color.setRGB(0.12, 0.3, 0.35);
const pixel = makeSkitterling(1); scene.add(pixel.g);
const IN_T = 19.0, RESCUE = 54.6, GRAB = 79.2;
const P1 = C1.curve, P2c = C2.curve;
function devState(t) {
  const S = { inside: false, x: 0, z: 0, y: 0, rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0.3, headYaw: 0, armRo: null, armLo: null, lean: 0.1, air: 0, scene: 1 };
  S.scene = t < 9 ? 1 : t < IN_T ? 2 : t < 36 ? 3 : t < 50 ? 4 : t < 62 ? 5 : t < 74 ? 6 : t < 86 ? 7 : 8;
  if (t < 9) { S.lookUp = 0.4 * Q(3, 6, t); return S; }
  if (t < IN_T) { const k = Q(9.2, 18.8, t); S.z = lerp(-36, -59, k); S.y = 4 * Q(16, 18.8, t); S.walk = Q(9.2, 9.6, t); S.phase = k * 23 / 0.52 * PI; S.lookUp = 0.6 * (1 - Q(12, 15, t)); return S; }
  S.inside = true;
  if (t < 50) {
    // corridor with a hide in a rib recess while the patrol passes
    let u = Q(IN_T + 0.4, 25.2, t) * 0.24 + Q(33.6, 39.4, t) * 0.76; const p = P1.getPointAt(Math.min(1, u)), q = P1.getPointAt(Math.min(1, u + 0.01));
    S.x = p.x; S.z = p.z; S.rotY = faceTo(P2(p.x, p.z), P2(q.x, q.z)); S.walk = (Q(IN_T + 0.4, IN_T + 0.8, t) * (1 - Q(24.8, 25.2, t))) + Q(33.6, 34, t) * (1 - Q(39, 39.4, t)); S.phase = u * C1.L / 0.5 * PI;
    const hide = Q(25.2, 26.0, t) * (1 - Q(32.8, 33.6, t)); S.x += 1.2 * hide; S.crouch = 0.75 * hide; S.rotY += PI / 2 * hide; S.lookUp = 0.1 - 0.1 * hide;
    if (t > 39.4) { const k = Q(39.6, 47, t); S.x = lerp(12, CH.x - 1.6, k); S.z = lerp(-50, CH.z + 3.4, k); S.rotY = faceTo(P2(12, -50), P2(CH.x, CH.z)); S.walk = Q(39.6, 40, t) * (1 - Q(46.6, 47, t)); S.phase = k * 13 / 0.5 * PI; S.lookUp = 0.6 * Q(40, 42, t) * (1 - Q(46, 48, t)); S.headYaw = 0.7 * Math.sin((t - 40) * 0.5) * Q(40, 41, t) * (1 - Q(46, 47, t)); }
    return S;
  }
  if (t < 64) {
    S.x = CH.x - 1.6; S.z = CH.z + 3.4; S.rotY = faceTo(P2(S.x, S.z), P2(CH.x, CH.z)); S.lookUp = -0.1;
    const aimK = Q(53.2, 54, t) * (1 - Q(55, 55.8, t)); S.armRo = { x: -1.3, z: 0.08, ex: -0.3, w: aimK }; S.armLo = { x: -1.2, z: -0.3, ex: -0.9, w: aimK };
    const hug = Q(56.6, 57.4, t) * (1 - Q(62, 63, t)); if (hug > 0) { S.armRo = { x: -0.9, z: 0.25, ex: -1.4, w: hug }; S.armLo = { x: -0.9, z: -0.25, ex: -1.4, w: hug }; S.lookUp = -0.35 * hug; }
    if (t > 62.6) S.headYaw = 0.8 * Math.sin(t * 2.2);
    return S;
  }
  // run out the far corridor to the dead end
  const k = Q(64.4, 78.0, t); const start = v3(CH.x - 1.6, 0, CH.z + 3.4);
  if (k < 0.15) { const kk = k / 0.15, p = start.clone().lerp(v3(24, 0, -66), kk); S.x = p.x; S.z = p.z; S.rotY = faceTo(P2(start.x, start.z), P2(24, -66)); }
  else { const u = (k - 0.15) / 0.85, p = P2c.getPointAt(Math.min(1, u)), q = P2c.getPointAt(Math.min(1, u + 0.01)); S.x = p.x; S.z = p.z; S.rotY = faceTo(P2(p.x, p.z), P2(q.x, q.z)); }
  S.run = Q(64.4, 64.8, t) * (1 - Q(77.6, 78, t)); S.walk = S.run; S.phase = k * 40 / 0.85 * PI;
  if (t > 78) { S.rotY = lerpAng(S.rotY, S.rotY + PI, Q(78, 78.8, t)); S.lookUp = 0.1; }
  if (t > GRAB) { const g = Q(GRAB, GRAB + 0.9, t); S.x = lerp(46, MIRA.x + 0.6, g); S.z = lerp(-88, MIRA.z + 0.9, g); S.rotY = faceTo(P2(S.x, S.z), P2(MIRA.x, MIRA.z)); S.crouch = 0.35 * g; S.lean = 0.2; }
  return S;
}
const FOOT = footsteps(devState, EP.duration);
window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false, run: f.run })), shots: [54.2, 54.35, 54.5] };

const look = new THREE.Vector3();
const hud = makeHud(EP, { visor: [] });
const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sv = new THREE.Vector3(), zA = new THREE.Vector3(0, 0, 1);
// patrol path (two walkers coming down the corridor past his hiding place); wall sleepers that wake
const SLEEP = [...Array(16)].map((_, i) => { const a = i / 16 * PI * 2 + 0.2; return { x: CH.x + Math.sin(a) * 12.6, z: CH.z + Math.cos(a) * 12.6, a, on: 62.8 + hash2(i, 1) * 3 }; });

function update(t) {
  const S = devState(t), inT = S.inside;
  outside.visible = !inT; inside.visible = inT;
  scene.fog.color.set(inT ? 0x1a0c10 : 0x586888); scene.fog.near = inT ? 4 : 20; scene.fog.far = inT ? 40 : 400;
  const base = inT ? IN : v3(0, 0, 0), gy = inT ? 0 : H(S.x, S.z);
  poseHero(hero, S, t);
  hero.root.position.set(base.x + S.x, gy + S.y, base.z + S.z); hero.root.rotation.set(0, S.rotY, 0); hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = hero.head.getWorldPosition(new THREE.Vector3()), hand = hero.handR.getWorldPosition(new THREE.Vector3());
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  hero.handGun.visible = t > 52.8 && t < 56; hero.gun.visible = !hero.handGun.visible;
  hero.headLight.intensity = t > 80.4 ? 0 : 8;
  // outside snow
  if (!inT) { const L = []; for (let i = 0; i < 1600; i++) { const ph = (hash2(i, 1) * 30 + t * 9 * (0.6 + hash2(i, 2) * 0.6)) % 30; L.push({ x: a.x - 15 + ph, y: a.y + hash2(i, 3) * 9 - ph * 0.12, z: a.z + (hash2(i, 4) - 0.5) * 30, s: 0.02 + hash2(i, 5) * 0.03 }); } snow.set(L); }
  // hive: veins pulse; alarm turns everything red
  const alarm = Q(62.6, 63.4, t) * (1 - Q(80, 82, t));
  const beat = 0.5 + 0.5 * Math.sin(t * 2.4);
  C1.vein.color.setRGB(1.8, 0.12, 0.18).multiplyScalar(0.5 + 0.5 * beat + 1.5 * alarm * Math.max(0, Math.sin(t * 9)));
  inRed.intensity = 20 + 10 * beat + 80 * alarm * Math.max(0, Math.sin(t * 9));
  // patrol (t 26-33) and the waking wall sleepers (62.8+)
  const W = [];
  for (let k = 0; k < 2; k++) { const u = clamp01((t - 25.4 - k * 0.9) / 8) , on = t > 25.4 + k * 0.9 && t < 34.5 + k; const p = P1.getPointAt(Math.max(0, 0.5 - u * 0.5)), q = P1.getPointAt(Math.max(0, 0.5 - u * 0.5 - 0.01));
    W.push(on ? { on: true, x: IN.x + p.x - 0.4 + k * 0.6, y: 0, z: IN.z + p.z, rotY: faceTo(P2(p.x, p.z), P2(q.x, q.z)), pose: { crawl: 0.4, walk: 1, phase: t * 5 + k, t, twitch: 0.6 }, eye: 1.3 } : null); }
  for (const s of SLEEP) { const wake = Q(s.on, s.on + 1.5, t), go = Math.max(0, t - s.on - 1.5) * 1.2; const dx = CH.x - s.x, dz = CH.z - s.z, dl = Math.hypot(dx, dz);
    W.push(t > s.on - 4 ? { on: true, x: IN.x + s.x + dx / dl * Math.min(go, 8), y: 1.4 * (1 - wake), z: IN.z + s.z + dz / dl * Math.min(go, 8), rotY: Math.atan2(dx, dz), rx: -0.6 * (1 - wake), pose: { crawl: 0.8 - 0.6 * (1 - wake), walk: go > 0 ? 1 : 0, phase: t * 5, t, twitch: 1, rise: 0.4 + 0.6 * wake }, eye: wake * 1.4 } : null); }
  army.set(W); army.group.visible = inT;
  // scanner beam from the lead patroller
  const lead = W[0];
  scanLight.intensity = lead ? 40 : 0; scanCone.visible = !!lead;
  if (lead) { const hp = v3(lead.x, 1.8, lead.z), dir = v3(Math.sin(lead.rotY), 0, Math.cos(lead.rotY)); const sweep = Math.sin(t * 2.2) * 0.8; const tgt = hp.clone().addScaledVector(dir, 6).add(v3(Math.cos(lead.rotY) * sweep * 2.5, -1.6, -Math.sin(lead.rotY) * sweep * 2.5));
    scanLight.position.copy(hp).sub(IN); scanLight.target.position.copy(tgt).sub(IN); scanCone.position.copy(hp.clone().lerp(tgt, 0.5)).sub(IN); scanCone.lookAt(tgt); scanCone.rotateX(-PI / 2); }
  // cage: shot open at RESCUE, Pixel jumps into his arms
  const open = Q(RESCUE, RESCUE + 0.8, t);
  cageMat.opacity = 0.9 * (1 - open); for (const b of bars) b.visible = open < 0.98; lockRing.visible = open < 0.5;
  { const SP = []; const dt = t - RESCUE; if (dt > 0 && dt < 1.6) for (let i = 0; i < 300; i++) { const th = hash2(i, 1) * 6.28, v = 1 + hash2(i, 2) * 3, c = cage.getWorldPosition(new THREE.Vector3()).add(v3(0, 0.9, 0)); SP.push({ x: c.x + Math.cos(th) * v * dt, y: c.y + (hash2(i, 3) - 0.3) * v * dt - 3 * dt * dt, z: c.z + Math.sin(th) * v * dt, s: 0.03 * (1 - dt / 1.6) }); } sparks.set(SP); }
  let nt = 0; const muzzle = hero.muzzle.getWorldPosition(new THREE.Vector3()), lockW = lockRing.getWorldPosition(new THREE.Vector3());
  for (const sh of [54.2, 54.35, 54.5]) { const dt = t - sh; if (dt < 0 || dt > 0.1) continue; const dir = lockW.clone().sub(muzzle), u = Math.min(1, dt / 0.08), hp = muzzle.clone().addScaledVector(dir, u), tp = muzzle.clone().addScaledVector(dir, Math.max(0, u - 0.3));
    sv.set(0.03, 0.03, hp.distanceTo(tp) + 0.01); qq.setFromUnitVectors(zA, dir.normalize()); tracers.setMatrixAt(nt++, m4.compose(hp.clone().add(tp).multiplyScalar(0.5), qq, sv)); }
  for (let k = nt; k < 6; k++) tracers.setMatrixAt(k, m4.makeScale(0, 0, 0)); tracers.instanceMatrix.needsUpdate = true;
  {
    const cp = cage.getWorldPosition(new THREE.Vector3()).add(v3(0, 0.05, 0)), arms = hand.clone().lerp(hero.pocket.getWorldPosition(new THREE.Vector3()), 0.5).add(v3(0, 0.1, 0));
    if (!inT || t < 50) pixel.g.visible = false;
    else { pixel.g.visible = true; const j = Q(56.0, 57.0, t); const p = cp.clone().lerp(arms, j); p.y += 0.6 * Math.sin(PI * j); if (t > 62.6) p.copy(hero.pocket.getWorldPosition(new THREE.Vector3())).add(v3(0, -0.02, 0));
      pixel.g.position.copy(p); pixel.g.rotation.set(0, S.rotY + PI * (1 - j), 0); pixel.g.scale.setScalar(t > 62.6 ? 0.42 : 0.62);
      poseSkitterling(pixel, { curl: t < RESCUE ? 0.6 : t > 62.6 ? 0.8 : 0, eyeOpen: 1, look: Math.sin(t * 2) * 0.5, t });
      pixel.stripe.color.setRGB(...(t < 55.6 ? [1.2, 0.3, 0.4] : [0.3, 1.7, 1.9])).multiplyScalar(1 + 0.8 * pulse(t, 56.4, 1)); }
  }
  // Mira: a hand out of the dark, then her face lit by her red lamp
  mira.root.position.copy(IN).add(MIRA); { const r0 = faceTo(P2(MIRA.x, MIRA.z), P2(46, -88)), r1 = faceTo(P2(mira.root.position.x, mira.root.position.z), P2(a.x, a.z)); mira.root.rotation.set(0, lerpAng(r0, r1, Q(83, 85, t)), 0); }
  poseHero(mira, { crouch: 0.35, lookUp: 0.05, armRo: { x: -1.3, z: -0.2, ex: -0.2, w: Q(78.8, 79.3, t) * (1 - Q(80.4, 81.4, t)) }, headYaw: 0.1 * Math.sin(t * 0.7) }, t);
  mira.headLight.intensity = 6 * Q(84.6, 86.4, t);
  { const mf = v3(Math.sin(mira.root.rotation.y), 0, Math.cos(mira.root.rotation.y)); faceFill.position.copy(mira.head.getWorldPosition(new THREE.Vector3())).addScaledVector(mf, 1.2).add(v3(-mf.z * 1.1, 0.9, mf.x * 1.1)); faceFill.color.set(0xffc8b8); } faceFill.intensity = 5 * Q(84.6, 86.4, t) + (t > 78 && t < 84.6 ? 5 : 0); mira.root.visible = inT && t > 70;

  // ---- cameras ----
  let pos, fov = 58;
  switch (S.scene) {
    case 1: { const k = Q(0, 9, t); pos = a.clone().add(v3(1.4, 1.6 + 0.6 * k, 3.6 + 1.5 * k)); look.copy(HIVE).add(v3(0, 50 + 20 * k, 0)).lerp(a.clone().add(v3(0, 1.4, 0)), 0.25); fov = 62; break; }
    case 2: pos = a.clone().addScaledVector(fwd, -4.5).addScaledVector(right, 1.6).add(v3(0, 1.0, 0)); look.copy(a).add(v3(0, 5, 0)).lerp(HIVE.clone().add(v3(0, 20, 0)), 0.3); fov = 66; break;
    case 3: if (t < 25.4) { pos = a.clone().addScaledVector(fwd, -2.8).add(v3(0, 1.5, 0)).addScaledVector(right, 0.5); look.copy(a).addScaledVector(fwd, 6).add(v3(0, 1.2, 0)); fov = 64; }
      else { pos = a.clone().addScaledVector(fwd, 1.6).addScaledVector(right, -0.9).add(v3(0, 1.0, 0)); look.copy(a).add(v3(0, 1.0, 0)).lerp(lead ? v3(lead.x, 1.4, lead.z) : a, 0.4); fov = 56; }
      break;
    case 4: { const k = Q(39.4, 50, t); pos = IN.clone().add(CH).add(v3(Math.sin(1.8 + k) * 10, 1.8 + 6 * k, Math.cos(1.8 + k) * 10)); look.copy(a).add(v3(0, 1.2, 0)).lerp(IN.clone().add(CH).add(v3(0, 7, 0)), 0.4 * k); fov = 66; break; }
    case 5: if (t < 56) { pos = hand.clone().addScaledVector(fwd, -1.0).addScaledVector(right, 0.5).add(v3(0, 0.45, 0)); look.copy(cage.getWorldPosition(new THREE.Vector3())).add(v3(0, 0.5, 0)); fov = 50; }
      else { pos = head.clone().addScaledVector(fwd, 1.1).addScaledVector(right, 0.3).add(v3(0, -0.15, 0)); look.copy(head).add(v3(0, -0.3, 0)); fov = 46; }
      break;
    case 6: if (t < 66) { pos = IN.clone().add(CH).add(v3(-6, 3, 8)); look.copy(a).add(v3(0, 1.5, 0)); fov = 70; } else { pos = a.clone().addScaledVector(fwd, 3.4).add(v3(0, 1.3, 0)); look.copy(a).add(v3(0, 1.2, 0)); fov = 64; } break;
    case 7: if (t < GRAB) { pos = a.clone().addScaledVector(fwd, 2.4).addScaledVector(right, 0.8).add(v3(0, 1.4, 0)); look.copy(a).add(v3(0, 1.3, 0)); fov = 56; }
      else { const mh = mira.handR.getWorldPosition(new THREE.Vector3()); pos = mh.clone().add(v3(0.9, 0.4, 0.9)); look.copy(mh); fov = 50; }
      break;
    default: { const mh = mira.head.getWorldPosition(new THREE.Vector3()), mid = mh.clone().lerp(head, 0.5), dd = head.clone().sub(mh).setY(0).normalize(), pp = v3(-dd.z, 0, dd.x);
      if (t < 93) { pos = head.clone().addScaledVector(dd, 1.5).addScaledVector(pp, -1.0).add(v3(0, 0.1, 0)); look.copy(mh).add(v3(0, -0.15, 0)); fov = 34; }   // over Dev's shoulder onto Mira's face
      else { const k = Q(93, 99, t); pos = mid.clone().addScaledVector(pp, -(3.4 + 1.2 * k)).add(v3(0, 0.3 + 0.4 * k, 0)); look.copy(mid).add(v3(0, -0.25, 0)); fov = 50; } }
  }
  aim(camera, pos, look, inT ? null : H, fov);
  postFx(engine, EP, t, { exposure: inT ? 3.0 : 2.0, flashes: [[RESCUE, 0.25, 4], [GRAB, 0.15, 6]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { moonH: H, hero, devState, mira } });
