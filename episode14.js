// Episode 14 — "ECHO's Secret". In the hive tunnel Mira's Hollow eye is open. She wakes ECHO with a vein of the
// hive; ECHO shows its memory: the Vaelor built the Hollow, ECHO was the first, it fled and hid on our Moon.
// The beacon was a call for a host. "I NEED YOUR WORLD, DEV."
import { THREE, SET, tag, hash2, PI, Q, pulse, glow, P2, faceTo, lerpAng, canvasTex,
  loadEpisode, makeStage, makeHud, postFx, run, aim } from './engine/kit.js';
import { lerp, v3 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeHollow, makeHollowArmy, poseHollow } from './engine/hollow.js';
import { makeCorridor, makeMira, boneMat, veinMat } from './engine/hive.js';
import { glyphMaterial, makePillar, makeVaelorStatue, makeGalaxy } from './engine/props.js';
import { makeEarth, makeMoon, makeVaelorShip } from './engine/space.js';

const EP = await loadEpisode('14');
const { engine, scene, camera, world } = makeStage({ fog: [0x1a0c10, 4, 34] });
const wp = o => o.getWorldPosition(new THREE.Vector3());

// =====================================================================
// THE TUNNEL (where Ep 13 ended)
// =====================================================================
const tunnel = new THREE.Group(); world.add(tunnel);
const bone = boneMat(), vein = veinMat();
const C = makeCorridor([v3(0, 0, 10), v3(0, 0, 0), v3(0.6, 0, -10), v3(2, 0, -20)], { bone, vein, w: 3.4, h: 3.4 }); tunnel.add(C.g);
for (const z of [6, -3, -12]) { const l = new THREE.PointLight(0xff4a50, 9, 11, 1.5); l.position.set(0, 2.6, z); tunnel.add(l); }
const hemi = new THREE.HemisphereLight(0x8a4a5a, 0x100810, 1.0); tunnel.add(hemi);
const faceFill = new THREE.PointLight(0xffc8b8, 4, 5, 1.2); tunnel.add(faceFill);
const suitGlow = new THREE.PointLight(0x5ae8ff, 0, 5, 1.4); tunnel.add(suitGlow);
const eyeLight = new THREE.PointLight(0xff2a30, 0, 3, 1.5); tunnel.add(eyeLight);
// the vein cable she pulls out of the wall (rebuilt per frame: 5 control points)
const cableMat = glow(1.8, 0.12, 0.18);
const cable = new THREE.Mesh(new THREE.BufferGeometry(), cableMat); tunnel.add(tag(cable, SET.ENERGY));
const WALL_PT = v3(1.6, 1.3, -1.4);
const sparks = makePool(400, new THREE.IcosahedronGeometry(1, 0), glow(2.2, 0.3, 0.3), SET.ENERGY); tunnel.add(sparks.mesh);
const cyanSparks = makePool(400, new THREE.IcosahedronGeometry(1, 0), glow(0.5, 1.9, 2.3), SET.ENERGY); tunnel.add(cyanSparks.mesh);

