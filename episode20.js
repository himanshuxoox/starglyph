// Episode 20 — "Signal Found" (Season 1 finale). ECHO broadcasts the beacon one last time; every Hollow ship turns
// away from Earth and follows it through a gate that closes behind them. Dev falls home through fire, splashes
// down in the Arabian Sea at sunrise, hears Anaya on the radio... and then his visor flickers: "D . E . V ."
import { THREE, SET, tag, hash2, PI, Q, pulse, glow, lerpAng,
  loadEpisode, makeStage, makeHud, postFx, run, aim } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeGate } from './engine/props.js';
import { makeDaySky } from './engine/sky.js';
import { makeOcean, waveHeight } from './engine/ocean.js';
import { makeCapsule, makeEarth, makeMoon, makeHollowShip, makeVaelorShip, makeCockpit } from './engine/space.js';

const EP = await loadEpisode('20');
const { engine, scene, camera, world } = makeStage({ fog: [0x000000, 1e5, 2e5] });
const wp = o => o.getWorldPosition(new THREE.Vector3());
const T_GATE = 21.0, T_RE = 22.4, T_CHUTE = 33.0, T_SPLASH = 40.0, T_OUT = 48.0;

// =====================================================================
// SPACE: Earth at dawn, ECHO's ship, the beacon rings, the armada, the gate
// =====================================================================
const space = new THREE.Group(); world.add(space);
const earth = makeEarth({ r: 60, lightDir: [0.7, 0.25, 0.8] }); earth.g.rotation.y = 0.9; space.add(earth.g);
const moon = makeMoon({ r: 16, seed: 7 }); moon.g.position.set(170, 24, -60); space.add(moon.g);
const sun = new THREE.DirectionalLight(0xfff0e0, 2.4); sun.position.set(700, 250, 800); space.add(sun, sun.target, new THREE.AmbientLight(0x303848, 0.7));
const G2 = v3(200, 50, -160);
const stone = new THREE.MeshStandardMaterial({ color: 0x4a4458, roughness: 0.6, metalness: 0.4, flatShading: true });
const gate = makeGate(32, stone, [0.4, 1.6, 2.2]); gate.g.position.copy(G2); gate.g.lookAt(v3(60, 26, 70)); space.add(gate.g);
const gateL = new THREE.PointLight(0x66e8ff, 0, 400, 1.2); gateL.position.copy(G2); space.add(gateL);
const vship = makeVaelorShip(0.5); space.add(vship.g);
const RINGS = [...Array(6)].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 4, 64), glow(0.3, 1.6, 2.0, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); space.add(tag(m, SET.ENERGY, true)); return m; });
const NA = 40, ARM = [...Array(NA)].map((_, i) => { const r = makeHollowShip(0.4); space.add(r.g); return { r, p0: v3(-20 + hash2(i, 1) * 160, (hash2(i, 2) - 0.5) * 80, 40 + hash2(i, 3) * 120), d: hash2(i, 4) }; });
const SHIP0 = v3(70, 28, 60);
const shipAt = t => { if (t < 9) return SHIP0.clone(); const k = Q(9, 19.2, t); return SHIP0.clone().lerp(G2, k * k); };

// =====================================================================
// RE-ENTRY: the capsule falling through fire toward a curved blue horizon
// =====================================================================
const RE = v3(0, 0, -30000);
const re = new THREE.Group(); re.position.copy(RE); world.add(re);
const big = makeEarth({ r: 2400, lightDir: [0.2, 0.6, -1], cities: 0 }); big.g.position.set(0, -2470, -600); re.add(big.g);
re.add(Object.assign(new THREE.HemisphereLight(0x8ab0ff, 0x202030, 1.0)));
const reL = new THREE.DirectionalLight(0xfff0e0, 2.0); reL.position.set(100, 200, -400); re.add(reL, reL.target);
const plasma = makePool(500, new THREE.IcosahedronGeometry(1, 0), glow(2.6, 1.1, 0.4), SET.ENERGY); re.add(plasma.mesh);
const plasmaL = new THREE.PointLight(0xff9040, 0, 30, 1.3); re.add(plasmaL);
const clouds = makePool(180, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xe8eef8, roughness: 1, flatShading: true, transparent: true, opacity: 0.85 }), SET.SKY); re.add(clouds.mesh);
const CL = [...Array(180)].map((_, i) => ({ x: (hash2(i, 1) - 0.5) * 300, y: -120 - hash2(i, 2) * 300, z: (hash2(i, 3) - 0.5) * 300, s: 4 + hash2(i, 4) * 14 }));

