// Episode 10 — "Anaya". 3% oxygen, the titan's claw raised. His daughter's six-second voice note. He lets ECHO in:
// it seals the visor with its own core, kills the titan... and goes silent.
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, d2, faceTo, lerpAng, ease,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeDaySky } from './engine/sky.js';
import { makeGate, makeVaelorStatue } from './engine/props.js';
import { makeHollow, poseHollow } from './engine/hollow.js';

const EP = await loadEpisode('10');
const { engine, scene, camera, world } = makeStage({ fog: [0xc08a6a, 80, 900] });
const ROCKS = P2(-16, -22), DEV = P2(-25, -8), TITAN = P2(-20, -19), FAR_GATE = P2(-60, 140);
function H(x, z) {
  const dunes = Math.sin(x * 0.05 + z * 0.02) * 2.2 + Math.sin(x * 0.013 - z * 0.04) * 3.5 + (fbm(x * 0.03, z * 0.03) - 0.5) * 2;
  const rocks = 2.5 * Math.exp(-((d2(P2(x, z), ROCKS) / 5) ** 2));
  const far = Math.hypot(x, z + 30);
  return dunes + rocks + (fbm(x * 0.006, z * 0.006 + 1) - 0.4) * 60 * smooth(120, 380, far);
}
const desert = new THREE.Group(); world.add(desert);
const sky = makeDaySky({ pal: { top: '#2a3a7a', mid: '#b08aa0', horizon: '#ffb070', below: '#a06040' },
  suns: [{ dir: [0.2, 0.1, 1], r: 80, color: [3, 2.2, 1.4] }, { dir: [-0.6, 0.06, 1], r: 46, color: [3, 1.6, 1.0] }], seed: 10, clouds: 24 });
