// Episode 7 — "The Leviathan". The guardian bows, bolts; Dev holds on to its brow through a 60 m climb, a breach
// into the moonlight, and is given the second key. Then Hollow drop-pods rain into the sea and it turns to fight.
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, d2, faceTo, lerpAng, ease,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makeGrass, makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeNightSky, makeArmada } from './engine/sky.js';
import { glyphMaterial, makeGate, makeKey } from './engine/props.js';
import { makeOcean, waveHeight, causticMaterial, makeFishSchool, makeLeviathan, makeLightShafts } from './engine/ocean.js';

const EP = await loadEpisode('07');
const { engine, scene, camera, world } = makeStage({ fog: [0x1a2a5a, 80, 900] });

const BED = -58;
const sky = makeNightSky({ planetDir: [0.6, 0.3, -1], spires: { heightFn: () => -8, center: [60, -120], rMin: 320, rMax: 900, count: 40, hMin: 40, hMax: 160 } });
world.add(sky.group);
const armada = makeArmada({ n: 200, dir: [0.4, 0.5, -1], dist: 1500, spread: [2200, 700] }); world.add(armada.g);
const ocean = makeOcean({ size: 1400, seg: 220, color: 0x0a2246, center: [60, -120] }); world.add(ocean.mesh);
const moonL = new THREE.DirectionalLight(0xb4c2ff, 2.4); moonL.position.set(400, 300, -600);
const hemi = new THREE.HemisphereLight(0x5a6aff, 0x0a0a20, 0.9);
world.add(moonL, hemi);
// gate platform
const PLAT = v3(92, 0, -176);
const stone = new THREE.MeshStandardMaterial({ color: 0x4a4866, roughness: 0.75, metalness: 0.15, flatShading: true });
const gmat = glyphMaterial({ color: 0x34324e, glow: 0x55e6ff, seed: 3, repeat: [3, 1] });
const platform = new THREE.Group(); world.add(platform);
platform.add(tag(new THREE.Mesh(new THREE.CylinderGeometry(6, 5.2, 1.6, 24), stone), SET.METAL));
const prim = new THREE.Mesh(new THREE.CylinderGeometry(6.05, 6.05, 0.4, 24, 1, true), gmat); prim.position.y = 0.6; platform.add(tag(prim, SET.METAL));
const gate = makeGate(3.0, stone); gate.g.position.set(0, 0.8 + 3.2, -3.0); platform.add(gate.g);
platform.rotation.y = 0.5;
// seabed (start of the episode only)
const under = new THREE.Group(); world.add(under);
const Hb = (x, z) => BED + (fbm(x * 0.04 + 2, z * 0.04) - 0.5) * 4 + (fbm(x * 0.01, z * 0.01 + 7) - 0.5) * 14;
const cU = { uTime: { value: 0 }, uCaustic: { value: 1 } };
const bed = makeTerrain({ H: Hb, size: 300, seg: 150, center: [10, -40], col: (x, z, c) => c.setRGB(0.09, 0.16, 0.22).lerp(new THREE.Color(0.18, 0.12, 0.26), smooth(0.35, 0.7, fbm(x * 0.05, z * 0.05 + 4))), set: SET.ROCK });
bed.material = causticMaterial(cU); under.add(bed);
const kelp = makeGrass({ area: [-24, 24, -30, 16], density: 0.8, heightFn: Hb, colA: 0x0f6a6a, colB: 0x3a2a8a, tall: 5.0, tipFrac: 0.5, width: 0.4, mask: (x, z) => Math.hypot(x, z + 8) > 7 });
under.add(kelp.mesh);
const fish = makeFishSchool(260); under.add(fish.im);
const shafts = makeLightShafts(12, 50, [0.3, 0.6, 0.85]); under.add(shafts);
const uHemi = new THREE.HemisphereLight(0x4a9ac8, 0x0a1020, 1.1); world.add(uHemi);
const bubbles = makePool(400, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xcfefff, roughness: 0.1, metalness: 0.5, emissive: 0x4a8aaa, emissiveIntensity: 0.6 }), SET.SUIT); world.add(bubbles.mesh);
const spray = makePool(1600, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xdff2ff, roughness: 0.2, emissive: 0x6aa8d8, emissiveIntensity: 0.9 }), SET.SUIT); world.add(spray.mesh);
const fireP = makePool(900, new THREE.IcosahedronGeometry(1, 0), glow(2.4, 0.4, 0.3), SET.ENERGY); world.add(fireP.mesh);