// =====================================================================
// OCEAN at sunrise
// =====================================================================
const OC = v3(30000, 0, 0);
const oc = new THREE.Group(); oc.position.copy(OC); world.add(oc);
const sky = makeDaySky({ pal: { top: '#16204a', mid: '#5a6aa8', horizon: '#ffb070', below: '#2a3050' }, suns: [{ dir: [0.1, 0.035, -1], r: 90, color: [3.0, 2.2, 1.4] }], clouds: 60, seed: 4 }); oc.add(sky.group);
const ocean = makeOcean({ size: 1400, seg: 200, color: 0x1a2a4a, center: [OC.x, OC.z] }); world.add(ocean.mesh);
const dawn = new THREE.DirectionalLight(0xffc890, 2.6); dawn.position.copy(OC).add(v3(30, 12, -300)); dawn.target.position.copy(OC); world.add(dawn, dawn.target);
const ocHemi = new THREE.HemisphereLight(0x8a9ad8, 0x1a2030, 1.0); oc.add(ocHemi);
const spray = makePool(400, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xe8f0ff, roughness: 0.4 }), SET.PROP); world.add(spray.mesh);
const visorGlow = new THREE.PointLight(0x66e8ff, 0, 2, 1.4); world.add(visorGlow);

// ---- capsule (one, moved between sets) + chute + cockpit ----
const capsule = makeCapsule(); world.add(capsule.g);
const chute = new THREE.Group(); world.add(chute);
const canopyM = new THREE.MeshStandardMaterial({ color: 0xf08a40, roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
chute.add(tag(new THREE.Mesh(new THREE.SphereGeometry(5, 16, 6, 0, PI * 2, 0, PI * 0.42), canopyM), SET.SUIT));
for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2, l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 9, 3), new THREE.MeshBasicMaterial({ color: 0xcccccc })); l.position.set(Math.cos(a) * 1.8, -4.0, Math.sin(a) * 1.8); l.rotation.set(Math.sin(a) * 0.38, 0, -Math.cos(a) * 0.38); chute.add(tag(l, SET.PROP)); }
const CK = v3(-9000, 0, 0);
const ck = makeCockpit(); ck.g.position.copy(CK); world.add(ck.g);
const winFire = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), glow(2.4, 1.0, 0.4)); winFire.position.copy(CK).add(v3(0, 1.35, -1.54)); world.add(tag(winFire, SET.ENERGY));
const faceFill = new THREE.PointLight(0xffc8b8, 1.2, 4, 1.2); world.add(faceFill);