// =====================================================================
// ECHO'S MEMORY (a void with a glyph grid floor)
// =====================================================================
const MEM = v3(-6000, 0, 0);
const mem = new THREE.Group(); mem.position.copy(MEM); world.add(mem);
const gridTex = canvasTex(512, 512, (g, W, H) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, H); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(W, i * 64); g.stroke(); } });
gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(60, 60);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0e18, roughness: 0.8, emissive: 0x3ad8ff, emissiveMap: gridTex, emissiveIntensity: 0.35 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), floorMat); floor.rotation.x = -PI / 2; mem.add(tag(floor, SET.ROCK));
const stone = new THREE.MeshStandardMaterial({ color: 0x4a4866, roughness: 0.75, metalness: 0.15, flatShading: true });
const glyphs = [0, 1, 2].map(s => glyphMaterial({ seed: s + 20, glow: 0x55e6ff }));
const PILLARS = [];
for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2, r = 20 + (i % 2) * 6; const p = makePillar(14 + (i % 3) * 5, 1.1, stone, glyphs[i % 3]); p.g.position.set(Math.sin(a) * r, 0, Math.cos(a) * r - 10); mem.add(p.g); PILLARS.push(p); }
const STAT = [[-7, -4, 0.6], [7, -4, -0.6], [-11, -14, 0.9], [11, -14, -0.9], [0, -22, 0]].map(([x, z, ry]) => { const s = makeVaelorStatue(11, stone); s.position.set(x, 0, z); s.rotation.y = ry; mem.add(s); return s; });
const galaxy = makeGalaxy({ n: 2600, radius: 9 }); galaxy.g.scale.setScalar(4.5); galaxy.g.position.set(0, 46, -60); galaxy.g.rotation.x = 0.5; mem.add(galaxy.g);
const memKey = new THREE.DirectionalLight(0xbfd8ff, 1.6); memKey.position.set(-20, 40, 30); mem.add(memKey, new THREE.HemisphereLight(0x5ac8ff, 0x0a0a18, 0.8));
const memRed = new THREE.PointLight(0xff3040, 0, 120, 1.2); memRed.position.set(0, 10, -8); mem.add(memRed);
const first = makeHollow('scout'); mem.add(first.root); first.setCloak(1, 0, 0);
const army = makeHollowArmy(48); mem.add(army.group);
const SOLD = [...Array(48)].map((_, i) => { const a = hash2(i, 1) * PI * 2, r = 8 + hash2(i, 2) * 22; return { x: Math.sin(a) * r, z: Math.cos(a) * r - 10, ry: a + PI, t0: 50.2 + hash2(i, 3) * 2.4 }; });
const embers = makePool(900, new THREE.IcosahedronGeometry(1, 0), glow(2.4, 0.4, 0.2), SET.ENERGY); mem.add(embers.mesh);
// Earth, the Moon and the fleeing ship (same memory void, far away)
const SPC = v3(0, 0, -2000);
const earth = makeEarth({ r: 60, lightDir: [-0.3, 0.25, 1] }); earth.g.position.copy(SPC).add(v3(-60, 40, -120)); earth.g.rotation.y = 2.0; mem.add(earth.g);
const moon = makeMoon({ r: 15 }); moon.g.position.copy(SPC).add(v3(110, 55, -40)); mem.add(moon.g);
const ship = makeVaelorShip(0.5); mem.add(ship.g);
const spaceSun = new THREE.DirectionalLight(0xfff0e0, 2.0); spaceSun.position.copy(SPC).add(v3(400, 100, 300)); spaceSun.target.position.copy(SPC); mem.add(spaceSun, spaceSun.target);