desert.add(sky.group);
const cA = new THREE.Color(0xc89a6a), cB = new THREE.Color(0x9a6a48);
desert.add(makeTerrain({ H, col: (x, z, c) => c.copy(cA).lerp(cB, smooth(0.3, 0.7, fbm(x * 0.05, z * 0.05 + 5))), set: SET.ROCK }));
const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a4a3a, roughness: 0.95, flatShading: true });
for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 + hash2(i, 1) * 2.5, 0), rockMat); r.position.set(ROCKS.x + (hash2(i, 2) - 0.5) * 8, H(ROCKS.x, ROCKS.z) + 0.5, ROCKS.z + (hash2(i, 3) - 0.5) * 8); r.rotation.set(i, i * 2, 0); r.castShadow = true; desert.add(tag(r, SET.ROCK)); }
const stone = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.85, flatShading: true });
const farGate = makeGate(5, stone, [1.6, 1.2, 0.6]); farGate.g.position.set(FAR_GATE.x, H(FAR_GATE.x, FAR_GATE.z) + 5.4, FAR_GATE.z); farGate.g.rotation.y = 0.4; desert.add(farGate.g);
const titan = makeHollow('scout'); titan.root.scale.setScalar(12); desert.add(titan.root); titan.bone.color.set(0x6a6470); titan.bone.metalness = 0.6;
const sandP = makePool(2400, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xd8a878, roughness: 1, flatShading: true }), SET.ROCK); desert.add(sandP.mesh);
const sparks = makePool(900, new THREE.IcosahedronGeometry(1, 0), glow(0.6, 2.2, 2.6), SET.ENERGY); desert.add(sparks.mesh);
const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, PI * 2, 0, PI / 2), glow(0.3, 1.4, 1.8, { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
desert.add(tag(shield, SET.ENERGY, true));
const eyeLight = new THREE.PointLight(0xff2030, 0, 60, 1.3), suitLight = new THREE.PointLight(0x66eeff, 0, 30, 1.4); desert.add(eyeLight, suitLight);
const sun = new THREE.DirectionalLight(0xffd0a0, 2.8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 400 });
const hemi = new THREE.HemisphereLight(0xb8a8ff, 0x8a5a3a, 1.0); desert.add(sun, sun.target, hemi);

// ---- the memory: a small house at dusk on Earth, a child waving with a toy rocket ----
const MEM = v3(5000, 0, 0);
const memory = new THREE.Group(); memory.position.copy(MEM); world.add(memory);
memory.add(makeDaySky({ pal: { top: '#2a2a6a', mid: '#a06a9a', horizon: '#ffb06a', below: '#3a2a2a' }, suns: [{ dir: [0, 0.04, -1], r: 90, color: [3, 1.8, 1.0] }], seed: 3, clouds: 30 }).group);
memory.add(makeTerrain({ H: (x, z) => (fbm(x * 0.05, z * 0.05) - 0.5) * 0.8, size: 400, seg: 60, col: (x, z, c) => c.setRGB(0.12, 0.2, 0.08).lerp(new THREE.Color(0.2, 0.26, 0.1), fbm(x * 0.1, z * 0.1)), set: SET.GRASS }));
const wall = new THREE.MeshStandardMaterial({ color: 0xd8c0a0, roughness: 0.9, flatShading: true }), roof = new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.8, flatShading: true });
const house = new THREE.Group(); house.position.set(-3, 0, -9); memory.add(house);
const put = (parent, mesh, set, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); parent.add(tag(mesh, set)); return mesh; };
put(house, new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, 5), wall), SET.PROP, 0, 1.6, 0);
const rf = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 4), roof); rf.position.y = 4.3; rf.rotation.y = PI / 4; house.add(tag(rf, SET.ROCK));
const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.0), glow(2.4, 1.8, 0.9)); win.position.set(1.4, 1.8, 2.51); house.add(tag(win, SET.ENERGY));
const door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), glow(1.8, 1.2, 0.6)); door.position.set(-1.2, 1.0, 2.51); house.add(tag(door, SET.ENERGY));
const tree = new THREE.Group(); tree.position.set(5, 0, -6); memory.add(tree);
put(tree, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })), SET.ROCK, 0, 1.5, 0);
put(tree, new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 0), new THREE.MeshStandardMaterial({ color: 0x2a4a1a, flatShading: true })), SET.GRASS, 0, 3.8, 0);
const kid = new THREE.Group(); kid.position.set(-1.2, 0, -5.6); memory.add(kid);       // silhouette only, no face
const kMat = new THREE.MeshStandardMaterial({ color: 0x2a2030, roughness: 1 });
put(kid, new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 8), kMat), SET.PROP, 0, 0.62, 0);
put(kid, new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), kMat), SET.PROP, 0, 1.08, 0);
const kArm = new THREE.Group(); kArm.position.set(0.18, 0.86, 0); kid.add(kArm);
put(kArm, new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.32, 4, 6), kMat), SET.PROP, 0, 0.2, 0);
const toy = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), glow(1.2, 1.4, 1.8)); toy.position.set(0, 0.42, 0); kArm.add(tag(toy, SET.ENERGY));
for (const sx of [-1, 1]) put(kid, new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 6), kMat), SET.PROP, sx * 0.08, 0.22, 0);
memory.add(new THREE.HemisphereLight(0xffc8a0, 0x2a1a2a, 1.4));
const mSun = new THREE.DirectionalLight(0xffa060, 2.0); mSun.position.set(0, 5, -60); memory.add(mSun);
const fireflies = makePool(120, new THREE.IcosahedronGeometry(1, 0), glow(2.2, 2.0, 0.8), SET.ENERGY); memory.add(fireflies.mesh);

// cracked visor overlay; the cracks get sealed with ECHO's light
const crack = document.createElement('div'); crack.style.cssText = 'position:absolute;inset:0;opacity:1;pointer-events:none';
const paths = [...Array(11)].map((_, i) => { let x = 470, y = 520, a = i / 11 * PI * 2 + 0.3, d = `M${x} ${y}`; for (let s = 0; s < 7; s++) { a += (hash2(i, s) - 0.5) * 0.7; x += Math.cos(a) * (40 + hash2(i, s + 9) * 60); y += Math.sin(a) * (40 + hash2(i, s + 9) * 60); d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; } return d; });
crack.innerHTML = `<svg width="720" height="1280"><g id="ck" stroke="#eaf6ff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85">${paths.map(d => `<path d="${d}" pathLength="1"/>`).join('')}<circle cx="470" cy="520" r="34"/></g></svg>`;
document.getElementById('hud').appendChild(crack);
const alarm = document.createElement('div'); alarm.style.cssText = 'position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 160px 40px rgba(255,30,40,0.7);opacity:0';
document.getElementById('hud').appendChild(alarm);
const wave = document.createElement('div'); wave.style.cssText = 'position:absolute;left:110px;right:110px;top:1000px;height:70px;opacity:0;pointer-events:none';
wave.innerHTML = '<svg width="500" height="70"><polyline id="wv" fill="none" stroke="#ffd29a" stroke-width="3" points=""/></svg><div style="font:600 20px JetBrains Mono;color:#ffd29a;text-align:center;text-shadow:0 0 6px #000">▶ ANAYA · VOICE NOTE · 0:06</div>';
document.getElementById('hud').appendChild(wave);

// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 3;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const T_UP = 33.0, T_BLOCK = 38.6, T_JUMP = 48.4, T_STRIKE = 52.0;
function devState(t) {
  const S = { x: DEV.x, z: DEV.z, y: 0, rotY: faceTo(P2(-17.5, -19.6), DEV), walk: 0, phase: 0, crouch: 0, lookUp: 0.1, headYaw: 0, armRo: null, armLo: null, lean: 0, lie: 1, jet: 0, air: 0 };
  S.armRo = { x: -0.3, z: -1.2, ex: -0.4, w: 1 }; S.armLo = { x: -0.2, z: 1.0, ex: -0.6, w: 1 };
  if (t < T_UP) { S.headYaw = 0.2 * Math.sin(t * 0.4); return S; }
  // ECHO stands him up, blocks the claw, launches, strikes the eye
  const up = Q(T_UP, T_UP + 1.6, t); S.lie = 1 - up; S.crouch = 0.4 * up * (1 - Q(36, 37, t));
  S.rotY = faceTo(DEV, TITAN);
  const block = Q(37.6, 38.4, t) * (1 - Q(44, 45, t));
  S.armRo = up < 1 ? { x: -0.3, z: -1.2, ex: -0.4, w: 1 - up } : { x: -2.3, z: -0.3, ex: -0.3, w: block }; S.armLo = up < 1 ? { x: -0.2, z: 1.0, ex: -0.6, w: 1 - up } : { x: -2.3, z: 0.3, ex: -0.3, w: block };
  S.lookUp = 0.7 * Q(36, 37, t);
  if (t > T_JUMP - 0.4) {
    S.jet = Q(T_JUMP - 0.4, T_JUMP, t) * (1 - Q(T_STRIKE + 0.4, T_STRIKE + 1, t));
    const k = ease(Q(T_JUMP, T_STRIKE, t)), tgt = v3(-14.8, 30, -16.8);
    S.x = lerp(DEV.x, tgt.x, k); S.z = lerp(DEV.z, tgt.z, k); S.y = tgt.y * k; S.air = 1;
    S.armRo = { x: -2.6, z: -0.1, ex: -0.1, w: Q(50.6, 51.6, t) }; S.armLo = { x: 0.5, z: 0.4, ex: -0.4, w: 1 }; S.crouch = 0.4 * (1 - Q(50, 51, t)); S.lookUp = 0.5;
    if (t > T_STRIKE) {                                                         // falls back down with the titan
      const f = Q(T_STRIKE, 56, t), land = P2(-21, -6); S.x = lerp(tgt.x, land.x, f); S.z = lerp(tgt.z, land.z, f); S.y = tgt.y * (1 - f) + 6 * Math.sin(PI * f) * 0.3;
      S.jet = 0.6 * (1 - Q(55.4, 56, t)); S.crouch = Q(55.6, 56.2, t) * (1 - Q(58, 60, t)); S.air = f < 1 ? 1 : 0; S.lookUp = 0;
      if (t > 56) { S.x = land.x; S.z = land.z; S.y = 0; S.rotY = faceTo(land, TITAN); S.armRo = null; S.armLo = null; }
    }
  }
  if (t > 64) { S.x = -21; S.z = -6; S.lookUp = -0.25 * Q(66, 68, t) + 0.15 * Q(80, 81, t); S.headYaw = 0.35 * Math.sin((t - 72) * 0.6) * Q(76, 78, t); S.rotY = faceTo(P2(S.x, S.z), TITAN); }
  if (t > 84) {                                                                 // walks away toward the distant gate
    const k = Q(84.6, 100, t), p1 = P2(-30, 14); S.x = lerp(-21, p1.x, k); S.z = lerp(-6, p1.z, k); S.rotY = lerpAng(S.rotY, faceTo(P2(-21, -6), p1), Q(84, 85, t)); S.walk = Q(84.6, 85, t); S.phase = k * 22 / 0.52 * PI; S.lookUp = 0;
  }
  return S;
}
function titanState(t) {
  const T = { x: TITAN.x, z: TITAN.z, rotY: faceTo(TITAN, DEV), crawl: 1, walk: 0, phase: 0, reach: 0.8, lookUp: -0.35, fall: 0, eye: 1 };
  T.reach = 0.8 + 0.2 * Q(35, 37.5, t) - 0.5 * Q(38.6, 40, t) + 0.4 * Q(44, 46, t) * (1 - Q(47, 48, t));
  T.eye = t < T_STRIKE ? 1 : Math.max(0, 1 - (t - T_STRIKE) * 3);
  T.fall = ease(Q(T_STRIKE + 0.6, 58.4, t)); T.lookUp = -0.35 + 0.7 * Q(48, 50, t) * (1 - Q(T_STRIKE, 53, t));
  return T;
}
const FOOT = footsteps(devState, EP.duration).filter(f => f.t > 84);
window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false })) };