// =====================================================================
// HERO + PIXEL
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 0;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const inCk = t => t >= 25.4 && t < 31;
const capY = t => -0.9 + waveHeight(OC.x, OC.z, t) * 0.6;
function devState(t) {
  const S = { loc: 'none', p: v3(), rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0 };
  if (inCk(t)) { S.loc = 'C'; S.p = v3(0, 0.2 + 0.03 * Math.sin(t * 41), 0.1); S.crouch = 1; S.lean = -0.25; S.lookUp = 0.15 + 0.05 * Math.sin(t * 29); S.armRo = { x: -1.1, z: -0.1, ex: -0.9, w: 1 }; S.armLo = { x: -1.1, z: 0.1, ex: -0.9, w: 1 }; return S; }
  if (t < T_OUT) return S;
  S.loc = 'O';
  const climb = Q(T_OUT, 50.4, t);
  S.p = v3(0.95, capY(t) + lerp(1.0, 2.05, climb), 0.15); S.rotY = PI - 0.2; S.crouch = 1; S.lean = -0.15; S.lookUp = 0.12;
  S.armRo = { x: -0.5, z: -0.3, ex: -0.6, w: 0.8 }; S.armLo = { x: -0.5, z: 0.3, ex: -0.6, w: 0.8 };
  if (t > 64 && t < 79) { const w = Q(64.2, 65, t) * (1 - Q(78, 79, t)); S.armLo = { x: -2.2, z: 0.6, ex: -1.9, w }; S.headYaw = 0.25 * w; S.lookUp = 0.05 - 0.15 * Q(69, 70, t); }
  if (t > 80) { S.lookUp = 0.15 + 0.35 * Q(86, 88, t); S.headYaw = 0.2 * Math.sin(t * 0.4) * (1 - Q(84, 85, t)); }
  return S;
}
window.AUDIO_META = {};
const look = new THREE.Vector3();
const VISOR = [[23.4, 31.0, 'HULL TEMP  ▸ 1,640 °C\nALT  ▸ 82 KM ▾'], [63.6, 79.0, 'RADIO  ▸ ISRO MISSION CONTROL\nPATCHING  ▸ ANAYA'], [80.0, 84.0, '▒▒▒  ▒▒  ▒▒▒▒'], [88.6, 94.0, 'KESTREL-4  ▸ SIGNAL FOUND\nORIGIN  ▸ THE COIL']];
const hud = makeHud(EP, { visor: VISOR });