// =====================================================================
// CHARACTERS
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 0;
const mira = makeMira(); scene.add(mira.root);
const pixel = makeSkitterling(1); scene.add(pixel.g);
const D0 = v3(-0.85, 0, 0.4), M0 = v3(0.75, 0, -2.0);
const MEM0 = 32.0, MEM1 = 62.0;
function devState(t) {
  const S = { loc: t >= MEM0 && t < MEM1 ? 'M' : 'T', p: D0.clone(), rotY: faceTo(D0, M0), walk: 0, phase: 0, crouch: 1, lookUp: -0.3, headYaw: 0, armRo: null, armLo: null, lean: -0.1 };
  const wake = Q(1.4, 3.0, t), stand = Q(4.0, 6.2, t);
  S.lookUp = lerp(-0.55, 0.05, wake); S.crouch = 1 - 0.75 * stand; S.lean = -0.1 * (1 - stand);
  const aimK = Q(6.0, 6.8, t) * (1 - Q(18.6, 19.6, t));
  if (aimK > 0) { S.armRo = { x: -1.5, z: 0.08, ex: -0.3, w: aimK }; S.armLo = { x: -1.3, z: -0.3, ex: -0.9, w: aimK }; }
  if (t > 19.6) { S.crouch = 0.25; S.lookUp = -0.1; }
  if (t > 24.4 && t < 31) { const k = Q(24.6, 25.6, t) * (1 - Q(29.6, 31, t)); S.lean = -0.18 * k; S.lookUp = -0.35 * k; S.headYaw = 0; }
  if (t > 28.6 && t < 32) S.lookUp = lerp(-0.35, 0.15, Q(28.6, 29.6, t));
  if (t >= MEM1) { S.crouch = 0.25; S.lookUp = 0.05 + 0.1 * Math.sin(t * 0.4); S.headYaw = t > 80 ? -0.25 * Q(85.4, 86.4, t) * (1 - Q(88.6, 89.6, t)) : 0; }
  return S;
}
function miraState(t) {
  const S = { p: M0.clone(), rotY: faceTo(M0, D0), walk: 0, phase: 0, crouch: 0.9, lookUp: -0.05, headYaw: 0, armRo: null, armLo: null, lean: 0 };
  const hands = Q(6.6, 7.4, t) * (1 - Q(18.0, 19.2, t));
  if (hands > 0) { S.armRo = { x: -2.4, z: -0.45, ex: -1.5, w: hands }; S.armLo = { x: -2.4, z: 0.45, ex: -1.5, w: hands }; }
  if (t > 19.0) {                                         // stands, reaches for the wall vein, walks it over to him
    const st = Q(19.0, 20.4, t); S.crouch = 0.9 * (1 - st);
    const grab = Q(20.4, 21.4, t), walk = Q(21.6, 23.6, t);
    S.p = M0.clone().lerp(v3(0.55, 0, -1.0), Q(20.0, 20.6, t)).lerp(D0.clone().add(v3(0.85, 0, -0.55)), walk);
    S.rotY = lerpAng(faceTo(M0, WALL_PT), faceTo(S.p, D0), Q(21.4, 22.0, t));
    S.walk = Q(21.6, 21.9, t) * (1 - Q(23.2, 23.6, t)); S.phase = walk * 8;
    S.armRo = { x: lerp(-1.3, -1.1, walk), z: -0.2, ex: -0.5, w: grab };
    if (t > 23.6) { S.crouch = 0.3 * Q(23.6, 24.4, t); S.armRo = { x: -1.0, z: -0.05, ex: -0.4, w: 1 - Q(30, 31, t) }; }
    if (t >= MEM1) { S.p = D0.clone().add(v3(1.3, 0, -0.9)); S.rotY = faceTo(S.p, D0) - 0.3; S.crouch = 0.6; S.armRo = null; S.lookUp = -0.05; S.headYaw = 0.3 * Q(90, 91, t); }
  }
  return S;
}

const look = new THREE.Vector3();
const VISOR = [[28.2, 32.0, 'ECHO CORE  ▮▮▮▯▯▯▯▯▯▯\nREBOOT  ▸ HIVE POWER\nHOST  COMPATIBLE'], [80.2, 86.0, 'HOST  ▸ EARTH\nPOPULATION  8 100 000 000\nCOMPATIBLE  ✓']];
const hud = makeHud(EP, { visor: VISOR });
window.AUDIO_META = { foot: [{ t: 22.0, water: false }, { t: 22.6, water: false }, { t: 23.2, water: false }] };