// =====================================================================
// THE GUARDIAN: head trajectory by keyframes, body follows the head's trail (arc length)
// =====================================================================
const lev = makeLeviathan({ segs: 72, spacing: 3.4, radius: 4.4 }); world.add(lev.g);
const key = makeKey(1, 4.0); lev.socket.add(key.g);
const keyLight = new THREE.PointLight(0x7aa8ff, 30, 30, 1.2); keyLight.position.set(0, 2, 2); lev.socket.add(keyLight);
const KF = [
  [0, v3(0, BED + 3.2, -11)], [12, v3(0, BED + 2.6, -10)], [16, v3(0, BED + 1.9, -8.6)], [18.2, v3(0, BED + 2.2, -8.8)],
  [20.5, v3(2, BED + 9, -15)], [27, v3(10, BED + 20, -30)], [34, v3(22, BED + 34, -52)], [41, v3(34, -10, -82)], [46, v3(40, 2, -98)],
  [49, v3(44, 17, -110)], [52.2, v3(49, 1, -124)], [56, v3(55, 0.8, -134)], [64, v3(66, 0.8, -146)], [72, v3(76, 1, -156)],
  [80, v3(84, 1, -164)], [85.6, v3(87, 1, -168.5)], [88.5, v3(92, 2, -162)], [92, v3(104, 6, -150)], [100, v3(118, 13, -140)],
];
const kfCurve = new THREE.CatmullRomCurve3(KF.map(k => k[1]));
function headAt(t) {                                                 // time -> curve parameter (piecewise linear over keyframes)
  let i = 0; while (i < KF.length - 2 && t > KF[i + 1][0]) i++;
  const k = clamp01((t - KF[i][0]) / (KF[i + 1][0] - KF[i][0])), u = (i + k) / (KF.length - 1);
  return kfCurve.getPoint(u);
}
// trail: sample head positions; body point s metres behind = trail position at (distance - s). Before t=0 a straight tail.
const TR = []; { let D = 0, prev = null; for (let t = 0; t <= EP.duration + 0.01; t += 1 / 30) { const p = headAt(t); if (prev) D += p.distanceTo(prev); TR.push({ t, p, D }); prev = p; } }
const tailDir = headAt(0).clone().sub(headAt(0.2)).normalize().negate();      // body trails away from where the head is going
function levPath(s, t) {
  const i = Math.min(TR.length - 1, Math.max(0, Math.round(t * 30))), D = TR[i].D - (s + 5.5);
  if (D <= 0) return TR[0].p.clone().addScaledVector(new THREE.Vector3(0.1, 0, -1).normalize(), -D).setY(TR[0].p.y + Math.min(0, D) * 0.0);
  let lo = 0, hi = i; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (TR[m].D < D) lo = m; else hi = m; }
  const a = TR[lo], b = TR[hi], f = (D - a.D) / Math.max(1e-6, b.D - a.D);
  return a.p.clone().lerp(b.p, f);
}
// Hollow drop pods
const PODS = [...Array(26)].map((_, i) => { const tt = 72 + hash2(i, 1) * 22, a = hash2(i, 2) * PI * 2, r = 18 + hash2(i, 3) * 60; return { t: tt, x: 80 + Math.cos(a) * r, z: -160 + Math.sin(a) * r }; });
const podMat = new THREE.MeshStandardMaterial({ color: 0x3a3646, roughness: 0.4, metalness: 0.7, emissive: 0x401010 });
const pods = PODS.map(() => { const g = new THREE.Group(); g.add(tag(new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 2.4, 4, 8), podMat), SET.METAL)); const tr = new THREE.Mesh(new THREE.ConeGeometry(0.8, 18, 8, 1, true), glow(2.2, 0.3, 0.2, { transparent: true, opacity: 0.6, depthWrite: false })); tr.position.y = 9.5; g.add(tag(tr, SET.ENERGY)); world.add(g); return g; });
const podLight = new THREE.PointLight(0xff3020, 0, 80, 1.2); world.add(podLight);