function update(t) {
  const S = devState(t);
  const set = t < T_RE ? 'SP' : inCk(t) ? 'C' : t < 36.6 ? 'RE' : 'OC';
  space.visible = set === 'SP'; re.visible = set === 'RE'; oc.visible = ocean.mesh.visible = set === 'OC'; ck.g.visible = winFire.visible = set === 'C';
  if (set === 'OC') { scene.fog.color.set(0xc89a8a); scene.fog.near = 120; scene.fog.far = 1400; } else { scene.fog.near = 1e5; scene.fog.far = 2e5; }
  // ---- space ----
  earth.U.uT.value = t; moon.set(t, 2.8); moon.core.visible = false;
  const sp = shipAt(t); vship.g.position.copy(sp); vship.g.lookAt(t < 9 ? v3(0, 0, 0) : G2.clone().add(G2.clone().sub(SHIP0))); vship.flame.visible = t > 9;
  vship.bandMat.color.setRGB(0.3, 1.5, 1.8).multiplyScalar(1 + 0.8 * Math.max(0, Math.sin(t * 5)) * (t < 10 ? 1 : 0));
  vship.g.visible = t < 19.4;
  RINGS.forEach((m, i) => { const u = ((t - 0.4) / 1.2 - i) , k = u - Math.floor(u / 6) * 6; const on = t > 0.4 && t < 10 && k < 3.2; m.visible = on; const r = 4 + k * 70; m.position.copy(sp); m.scale.setScalar(r); m.lookAt(sp.clone().add(v3(-30, 14, 80))); m.material.opacity = 0.9 * (1 - k / 3.2); });
  ARM.forEach((A, i) => { const turn = Q(3 + A.d * 3, 7 + A.d * 3, t), follow = Q(9 + A.d * 2, 20.4, t);
    const p = A.p0.clone().lerp(sp.clone().add(A.p0.clone().sub(SHIP0).multiplyScalar(0.25)), follow * 0.9 + turn * 0.1);
    A.r.g.position.copy(p); A.r.g.lookAt(turn > 0.5 ? sp : v3(0, 0, 0)); A.r.g.visible = t < T_GATE - 0.2 && !(follow > 0.97); });
  gate.set(t, Q(10, 12, t) * (1 - Q(20.2, T_GATE, t))); gateL.intensity = 200 * Q(10, 12, t) * (1 - Q(20.2, T_GATE, t)) + 800 * pulse(t, T_GATE, 0.6);
  // ---- re-entry ----
  let cp, crot = new THREE.Euler(-PI / 2, 0, 0);
  if (set === 'RE' || set === 'C') {
    const k = Q(T_RE, 36.6, t); cp = RE.clone().add(v3(0, lerp(300, -60, k), 0)); crot = new THREE.Euler(-PI / 2 + 0.08 * Math.sin(t * 13) * (1 - Q(T_CHUTE, 34, t)), 0, 0.06 * Math.sin(t * 9));
    const heat = Q(T_RE, 24, t) * (1 - Q(31, 32.6, t)), P = [];
    for (let i = 0; i < 260 * (heat > 0.01 ? 1 : 0); i++) { const u = ((t * 2.2 + hash2(i, 1)) % 1), a = hash2(i, 2) * PI * 2, r = 1.8 + u * (3 + 4 * hash2(i, 3)); P.push({ x: Math.cos(a) * r, y: cp.y - RE.y - 3 + u * 16, z: Math.sin(a) * r, s: (0.25 + 0.5 * hash2(i, 4)) * (1 - u) * heat }); }
    plasma.set(P); plasmaL.position.set(0, cp.y - RE.y - 2, 2); plasmaL.intensity = 60 * heat;
    clouds.set(CL.map(c => ({ x: c.x, y: c.y + (t - T_RE) * 16, z: c.z, s: c.s })));
  } else if (set === 'OC') { cp = OC.clone().add(v3(0, capY(t), 0)); crot = new THREE.Euler(-PI / 2 + 0.06 * Math.sin(t * 0.9), 0, 0.08 * Math.sin(t * 0.7)); }
  else cp = v3(0, -1e4, 0);
  if (set === 'OC' && t < T_SPLASH) { const k = Q(36.6, T_SPLASH, t); cp = OC.clone().add(v3(0, lerp(40, capY(t), k), 0)); }
  capsule.g.position.copy(cp); capsule.g.rotation.copy(crot); capsule.set(t, 0); capsule.g.visible = set === 'RE' || set === 'OC';
  chute.visible = (set === 'RE' && t > T_CHUTE) || (set === 'OC' && t < T_SPLASH + 0.6);
  chute.position.copy(cp).add(v3(0, 9 * Q(T_CHUTE, T_CHUTE + 0.8, t) + 3 - (t > T_SPLASH ? 8 * Q(T_SPLASH, T_SPLASH + 0.6, t) : 0), 0)); chute.scale.setScalar(0.2 + 0.8 * Q(T_CHUTE, T_CHUTE + 0.8, t));
  ocean.U.uTime.value = t;
  const ds = t - T_SPLASH, SPR = []; if (ds > 0 && ds < 2.4) for (let k = 0; k < 300; k++) { const a = hash2(k, 1) * PI * 2, sp2 = 3 + hash2(k, 2) * 8, up = 6 + hash2(k, 3) * 10; SPR.push({ x: OC.x + Math.cos(a) * (2 + sp2 * ds), y: up * ds - 9.8 * ds * ds * 0.8, z: OC.z + Math.sin(a) * (2 + sp2 * ds), s: 0.18 * (1 - ds / 2.4) }); }
  spray.set(SPR.filter(s => s.y > -1));
  // ---- hero ----
  poseHero(hero, S, t);
  hero.root.visible = S.loc !== 'none';
  hero.root.position.copy(S.p).add(S.loc === 'C' ? CK : OC); hero.root.rotation.set(0, S.rotY, 0);
  hero.handGun.visible = false; hero.gun.visible = true;
  hero.root.updateMatrixWorld(true);
  const head = wp(hero.head);
  faceFill.position.copy(head).add(v3(0, 0.3, -0.8)); faceFill.intensity = S.loc === 'C' ? 1.2 : 0.5;
  visorGlow.position.copy(head).add(v3(0, 0, -0.25)); visorGlow.intensity = 3 * (Q(80, 80.6, t) * (0.6 + 0.4 * Math.sin(t * 30))) + 3 * Q(84, 85, t) * (1 - Q(94, 95, t)); visorGlow.color.set(t > 88.6 ? 0xff4050 : 0x66e8ff);
  ck.set(t); ck.light.intensity = 1.4; ck.red.intensity = 2 * (0.5 + 0.5 * Math.sin(t * 7));
  { let pp = wp(hero.shoulderL).add(v3(0, 0.03, 0)), sc = 0.5, rot = S.rotY + 0.3, lk = Math.sin(t) * 0.4;
    if (S.loc === 'O' && t > 53.4 && t < 63) { const k = Q(53.4, 54.4, t); pp = pp.lerp(hero.root.position.clone().add(v3(-0.35, 0.55, -0.7)), k); sc = lerp(0.5, 0.7, k); rot = PI; lk = 0; }
    pixel.g.visible = hero.root.visible; pixel.g.position.copy(pp); pixel.g.rotation.set(0, rot, 0); pixel.g.scale.setScalar(sc);
    poseSkitterling(pixel, { curl: S.loc === 'C' ? 0.9 : 0.2, eyeOpen: 1, look: lk, t }); }
  // ---- cameras ----
  let pos = v3(), fov = 56;
  if (t < 5) { pos = SHIP0.clone().add(v3(-30, 10, 60)); look.copy(SHIP0); fov = 56; }
  else if (t < 9) { pos = v3(20, 60, 230); look.copy(SHIP0).lerp(v3(60, 0, 100), 0.4); fov = 58; }
  else if (t < 16.4) { pos = SHIP0.clone().add(v3(-40, 20, 70)); look.copy(sp).lerp(G2, 0.3); fov = 56; }
  else if (t < 19.8) { pos = sp.clone().add(v3(-14, 6, 28)); look.copy(sp).lerp(G2, 0.3); fov = 58; }
  else if (t < T_RE) { pos = G2.clone().add(v3(-120, 20, 240)); look.copy(G2); fov = 50; }
  else if (t < 25.4) { pos = cp.clone().add(v3(9, -6, 12)); look.copy(cp); fov = 60; }
  else if (t < 31) { pos = head.clone().add(v3(0.45, 0.05, -0.85)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 36.6) { pos = cp.clone().add(v3(-10, -4, 16)); look.copy(cp).add(v3(0, 3, 0)); fov = 58; }
  else if (t < 44.8) { pos = OC.clone().add(v3(-22, 4, 30)); look.copy(cp).add(v3(0, 2, 0)); fov = 54; }
  else if (t < T_OUT) { pos = OC.clone().add(v3(6, 2.4, 9)); look.copy(cp).add(v3(0, 1, 0)); fov = 54; }
  else if (t < 54.0) { const k = Q(T_OUT, 54, t); pos = OC.clone().add(v3(5 - 2 * k, 1.6 + 2 * k, 7)); look.copy(hero.root.position).add(v3(0, 0.5, 0)); fov = 54; }
  else if (t < 58.6) { pos = pixel.g.position.clone().add(v3(0.55, 0.2, -1.3)); look.copy(pixel.g.position).add(v3(0, 0.05, 0)); fov = 46; }
  else if (t < 64.0) { pos = OC.clone().add(v3(-4, 1.8, 5)); look.copy(OC).add(v3(0, 1, -120)); fov = 62; }
  else if (t < 72.4) { pos = head.clone().add(v3(0.4, 0.05, -0.85)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
  else if (t < 80) { const k = Q(72.4, 80, t); pos = OC.clone().add(v3(-14 - 10 * k, 4 + 4 * k, -18 - 6 * k)); look.copy(cp).add(v3(0, 1.5, 0)); fov = 56; }
  else if (t < 94) { pos = head.clone().add(v3(0.35, 0.02, -0.8)); look.copy(head).add(v3(0, -0.05, 0)); fov = t > 88.6 ? 38 : 42; }
  else { const k = Q(94, 100, t); pos = OC.clone().add(v3(0, 3 + 30 * k, 14 + 40 * k)); look.copy(OC).add(v3(0, 1 + 20 * k, -200)); fov = 60; }
  aim(camera, pos, look, null, fov);
  postFx(engine, EP, t, { exposure: set === 'OC' ? 2.4 : set === 'C' ? 2.6 : 2.4, glitch: (t > 79.8 && t < 80.6 ? 0.35 : 0) + (t > 84 && t < 84.6 ? 0.25 : 0), flashes: [[T_GATE, 0.9, 1.6], [T_SPLASH, 0.3, 3], [89.6, 0.3, 2.5]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { hero, devState } });