function update(t) {
  const S = devState(t), M = miraState(t), inMem = S.loc === 'M';
  tunnel.visible = !inMem; mem.visible = inMem;
  if (inMem) { scene.fog.color.set(0x02040a); scene.fog.near = t < 56 ? 40 : 1e5; scene.fog.far = t < 56 ? 220 : 2e5; }
  else { scene.fog.color.set(0x1a0c10); scene.fog.near = 4; scene.fog.far = 34; }
  hero.root.visible = mira.root.visible = pixel.g.visible = !inMem;
  // ---- Dev ----
  poseHero(hero, S, t);
  hero.root.position.copy(S.p); hero.root.rotation.set(0, S.rotY, 0); hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = wp(hero.head), fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  hero.handGun.visible = t > 6.0 && t < 19.4; hero.gun.visible = !hero.handGun.visible;
  const echoOn = Q(28.4, 29.4, t), red = Q(80.2, 81.0, t);
  const flick = t > 24.6 && t < 28.4 ? (hash2(Math.floor(t * 18), 3) > 0.55 ? 0.9 : 0.05) : 0;
  const cy = Math.max(flick, echoOn * (0.9 + 0.3 * Math.sin(t * 3)));
  hero.cyanMat.color.setRGB(0.12, 0.3, 0.35).lerp(new THREE.Color(0.35, 1.6, 1.8), cy).lerp(new THREE.Color(1.8, 0.25, 0.3), red * (0.6 + 0.4 * Math.sin(t * 7)));
  suitGlow.position.copy(head).addScaledVector(fwd, 0.4); suitGlow.intensity = 3 * cy; suitGlow.color.set(red > 0.5 ? 0xff4a50 : 0x5ae8ff);
  // ---- Mira ----
  poseHero(mira, M, t);
  mira.root.position.copy(M.p); mira.root.rotation.set(0, M.rotY, 0); mira.root.updateMatrixWorld(true);
  const mh = wp(mira.head), mf = v3(Math.sin(M.rotY), 0, Math.cos(M.rotY));
  mira.hollowEye.visible = true; const eo = 0.75 + 0.25 * Math.sin(t * 2.2) + 0.6 * pulse(t, 80.4, 3);
  mira.hollowEye.scale.setScalar(2.0 * eo); eyeLight.position.copy(wp(mira.hollowEye)).addScaledVector(mf, 0.3); eyeLight.intensity = 1.6 * eo;
  mira.headLight.intensity = 0;
  faceFill.position.copy(mh.clone().lerp(head, 0.5)).add(v3(0, 0.6, 0)).addScaledVector(right, 0.6);
  // ---- the cable ----
  const plugged = t > 24.2 && t < 31.0;
  cable.visible = !inMem && t > 20.6 && t < 31.0;
  if (cable.visible) {
    const hand = wp(mira.handR), chest = wp(hero.pocket).add(v3(-0.06, 0.04, 0.02));
    const end = plugged ? chest : hand, mid = WALL_PT.clone().lerp(end, 0.5).add(v3(0, -0.45, 0));
    const curve = new THREE.CatmullRomCurve3([WALL_PT, WALL_PT.clone().lerp(mid, 0.5).add(v3(0, -0.1, 0)), mid, end]);
    cable.geometry.dispose(); cable.geometry = new THREE.TubeGeometry(curve, 24, 0.022, 5);
    cableMat.color.setRGB(1.8, 0.12, 0.18).multiplyScalar(0.6 + 0.6 * Math.max(0, Math.sin(t * 9 - 0)));
  }
  const sp = [], cs = [];
  if (!inMem && t > 24.2 && t < 29.0) { const c0 = wp(hero.pocket); for (let i = 0; i < 40; i++) { const tt = Math.floor(t * 30) / 30 - (i % 10) * 0.03, dt = t - tt, ang = hash2(i, Math.floor(tt * 30)) * 6.283; sp.push({ x: c0.x + Math.cos(ang) * dt * 2, y: c0.y + Math.sin(ang * 1.3) * dt * 1.5 - dt * dt * 3, z: c0.z + Math.sin(ang) * dt * 2, s: 0.012 * (1 - dt * 3) }); } }
  if (!inMem && t > 28.4 && t < 31.5) { const c0 = head; for (let i = 0; i < 60; i++) { const ang = i * 2.4 + t * 2, r = 0.25 + 0.4 * ((t * 0.8 + hash2(i, 5)) % 1); cs.push({ x: c0.x + Math.cos(ang) * r, y: c0.y - 0.6 + ((t * 0.6 + hash2(i, 6)) % 1) * 1.2, z: c0.z + Math.sin(ang) * r, s: 0.012 }); } }
  sparks.set(sp); cyanSparks.set(cs);
  // ---- Pixel: on Dev's shoulder; red + hissing at the end ----
  { const sh = wp(hero.shoulderL); pixel.g.position.copy(sh).add(v3(0, 0.03, 0)); pixel.g.rotation.set(0, S.rotY + 0.4 * Math.sin(t * 0.6), 0); pixel.g.scale.setScalar(0.5);
    const hiss = Q(85.4, 85.8, t); poseSkitterling(pixel, { curl: t < 3 ? 0.8 : 0.1, eyeOpen: (t % 3.9) < 0.12 ? 0.1 : 1, look: hiss ? 0 : Math.sin(t * 1.2) * 0.4, t });
    pixel.stripe.color.setRGB(...(hiss > 0.5 ? [1.9, 0.2, 0.3] : [0.3, 1.7, 1.9])).multiplyScalar(1 + 0.8 * hiss * Math.max(0, Math.sin(t * 14))); }

  // ---- memory ----
  if (inMem) {
    const glowK = t < 50 ? 1 : 1 - Q(50.2, 52.4, t);
    glyphs.forEach(g => { g.emissive.set(0x55e6ff).lerp(new THREE.Color(0xff3040), 1 - glowK); g.emissiveIntensity = 0.4 + 0.5 * Math.sin(t * 1.3) ** 2; });
    floorMat.emissive.set(0x3ad8ff).lerp(new THREE.Color(0xff3040), 1 - glowK);
    galaxy.set(t, Q(32, 36, t), 0.05); galaxy.g.visible = t < 50.2;
    memRed.intensity = 30 * (1 - glowK);
    // the first Hollow: cyan eye; later all the others open red eyes
    first.root.visible = t >= 39.6 && t < 56; first.root.position.set(0, 0, -6); first.root.rotation.set(0, 0.2 * Math.sin(t * 0.4), 0);
    poseHollow(first, { crawl: 0, walk: 0, t, twitch: 0.3, lookUp: 0.15 }); first.setCloak(Q(39.6, 41.4, t), 0.8 * (1 - Q(40.6, 41.6, t)), t);
    first.red.color.setRGB(0.3, 1.8, 2.2);
    army.group.visible = t > 50; const L = SOLD.map((s, i) => { const rise = Q(s.t0, s.t0 + 1.6, t); return { on: t > s.t0, x: s.x, y: 0, z: s.z, rotY: s.ry, scale: 1.1, pose: { crawl: 0.4, rise, t, twitch: 1, lookUp: 0.2 }, eye: Q(s.t0 + 0.8, s.t0 + 1.2, t) }; }); army.set(L);
    const E = []; if (t > 50.2 && t < 56) for (let i = 0; i < 700; i++) { const ph = (t * 0.25 + hash2(i, 1)) % 1; E.push({ x: (hash2(i, 2) - 0.5) * 70, y: ph * 30, z: (hash2(i, 3) - 0.5) * 60 - 10, s: 0.08 * (1 - ph) }); } embers.set(E);
    STAT.forEach((s, i) => { s.rotation.z = (t > 52 ? Q(52 + i * 0.4, 54 + i * 0.4, t) : 0) * (i % 2 ? 0.5 : -0.5); });
    // the ship flees past Earth to the Moon
    const k = Q(56, 62, t);
    ship.g.position.copy(SPC).add(v3(lerp(-220, 92, k), lerp(10, 50, k), lerp(150, -36, k))); ship.g.lookAt(moon.g.position.clone().add(v3(0, 0, 0)).add(MEM)); ship.flame.visible = true;
    moon.set(t, 0); earth.U.uT.value = t;
  }

  // ---- cameras ----
  let pos = v3(), fov = 50;
  const mid = mh.clone().lerp(head, 0.5), dd = head.clone().sub(mh).setY(0).normalize(), pp = v3(-dd.z, 0, dd.x);
  if (t < 4.0) { const ew = wp(mira.hollowEye), k = Q(0, 4, t); pos = ew.clone().addScaledVector(mf, 0.38 + 1.5 * k).add(v3(0, 0.04 + 0.25 * k, 0)).addScaledVector(pp, 0.1); look.copy(ew).lerp(mid, 0.6 * k); fov = 40; }
  else if (t < 8.0) { pos = mh.clone().addScaledVector(mf, -0.9).addScaledVector(pp, 0.45).add(v3(0, 0.25, 0)); look.copy(head).add(v3(0, -0.2, 0)); fov = 46; }
  else if (t < 12.0) { pos = mh.clone().addScaledVector(mf, 1.25).addScaledVector(pp, -0.2).add(v3(0, 0.02, 0)); look.copy(mh).add(v3(0, -0.12, 0)); fov = 40; }
  else if (t < 16.0) { pos = head.clone().addScaledVector(fwd, 1.2).addScaledVector(right, 0.25).add(v3(0, 0.0, 0)); look.copy(head).add(v3(0, -0.08, 0)); fov = 40; }
  else if (t < 24.2) { const k = Q(16, 24, t); pos = v3(-0.35 + 0.3 * k, 1.55, 3.6 - 0.4 * k); look.copy(mid).add(v3(0, -0.35, 0)); fov = 58; }
  else if (t < 28.4) { const ch = wp(hero.pocket); pos = v3(-0.1, 1.65, 2.9); look.copy(ch).lerp(WALL_PT, 0.3); fov = 46; }
  else if (t < MEM0) { pos = head.clone().addScaledVector(fwd, 0.9).addScaledVector(right, 0.2); look.copy(head).add(v3(0, -0.06, 0)); fov = 38; }
  else if (t < 40) { const k = Q(MEM0, 40, t); pos = MEM.clone().add(v3(lerp(-6, 6, k), lerp(3, 9, k), lerp(26, 18, k))); look.copy(MEM).add(v3(0, lerp(10, 22, k), -30)); fov = 70; }
  else if (t < 50.2) { const k = Q(40, 50, t), fp = first.root.position.clone().add(MEM); pos = fp.clone().add(v3(Math.sin(0.6 + 0.5 * k) * (5.5 - 1.5 * k), 2.4 - 0.4 * k, Math.cos(0.6 + 0.5 * k) * (5.5 - 1.5 * k))); look.copy(fp).add(v3(0, 2.1, 0)); fov = 50; }
  else if (t < 56) { const k = Q(50, 56, t); pos = MEM.clone().add(v3(0, 6 + 10 * k, 30 + 10 * k)); look.copy(MEM).add(v3(0, 1.5, -10)); fov = 66; }
  else { const sp2 = ship.g.position.clone().add(MEM), mp = moon.g.position.clone().add(MEM), back = sp2.clone().sub(mp).normalize(); pos = sp2.clone().addScaledVector(back, 34).add(v3(-10, 9, 0)); look.copy(sp2).lerp(mp, 0.5); fov = 56; }
  if (t >= MEM1) {
    if (t < 66) { pos = v3(0.3, 1.45, -5.2); look.copy(mid).add(v3(0, -0.3, 0)); fov = 54; }
    else if (t < 74) { const k = Q(66, 74, t); pos = head.clone().addScaledVector(fwd, 1.25 - 0.3 * k).addScaledVector(right, 0.3).add(v3(0, 0.02, 0)); look.copy(head).add(v3(0, -0.06, 0)); fov = 38; }
    else if (t < 80.2) { pos = head.clone().addScaledVector(fwd, -0.9).addScaledVector(right, 0.55).add(v3(0, 0.2, 0)); look.copy(mh).add(v3(0, -0.15, 0)); fov = 48; }
    else if (t < 85.4) { const k = Q(80.2, 85.4, t); pos = head.clone().addScaledVector(fwd, 0.85 - 0.3 * k).add(v3(0, 0.0, 0)); look.copy(head).add(v3(0, -0.05, 0)); fov = 36; }
    else if (t < 90) { const pk = wp(pixel.g); pos = pk.clone().addScaledVector(fwd, 0.55).addScaledVector(right, 0.25).add(v3(0, 0.05, 0)); look.copy(pk); fov = 44; }
    else if (t < 96.6) { const k = Q(90, 96.6, t); pos = v3(-0.4, 1.6 - 0.2 * k, 3.8 - 0.8 * k); look.copy(mid).add(v3(0, -0.3, 0)); fov = 54; }
    else { pos = head.clone().addScaledVector(fwd, 0.62); look.copy(head); fov = 34; }
  }
  aim(camera, pos, look, null, fov);
  postFx(engine, EP, t, { exposure: inMem ? 2.6 : 3.2, glitch: t > 31.6 && t < 32.4 ? 0.5 : (t > 61.6 && t < 62.4 ? 0.5 : 0), flashes: [[MEM0, 0.6, 3], [MEM1, 0.6, 3], [80.4, 0.15, 5]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { hero, mira, devState } });