// =====================================================================
// HERO
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 14;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const DEV0 = v3(0, Hb(0, 0), 0);
const GRAB = 19.4, FLICK = 86.0, LAND = 87.8, GATE_IN = 96.4;
function devState(t) {
  const S = { mode: 'bed', rotY: PI, walk: 0, phase: 0, crouch: 0.3 * (1 - Q(9, 11, t)), lookUp: 0.15, headYaw: 0, armRo: null, armLo: null, lean: 0, run: 0, air: 0 };
  if (t < GRAB) {
    const reach = Q(15.8, 17.2, t) * (1 - Q(18.4, 19.0, t));
    S.armRo = { x: -1.35, z: -0.05, ex: -0.25, w: reach }; S.lookUp = 0.25 + 0.1 * reach;
    S.walk = Q(14.2, 14.5, t) * (1 - Q(15.6, 15.9, t)) * 0.6; S.phase = Q(14.2, 15.9, t) * 6;
    S.z = -1.2 * Q(14.2, 15.9, t);
    return S;
  }
  if (t < FLICK) {                                                   // riding on the brow
    S.mode = 'ride'; S.crouch = t < 54 ? 0.65 : 0.25 + 0.25 * (1 - Q(56, 58, t)); S.lean = t < 54 ? 0.35 : 0.05;
    S.armRo = { x: -1.2, z: -0.25, ex: -0.6, w: t < 58 ? 1 : 1 - Q(58, 59, t) }; S.armLo = { x: -1.2, z: 0.25, ex: -0.6, w: t < 58 ? 1 : 1 - Q(58, 59, t) };
    if (t > 59.5) { const r = Q(59.6, 61.2, t) * (1 - Q(64.4, 65.4, t)); S.armRo = { x: -1.0, z: -0.05, ex: -0.4, w: r }; }
    S.lookUp = t < 46 ? 0.5 : 0.1 + 0.6 * Q(68.6, 70.5, t) * (1 - Q(78, 80, t));
    S.headYaw = 0.6 * Math.sin((t - 70) * 0.7) * Q(70, 71, t) * (1 - Q(80, 81, t));
    if (t > 82) { S.crouch = 0.5; S.armRo = { x: -1.2, z: -0.25, ex: -0.6, w: 1 }; S.armLo = { x: -1.2, z: 0.25, ex: -0.6, w: 1 }; }
    return S;
  }
  S.mode = 'plat';
  if (t < LAND) { S.air = 1; S.crouch = 0.6; S.lean = 0.3; return S; }
  S.crouch = 0.7 * (1 - Q(LAND + 0.2, LAND + 1.4, t)); S.lookUp = 0.35 * Q(89, 90.5, t);
  if (t > 93.4) { S.walk = Q(93.4, 93.7, t); S.phase = (t - 93.4) * 7; }
  return S;
}

window.AUDIO_META = { pods: PODS.map(p => +p.t.toFixed(3)).sort((a, b) => a - b) };

// =====================================================================
const look = new THREE.Vector3();
const VISOR = [[0.6, 6.0, 'CONTACT  ·  0.4 m\nBIOSIGN  CALM\nKEY SIGNAL  ▮▮▮▮▮▮▮▮▮▮'], [64.4, 69.0, 'KEYS  2 / 4\n▸ GLASS  ✓\n▸ OCEAN  ✓'], [70.0, 78.0, 'HOLLOW DROP PODS\nCOUNT  26  ▸ 40+\nIMPACT  00:04']];
const hud = makeHud(EP, { visor: VISOR });
const DEEP = new THREE.Color(0x06223a);