const look = new THREE.Vector3();
const VISOR = [[0.3, 10.4, 'SUIT BREACH\nO2  ▮▯▯▯▯▯▯▯▯▯  3%\nECHO  REQUESTS ACCESS'], [29.0, 36.0, 'ECHO  ▸ SUIT CONTROL\nCORE TRANSFER  ▮▮▮▮▮▮▮▯▯▯\nVISOR  SEALING'], [61.4, 66.0, 'O2  ▮▮▮▮▮▮▮▮▮▮  100%\nECHO CORE  ▮▯▯▯▯▯▯▯▯▯  3%'], [76.6, 100, 'ECHO  ▯  OFFLINE']];
const hud = makeHud(EP, { visor: VISOR });

function update(t) {
  const S = devState(t), T = titanState(t);
  const mem = t > 12.4 && t < 22.6;
  desert.visible = !mem; memory.visible = mem;
  scene.fog.color.set(mem ? 0x8a5a5a : 0xc08a6a); scene.fog.near = mem ? 30 : 80; scene.fog.far = mem ? 300 : 900;
  poseHero(hero, S, t);
  hero.root.position.set(S.x, H(S.x, S.z) + S.y + 0.18 * S.lie, S.z); hero.root.rotation.set(-PI / 2 * S.lie, S.rotY, 0, 'YXZ'); hero.root.updateMatrixWorld(true);
  hero.root.visible = !mem;
  const a = hero.root.position, head = hero.head.getWorldPosition(new THREE.Vector3()), hand = hero.handR.getWorldPosition(new THREE.Vector3());
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  const echoPow = Q(26.4, 30, t) * (1 - Q(64, 76, t));
  hero.cyanMat.color.setRGB(0.35, 1.6, 1.8).multiplyScalar(0.2 + 3.2 * echoPow + (t > 76.6 ? -0.15 : 0));
  suitLight.position.copy(a).add(v3(0, 1.2, 0)); suitLight.intensity = 40 * echoPow;
  // titan: claw raised over him, blocked, struck in the eye, falls
  titan.root.position.set(T.x, H(T.x, T.z) - 2 * T.fall, T.z); titan.root.rotation.set(-1.2 * T.fall, T.rotY + 0.3 * T.fall, 0.4 * T.fall, 'YXZ');
  poseHollow(titan, { crawl: T.crawl, walk: 0, phase: 0, t, reach: T.reach, lookUp: T.lookUp, twitch: 0.3 * (1 - T.fall) });
  titan.red.color.setRGB(2.4, 0.16, 0.2).multiplyScalar(0.1 + T.eye * (1 + 0.5 * Math.sin(t * 5)));
  titan.eye2.visible = T.eye > 0.5; titan.root.updateMatrixWorld(true);
  const tEye = titan.eye.getWorldPosition(new THREE.Vector3()), tHead = titan.head.getWorldPosition(new THREE.Vector3()), claw = titan.armR.wr.getWorldPosition(new THREE.Vector3());
  eyeLight.position.copy(tEye); eyeLight.intensity = 80 * T.eye;
  // shield dome when ECHO blocks the claw
  const sh = Q(37.4, 38.4, t) * (1 - Q(44.5, 46, t)); shield.visible = sh > 0.01; shield.position.set(a.x, H(a.x, a.z), a.z); shield.scale.setScalar(2.4 * sh + 0.01); shield.material.opacity = 0.35 * sh * (0.8 + 0.2 * Math.sin(t * 20));
  // sparks / sand
  const SP = [], SA = [];
  for (const [t0, c, n, speed] of [[T_BLOCK, v3(a.x, H(a.x, a.z) + 2.4, a.z), 300, 6], [T_STRIKE, tEye, 500, 10]]) { const dt = t - t0; if (dt < 0 || dt > 2.4) continue;
    for (let i = 0; i < n; i++) { const th = hash2(i + n, 1) * 6.28, ph = Math.acos(2 * hash2(i, 2) - 1), v = speed * (0.4 + hash2(i, 3)); SP.push({ x: c.x + Math.sin(ph) * Math.cos(th) * v * dt, y: c.y + Math.cos(ph) * v * dt - 4.9 * dt * dt, z: c.z + Math.sin(ph) * Math.sin(th) * v * dt, s: 0.05 * (1 - dt / 2.4) }); } }
  if (t > 56 && t < 66) for (let i = 0; i < 1600; i++) { const t0 = 56.5 + hash2(i, 1) * 2.5, dt = t - t0; if (dt < 0 || dt > 6) continue; const ang = hash2(i, 2) * 6.28, r = hash2(i, 3) * 26, hv = 2 + hash2(i, 4) * 4;
    const x = TITAN.x + Math.cos(ang) * (r + hv * dt), z = TITAN.z - 6 + Math.sin(ang) * (r + hv * dt); SA.push({ x, y: H(x, z) + (1 + hash2(i, 5) * 5) * Math.min(1, dt) * (1 - dt / 6), z, s: 0.2 + hash2(i, 6) * 0.3, rx: dt, ry: i }); }
  sparks.set(SP); sandP.set(SA);
  // pixel climbs out at the end
  { const pk = hero.pocket.getWorldPosition(new THREE.Vector3()), shp = hero.shoulderL.getWorldPosition(new THREE.Vector3()), k = Q(89.4, 91.4, t);
    pixel.g.position.copy(pk).lerp(shp, k); pixel.g.rotation.set(0, S.rotY, 0); pixel.g.scale.setScalar(0.42 + 0.13 * k);
    poseSkitterling(pixel, { curl: 1 - Q(88.8, 89.4, t), walk: k > 0 && k < 1 ? 1 : 0, phase: t * 14, eyeOpen: 1, look: Math.sin(t) * 0.3, t }); pixel.g.visible = t > 88.8 && !mem; }
  // memory: the kid waves the toy rocket; fireflies
  kArm.rotation.z = -2.4 + 0.35 * Math.sin(t * 5); kid.rotation.y = 0.15 * Math.sin(t * 0.8);
  { const F = []; for (let i = 0; i < 120; i++) F.push({ x: (hash2(i, 1) - 0.5) * 14 + Math.sin(t * 0.6 + i) * 0.4, y: 0.4 + hash2(i, 2) * 2.5 + Math.sin(t + i) * 0.2, z: -4 - hash2(i, 3) * 8, s: 0.02 + 0.025 * Math.max(0, Math.sin(t * 2 + i)) }); fireflies.set(F); }
  sun.target.position.copy(a); sun.position.copy(a).add(v3(40, 60, 160));
  // overlays: crack sealed by ECHO light; alarm until O2 is back; the voice note waveform
  const seal = Q(28, 33, t);
  const ck = document.getElementById('ck'); ck.setAttribute('stroke', seal > 0.01 ? `rgb(${Math.round(234 - 180 * seal)},${Math.round(246)},${255})` : '#eaf6ff');
  ck.style.filter = seal > 0.01 ? `drop-shadow(0 0 ${6 * seal}px #3ff)` : 'none';
  const pov = (t < 12.4 || (t > 22.6 && t < 34) || (t > 76 && t < 84)) && !mem;
  crack.style.opacity = pov ? (1 - 0.6 * Q(70, 76, t)) : 0;
  alarm.style.opacity = t < 30 && !mem ? 0.3 + 0.35 * Math.max(0, Math.sin(t * 6)) : 0;
  wave.style.opacity = t > 12.5 && t < 19.2 ? 1 : 0;
  if (t > 12.5 && t < 19.2) { const pts = []; for (let i = 0; i <= 100; i++) { const x = i * 5, k = i / 100, env = Math.sin(PI * k) * (0.3 + 0.7 * Math.abs(Math.sin(k * 23 + t * 2))); const y = 35 + Math.sin(i * 1.7 + t * 30) * 28 * env * (k * 100 < (t - 12.5) / 6 * 100 ? 1 : 0.15); pts.push(`${x},${y.toFixed(1)}`); } document.getElementById('wv').setAttribute('points', pts.join(' ')); }

  // ---- cameras ----
  let pos, fov = 58;
  if (mem) { const k = Q(12.4, 22.6, t); pos = v3(MEM.x + 1.4 - 1.0 * k, 1.2 + 0.2 * k, MEM.z - 1.0 - 1.5 * k); look.set(MEM.x - 1.2, 1.0, MEM.z - 5.8); fov = 50 - 6 * k; }
  else if (t < 12.4) { if (t < 6) { pos = head.clone().add(v3(0, 1.3, 0.25)); look.copy(head); fov = 50; } else { pos = head.clone().add(v3(1.2, 1.4, 1.8)); look.copy(head).lerp(claw, 0.5); fov = 64; } }
  else if (t < 34) { pos = head.clone().add(v3(0, 1.2 - 0.2 * Q(22.6, 34, t), 0.25)); look.copy(head); fov = 48; }
  else if (t < 48.4) { if (t < 41.6) { pos = a.clone().addScaledVector(fwd, -5).addScaledVector(right, 2.5).add(v3(0, 1.0, 0)); look.copy(a).add(v3(0, 3, 0)).lerp(claw, 0.4); fov = 68; } else { pos = a.clone().addScaledVector(fwd, 3.6).add(v3(0, 1.2, 0)).addScaledVector(right, 0.8); look.copy(a).add(v3(0, 1.3, 0)); fov = 56; } }
  else if (t < 56) { pos = a.clone().add(v3(-9, -2, 9)); look.copy(a).lerp(tEye, 0.4); fov = 64; }
  else if (t < 66) { pos = v3(-34, H(-34, 4) + 2.5, 4); look.copy(a).add(v3(0, 2, 0)).lerp(v3(TITAN.x, 6, TITAN.z), 0.5); fov = 66; }
  else if (t < 76) { pos = head.clone().addScaledVector(fwd, 0.95).addScaledVector(right, 0.25).add(v3(0, 0.03, 0)); look.copy(head).add(v3(0, 0.03, 0)); fov = 40; }
  else if (t < 84) { pos = head.clone().addScaledVector(fwd, 0.95).addScaledVector(right, -0.25); look.copy(head); fov = 40; }
  else { const k = Q(84, 100, t); pos = a.clone().addScaledVector(fwd, -4 - 8 * k).add(v3(0, 1.6 + 5 * k, 0)).addScaledVector(right, 1.5); look.copy(a).addScaledVector(fwd, 40).add(v3(0, 6, 0)); fov = 62; }
  aim(camera, pos, look, mem ? null : H, fov);
  if (t > T_BLOCK && t < T_BLOCK + 0.6 || t > T_STRIKE && t < T_STRIKE + 0.8 || t > 57.8 && t < 59) { camera.rotation.z += (hash2(Math.floor(t * 60), 3) - 0.5) * 0.035; }
  postFx(engine, EP, t, { exposure: mem ? 2.4 : 2.2, flashes: [[12.4, 0.6, 3], [22.6, 0.6, 3], [T_BLOCK, 0.3, 4], [T_STRIKE, 0.9, 3]], glitch: t > 74 && t < 77 ? 0.12 : 0 });
}

run({ EP, engine, scene, camera, update, hud, dbg: { moonH: H, hero, devState } });