function update(t) {
  const S = devState(t);
  ocean.U.uTime.value = t; cU.uTime.value = t;
  // guardian
  const ride = S.mode === 'ride';
  lev.set(t, levPath, { glow: 0.8 + 0.5 * Math.sin(t * 2) * Q(8, 10, t) + 1.2 * Q(78, 82, t), eyeOpen: 1, mouth: t > 78.6 && t < 81 ? 0.6 : t > 90 ? 0.5 : 0.1, lookAt: null });
  lev.g.updateMatrixWorld(true);
  const sock = lev.socket.getWorldPosition(new THREE.Vector3()), hq = lev.head.quaternion;
  key.g.visible = t < 64.4; key.spin(t); keyLight.intensity = t < 64.4 ? 30 : 0;
  // hero
  poseHero(hero, S, t);
  let rotY = S.rotY;
  if (S.mode === 'bed') hero.root.position.set(DEV0.x, Hb(0, S.z || 0), S.z || 0);
  else if (ride) { const off = v3(0.6, 0.35, -1.6).applyQuaternion(hq); hero.root.position.copy(sock).add(off); const f = v3(0, 0, 1).applyQuaternion(hq); rotY = Math.atan2(f.x, f.z); }
  else {
    const pt = platform.position.clone().add(v3(0, 0.8, 0)), start = headAt(FLICK).add(v3(0, 4, 0));
    if (t < LAND) { const k = Q(FLICK, LAND, t); hero.root.position.copy(start).lerp(pt, k); hero.root.position.y += 5 * Math.sin(PI * k); }
    else { const g = gate.g.getWorldPosition(new THREE.Vector3()); const k = Q(93.4, 96.4, t); hero.root.position.copy(pt).lerp(g.setY(pt.y), k * 0.9); }
    rotY = faceTo(P2(pt.x, pt.z), P2(lev.head.position.x, lev.head.position.z)); if (t > 93) rotY = lerpAng(rotY, faceTo(P2(pt.x, pt.z), P2(gate.g.getWorldPosition(new THREE.Vector3()).x, gate.g.getWorldPosition(new THREE.Vector3()).z)), Q(93, 93.6, t));
  }
  hero.root.rotation.set(0, rotY, 0); hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = hero.head.getWorldPosition(new THREE.Vector3());
  const fwd = v3(Math.sin(rotY), 0, Math.cos(rotY)), right = v3(Math.cos(rotY), 0, -Math.sin(rotY));
  const hand = hero.handR.getWorldPosition(new THREE.Vector3());
  // key: from the brow into his hand
  if (t > 64.4) { key.g.visible = true; key.g.removeFromParent(); world.add(key.g); key.g.position.copy(hand).add(v3(0, 0.15, 0)); key.g.scale.setScalar(0.5); key.g.quaternion.identity(); }
  else if (key.g.parent !== lev.socket) { key.g.removeFromParent(); lev.socket.add(key.g); key.g.position.set(0, 0, 0); key.g.scale.setScalar(1); }
  // pixel in the pocket, peeks at the guardian
  { const pk = hero.pocket.getWorldPosition(new THREE.Vector3()), peek = Q(7.6, 8.4, t) * (1 - Q(12, 13, t)) + Q(64.6, 65.4, t) * (1 - Q(68, 69, t));
    pixel.g.position.copy(pk).add(v3(0, -0.06 + 0.08 * peek, 0)); pixel.g.rotation.set(0, rotY, 0); pixel.g.scale.setScalar(0.42);
    poseSkitterling(pixel, { curl: 1 - peek, eyeOpen: 1, look: Math.sin(t) * 0.4, t }); pixel.g.visible = peek > 0.05; }
  // platform + gate
  platform.position.set(PLAT.x, -0.7 + waveHeight(PLAT.x, PLAT.z, t) * 0.25, PLAT.z); gate.set(t, Q(84, 86, t)); gmat.emissiveIntensity = 0.6 + 0.3 * Math.sin(t * 2);
  // water state
  const camUnder = camera.position.y < waveHeight(camera.position.x, camera.position.z, t) - 0.05;
  under.visible = t < 50; kelp.uniforms.uTime.value = t * 0.6; kelp.uniforms.uGust.value = 0.6 + 2.0 * Q(18.5, 20, t) * (1 - Q(24, 28, t));
  kelp.uniforms.uPush.value[0].set(0, 0, 2.2, 1.3); const lh = levPath(0, t); kelp.uniforms.uPush.value[1].set(lh.x, lh.z, 8, 1.4);
  for (let i = 2; i < 4; i++) kelp.uniforms.uPush.value[i].set(0, 0, 0, 0);
  fish.set(t, v3(0, BED + 10, -6), head, Q(18.6, 20.5, t), 1);
  shafts.position.set(a.x, 0, a.z); for (const s of shafts.children) s.material.opacity = 0.1 * (camUnder ? 1 : 0);
  // bubbles streaming off the guardian on the climb; spray on breach / landing / pod impacts
  const B = [];
  if (t > 19 && t < 47) for (let i = 0; i < 400; i++) { const s = hash2(i, 1) * 60, p = levPath(s, t), ph = (t * 1.3 + hash2(i, 2)) % 1; B.push({ x: p.x + (hash2(i, 3) - 0.5) * 6, y: p.y + 3 + ph * 4, z: p.z + (hash2(i, 4) - 0.5) * 6, s: 0.05 + hash2(i, 5) * 0.12 }); }
  bubbles.set(B);
  const SP = [], FP = [];
  const splashAt = (t0, c, n, power, seed) => { const dt = t - t0; if (dt < 0 || dt > 3.2) return; for (let i = 0; i < n; i++) { const ang = hash2(seed, i) * 6.283, hv = (0.5 + hash2(seed, i + 77) * 3) * power, vv = (4 + hash2(seed, i + 99) * 10) * power; const y = c.y + vv * dt - 6 * dt * dt; if (y < c.y - 1) continue; SP.push({ x: c.x + Math.cos(ang) * (hv * dt + 3), y, z: c.z + Math.sin(ang) * (hv * dt + 3), s: 0.06 + hash2(seed, i + 3) * 0.16 }); } };
  splashAt(46, v3(40, 0, -98), 500, 1.4, 3); splashAt(52.2, v3(49, 0, -124), 500, 1.3, 7);
  for (const [i, p] of PODS.entries()) splashAt(p.t, v3(p.x, 0, p.z), 40, 0.8, 50 + i);
  if (t > 88 && t < 100) splashAt(88.5 + Math.floor((t - 88.5) / 1.2) * 1.2, headAt(t).setY(0), 60, 1.0, 900 + Math.floor((t - 88.5) / 1.2));
  spray.set(SP);
  pods.forEach((g, i) => { const p = PODS[i], dt = p.t - t; g.visible = dt > 0 && dt < 5; if (g.visible) { g.position.set(p.x + dt * 6, dt * 80, p.z - dt * 10); g.rotation.set(0.12, 0, -0.07); } if (t > p.t && t < p.t + 2.5) for (let k = 0; k < 14; k++) { const d2_ = t - p.t; FP.push({ x: p.x + Math.cos(k) * d2_ * 3, y: 0.5 + d2_ * (2 + k % 3) , z: p.z + Math.sin(k) * d2_ * 3, s: 0.4 * (1 - d2_ / 2.5) }); } });
  fireP.set(FP);
  const lastPod = PODS.filter(p => p.t <= t).sort((x, y) => y.t - x.t)[0];
  podLight.intensity = lastPod ? 120 * pulse(t, lastPod.t, 2) : 0; if (lastPod) podLight.position.set(lastPod.x, 4, lastPod.z);
  armada.set(Q(68.2, 76, t), t);
  sky.ringMat.uniforms.uRed.value = Q(68, 76, t); hemi.color.setRGB(0.35, 0.4, 1.0).lerp(new THREE.Color(0.8, 0.25, 0.3), 0.5 * Q(68, 76, t));
  scene.fog.color.copy(camUnder ? DEEP : new THREE.Color(0x1a2a5a)); scene.fog.near = camUnder ? 2 : 80; scene.fog.far = camUnder ? 70 : 900;
  sky.group.visible = !camUnder; ocean.mesh.material.color.set(camUnder ? 0x3a7aa8 : 0x0a2246);
  uHemi.intensity = camUnder ? 1.1 : 0;
  hero.headLight.intensity = camUnder ? 16 : 6;

  // ---- cameras ----
  let pos, fov = 58; const hp = lev.head.position, eye = lev.eye.getWorldPosition(new THREE.Vector3());
  const lf = v3(0, 0, 1).applyQuaternion(hq), ls = v3(1, 0, 0).applyQuaternion(hq);
  if (t < 10) { pos = head.clone().add(v3(-1.4, 0.5, 2.4)); look.copy(eye).lerp(head, 0.3); fov = 56; }
  else if (t < 16) { pos = a.clone().add(v3(9.5, 2.2, 3.5)); look.copy(a).lerp(hp, 0.5).add(v3(0, 1, 0)); fov = 60; }
  else if (t < 21) { const aw = a.clone().sub(hp).setY(0).normalize(), sd = v3(-aw.z, 0, aw.x); pos = a.clone().addScaledVector(aw, 7.5).addScaledVector(sd, 3.0).add(v3(0, 1.2, 0)); look.copy(a).add(v3(0, 1.4, 0)).lerp(eye, 0.45); fov = 72; }   // from the far side of Dev, away from the head
  else if (t < 44.6) { pos = hp.clone().addScaledVector(ls, 16).addScaledVector(lf, -2).add(v3(0, -2.5, 0)); look.copy(a).lerp(hp, 0.3).addScaledVector(lf, 2); fov = 62; }       // racing alongside the climb
  else if (t < 53) { const k = Q(44.6, 53, t); pos = v3(hp.x, 0, hp.z).addScaledVector(ls.clone().setY(0).normalize(), 34 - 6 * k).addScaledVector(lf.clone().setY(0).normalize(), -14).add(v3(0, 2.4 + 3 * k, 0)); look.copy(hp).add(v3(0, -4, 0)); fov = 66; }   // the breach, from the water beside it
  else if (t < 61) { pos = a.clone().addScaledVector(lf, -3.2).add(v3(0, 1.5, 0)).addScaledVector(ls, 1.2); look.copy(sock).addScaledVector(lf, 4); fov = 62; }
  else if (t < 68) { pos = a.clone().addScaledVector(lf, 1.4).addScaledVector(ls, 0.9).add(v3(0, 1.4, 0)); look.copy(hand).lerp(head, 0.4); fov = 50; }
  else if (t < 80) { pos = a.clone().addScaledVector(lf, -2.6).add(v3(0, 1.2, 0)).addScaledVector(ls, -1.0); look.copy(a).add(v3(30, 40, -60)); fov = 70; }                // the sky turns red
  else if (t < 86) { pos = hp.clone().addScaledVector(ls, -15).addScaledVector(lf, 6).add(v3(0, 4, 0)); look.copy(hp).lerp(a, 0.5); fov = 62; }
  else if (t < 93) { pos = platform.position.clone().add(v3(10, 3.2, -7)); look.copy(platform.position).lerp(hp, 0.45).add(v3(0, 3, 0)); fov = 68; }
  else { pos = a.clone().addScaledVector(fwd, -3).add(v3(0, 1.6, 0)).addScaledVector(right, 1.0); look.copy(gate.g.getWorldPosition(new THREE.Vector3())); fov = 62; }
  aim(camera, pos, look, t < 30 ? (x, z) => Hb(x, z) + 0.3 : null, fov);
  postFx(engine, EP, t, { exposure: camUnder ? 3.2 : 2.8, flashes: [[46, 0.4, 3], [52.2, 0.2, 4], [GATE_IN, 0.9, 2.5]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { moonH: Hb, hero, devState, lev }, clear: t => (camera.position.y < waveHeight(camera.position.x, camera.position.z, t) ? DEEP : null) });
