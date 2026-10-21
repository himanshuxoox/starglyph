// Episode 13 — "Mira". Her hideout in the hive wall: ten thousand tally marks, the hatch of the Kestrel-4,
// a flashback (a ring past Jupiter that pulled them in), the fourth key, a crawl through a vent, the Hollow
// walking right past her... and, at night, a red eye opening in her suit.
import { THREE, SET, tag, hash2, PI, Q, pulse, glow, P2, faceTo, lerpAng,
  loadEpisode, makeStage, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeHollow, poseHollow } from './engine/hollow.js';
import { makeCorridor, makePodChamber, makeMira, makeHideout, boneMat } from './engine/hive.js';
import { makeKey, makeGate, KEY_COLORS } from './engine/props.js';
import { makeGasGiant, makeCapsule, makeHollowShip } from './engine/space.js';

const EP = await loadEpisode('13');
const { engine, scene, camera, world } = makeStage({ fog: [0x1a0c10, 4, 40] });

// ---- the hideout + the nest (vent, chamber, exit tunnel), all inside one group ----
const HO = v3(6000, 0, 0);
const nest = new THREE.Group(); nest.position.copy(HO); world.add(nest);
const hide = makeHideout(); nest.add(hide.g);
const bone = boneMat();
const vent = makeCorridor([v3(0, 0, -12), v3(1.5, 0, -20), v3(-1, 0, -30), v3(0.5, 0, -40), v3(0, 0, -46.5)], { bone, w: 1.9, h: 1.8, step: 1.1 }); nest.add(vent.g);
const CC = v3(0, 0, -60);
const chamber = makePodChamber({ R: 14, h: 16 }); chamber.g.position.copy(CC); nest.add(chamber.g);
const exitC = makeCorridor([v3(0, 0, -74), v3(2, 0, -84), v3(6, 0, -94), v3(7, 0, -102)], { bone, w: 2.6, h: 2.8 }); nest.add(exitC.g);
const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 4.2, 7), bone); pillar.position.set(-1.5, 2.1, -48.8); nest.add(tag(pillar, SET.METAL));
for (const [x, z] of [[4, -52], [-5, -55], [6, -64], [-4, -67]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.65, 5, 7), bone); p.position.set(x, 2.5, z); nest.add(tag(p, SET.METAL)); }
for (const u of [0.3, 0.7]) { const p = vent.curve.getPointAt(u), l = new THREE.PointLight(0xff4a50, 8, 9, 1.5); l.position.set(p.x, 1.5, p.z); nest.add(l); }
for (const u of [0.2, 0.6, 0.9]) { const p = exitC.curve.getPointAt(u), l = new THREE.PointLight(0xff4a50, 10, 11, 1.5); l.position.set(p.x, 2.4, p.z); nest.add(l); }
const chRed = new THREE.PointLight(0xff3040, 34, 40, 1.4); chRed.position.copy(CC).add(v3(0, 12, 0)); nest.add(chRed);
const hemi = new THREE.HemisphereLight(0x8a4a5a, 0x100810, 1.0); nest.add(hemi);
const faceFill = new THREE.PointLight(0xffc8b8, 0, 5, 1.2); world.add(faceFill);
const keyLight = new THREE.PointLight(0xffa040, 0, 6, 1.4); world.add(keyLight);
const eyeLight = new THREE.PointLight(0xff2a30, 0, 2.5, 1.5); world.add(eyeLight);

// ---- flashback: a ring past Jupiter ----
const SPC = v3(-8000, 0, 0);
const space = new THREE.Group(); space.position.copy(SPC); world.add(space);
const jup = makeGasGiant({ r: 340 }); jup.position.set(-420, -120, -1100); jup.rotation.z = 0.12; space.add(jup);
const sunL = new THREE.DirectionalLight(0xfff0e0, 2.4); sunL.position.set(600, 200, 400); space.add(sunL, new THREE.AmbientLight(0x404050, 0.6));
const capsule = makeCapsule(); space.add(capsule.g);
const gStone = new THREE.MeshStandardMaterial({ color: 0x4a4458, roughness: 0.6, metalness: 0.4, flatShading: true });
const gate = makeGate(26, gStone, [2.2, 0.35, 0.4]); gate.g.position.set(0, 0, -260); space.add(gate.g);
const gateLight = new THREE.PointLight(0xff3a40, 0, 400, 1.2); gateLight.position.set(0, 0, -240); space.add(gateLight);
const raiders = [...Array(7)].map((_, i) => { const r = makeHollowShip(0.9 + hash2(i, 1) * 0.4); space.add(r.g); return r; });

// ---- characters ----
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 8; hero.cyanMat.color.setRGB(0.12, 0.3, 0.35);
const mira = makeMira(); scene.add(mira.root);
const pixel = makeSkitterling(1); scene.add(pixel.g);
const scout = makeHollow('scout'); nest.add(scout.root); scout.setCloak(1, 0, 0);
const scanLight = new THREE.SpotLight(0xff2a30, 0, 10, 0.32, 0.5, 1); nest.add(scanLight, scanLight.target);
const scanCone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 16, 1, true), glow(1.2, 0.08, 0.12, { transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
nest.add(tag(scanCone, SET.ENERGY, true));
// the eye in her suit: iris ring + red veins around it (hidden until the end)
const scar = new THREE.Group(); scar.position.copy(mira.hollowEye.position); mira.torso.add(scar); scar.visible = false;
const vm = glow(1.6, 0.1, 0.15);
for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2 + 0.3, l = 0.05 + hash2(i, 2) * 0.05, c = new THREE.Mesh(new THREE.BoxGeometry(0.006, l, 0.004), vm); c.position.set(Math.cos(a) * (0.04 + l / 2), Math.sin(a) * (0.04 + l / 2), 0.004); c.rotation.z = a - PI / 2; scar.add(tag(c, SET.ENERGY)); }
const iris = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 20), glow(0.6, 0.04, 0.06)); scar.add(tag(iris, SET.METAL));
// keys: his three, her fourth
const keys = [0, 1, 2, 3].map(i => { const k = makeKey(i, 0.55); scene.add(k.g); k.g.visible = false; return k; });

// =====================================================================
// timeline
const FB0 = 20.8, FB1 = 33.6, VENT = 48.0, CH0 = 58.0, EXIT = 78.0, NIGHT = 89.0;
const M_SEAT = v3(1.7, 0, -0.4);       // Mira on the crate's corner
const D_STAND = v3(-0.2, 0, -2.4);
// Mira in the chamber
function miraChamber(t) {
  const a = v3(-0.4, 0, -47.2), b = v3(0.5, 0, -58.2), c = v3(0.2, 0, -73.6);
  if (t < 60.8) return { p: a, rotY: t < 59.6 ? lerpAng(PI, 0.6, Q(58.6, 59.4, t)) : lerpAng(0.6, PI, Q(60.2, 60.8, t)), walk: 0, k: 0 };
  if (t < 64.6) { const k = Q(60.8, 64.6, t); return { p: a.clone().lerp(b, k), rotY: faceTo(a, b), walk: Q(60.8, 61.2, t) * (1 - Q(64.2, 64.6, t)), k: k * 11 };  }
  if (t < 71.2) return { p: b, rotY: faceTo(a, b), walk: 0, k: 11 };
  const k = Q(71.2, 77.6, t); return { p: b.clone().lerp(c, k), rotY: faceTo(b, c), walk: Q(71.2, 71.6, t) * (1 - Q(77.2, 77.6, t)), k: 11 + k * 15.4 };
}
// the scout: in from the far side, stops in front of her, scans, leaves
function scoutState(t) {
  const s0 = v3(5, 0, -70), s1 = v3(1.0, 0, -59.6), s2 = v3(-9, 0, -64);
  if (t < 61) return { p: s0, rotY: faceTo(s0, s1), walk: 0, on: false };
  if (t < 65.4) { const k = Q(61, 65.4, t); return { p: s0.clone().lerp(s1, k), rotY: faceTo(s0, s1), walk: 1 - Q(65, 65.4, t), on: true, k }; }
  if (t < 70.4) return { p: s1, rotY: faceTo(s1, v3(0.5, 0, -58.2)), walk: 0, on: true, scan: Q(65.6, 66.2, t) * (1 - Q(69.8, 70.4, t)) };
  const k = Q(70.6, 77, t); return { p: s1.clone().lerp(s2, k), rotY: lerpAng(faceTo(s1, v3(0.5, 0, -58.2)), faceTo(s1, s2), Q(70.4, 71.2, t)), walk: Q(70.8, 71.2, t), on: t < 77.5, k };
}
function devState(t) {
  const S = { loc: 'H', x: 0, z: 0, y: 0, rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0.1, headYaw: 0, armRo: null, armLo: null, lean: 0, scene: 1 };
  S.scene = t < 9.4 ? 1 : t < FB0 ? 2 : t < FB1 ? 3 : t < VENT ? 4 : t < CH0 ? 5 : t < EXIT ? 6 : t < NIGHT ? 7 : 8;
  if (t < 9.4) {
    // walking slowly along the tally wall, headlamp on the marks
    const k = Q(0.2, 6.4, t); S.x = lerp(-2.6, 1.0, k); S.z = -4.2 + 0.25 * Math.sin(k * 2); S.rotY = PI + 0.15; S.walk = 0.6 * Q(0.2, 0.6, t) * (1 - Q(6.0, 6.4, t)); S.phase = k * 3.6 / 0.45 * PI; S.lookUp = 0.15; S.headYaw = -0.25 + 0.4 * k;
    if (t > 6.4) { const kk = Q(6.6, 9.2, t); S.x = lerp(1.0, D_STAND.x, kk); S.z = lerp(-4.2, D_STAND.z, kk); S.rotY = lerpAng(PI + 0.15, faceTo(P2(S.x, S.z), M_SEAT), Q(6.6, 7.4, t)); S.walk = 0.7 * Q(6.6, 7.0, t) * (1 - Q(8.8, 9.2, t)); S.phase = kk * 2.4 / 0.45 * PI; S.headYaw = 0; }
    return S;
  }
  if (t < FB0 || (t >= FB1 && t < VENT)) {
    S.x = D_STAND.x; S.z = D_STAND.z; S.rotY = faceTo(P2(S.x, S.z), M_SEAT); S.lookUp = -0.15;
    if (t > 43.4) { const r = Q(43.4, 44.2, t); S.armRo = { x: -1.1, z: 0.1, ex: -0.4, w: r }; S.x = lerp(D_STAND.x, D_STAND.x + 0.5, r); S.z = lerp(D_STAND.z, D_STAND.z + 0.7, r); }
    return S;
  }
  if (t < FB1) { S.loc = 'S'; return S; }
  if (t < CH0) {
    S.loc = 'V'; const u = 0.52 + 0.46 * Q(VENT + 0.2, CH0 - 0.4, t), p = vent.curve.getPointAt(Math.min(1, u - 0.05)), q = vent.curve.getPointAt(Math.min(1, u - 0.04));
    S.x = p.x; S.z = p.z; S.rotY = faceTo(P2(p.x, p.z), P2(q.x, q.z)); S.crouch = 0.55; S.walk = 0.8 * Q(VENT + 0.2, VENT + 0.6, t) * (1 - Q(CH0 - 0.8, CH0 - 0.4, t)); S.phase = u * vent.L / 0.42 * PI; S.lean = 0.25; S.lookUp = 0.25;
    return S;
  }
  if (t < EXIT) {
    S.loc = 'V';
    if (t < 74.8) { S.x = -2.05; S.z = -47.9; S.rotY = lerpAng(PI - 0.3, PI + 0.5, Q(60.6, 61.6, t)); S.crouch = 0.6 * Q(61.0, 62.0, t); S.lookUp = 0.1; S.headYaw = 0.25 * Math.sin(t * 0.8) * Q(62, 63, t);
      if (t < 61.0) { S.x = -1.0; S.z = -46.8; S.crouch = 0.45; S.rotY = PI - 0.3; }
      else { const kk = Q(61.0, 61.8, t); S.x = lerp(-1.0, -2.05, kk); S.z = lerp(-46.8, -47.9, kk); }
      return S; }
    const a = v3(-2.05, 0, -47.9), b = v3(-0.6, 0, -72.8), k = Q(74.8, 77.9, t), p = a.clone().lerp(b, k);
    S.x = p.x; S.z = p.z; S.rotY = faceTo(a, b); S.run = Q(74.8, 75.2, t) * (1 - Q(77.5, 77.9, t)); S.walk = S.run; S.crouch = 0.35; S.lean = 0.3; S.phase = k * 25 / 0.8 * PI;
    return S;
  }
  if (t < NIGHT) {
    S.loc = 'V'; const u = 0.08 + 0.42 * Q(EXIT, NIGHT, t), p = exitC.curve.getPointAt(u - 0.04), q = exitC.curve.getPointAt(u - 0.03);
    S.x = p.x; S.z = p.z; S.rotY = faceTo(P2(p.x, p.z), P2(q.x, q.z)); S.walk = 0.6 * Q(EXIT, EXIT + 0.4, t) * (1 - Q(83.4, 84, t)) + 0.6 * Q(87.6, 88, t); S.phase = u * exitC.L / 0.45 * PI;
    if (t > 79.6 && t < 87.6) S.headYaw = 0.25;
    return S;
  }
  // night: sitting against a rib, asleep
  S.loc = 'V'; const p = exitC.curve.getPointAt(0.62), q = exitC.curve.getPointAt(0.63), tg = q.clone().sub(p).normalize();
  S.x = p.x + tg.z * 0.9; S.z = p.z - tg.x * 0.9; S.rotY = faceTo(P2(p.x, p.z), P2(q.x, q.z)) - PI / 2 - 0.4; S.crouch = 1; S.lookUp = -0.55; S.lean = -0.1;
  return S;
}
function miraState(t) {
  const S = { loc: 'H', p: M_SEAT.clone(), rotY: 0, walk: 0, phase: 0, crouch: 0.55, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0 };
  const d = devState(t);
  if (t < FB0 || (t >= FB1 && t < VENT)) {
    S.rotY = faceTo(M_SEAT, P2(d.x, d.z)); S.headYaw = 0.1 * Math.sin(t * 0.6);
    if (t < 9.4) { S.rotY = faceTo(M_SEAT, P2(d.x, d.z)); S.lookUp = -0.1; }
    if (t > 13.6 && t < 17.6) S.headYaw = -0.6 * Q(13.8, 14.6, t);              // looks at the hatch
    if (t > 34) { const h = Q(34.4, 35.2, t); S.armRo = { x: -1.25, z: -0.15, ex: -0.5, w: h }; S.lookUp = -0.25 * h; }
    return S;
  }
  if (t < FB1) { S.loc = 'S'; return S; }
  S.crouch = 0;
  if (t < CH0) { const u = 0.52 + 0.46 * Q(VENT + 0.2, CH0 - 0.4, t), p = vent.curve.getPointAt(Math.min(1, u)), q = vent.curve.getPointAt(Math.min(1, u + 0.01));
    S.loc = 'V'; S.p = v3(p.x, 0, p.z); S.rotY = faceTo(P2(p.x, p.z), P2(q.x, q.z)); S.crouch = 0.55; S.walk = 0.8 * Q(VENT + 0.2, VENT + 0.6, t) * (1 - Q(CH0 - 0.8, CH0 - 0.4, t)); S.phase = u * vent.L / 0.42 * PI; S.lean = 0.25;
    if (t > 52.6 && t < 56.8) S.headYaw = 0.9 * Q(52.8, 53.4, t) * (1 - Q(56.2, 56.8, t));
    return S; }
  if (t < EXIT) { const m = miraChamber(t); S.loc = 'V'; S.p = m.p; S.rotY = m.rotY; S.walk = m.walk; S.phase = m.k / 0.45 * PI; S.lookUp = t > 65.6 && t < 70.4 ? -0.05 : 0; return S; }
  if (t < NIGHT) { const u = 0.08 + 0.42 * Q(EXIT, NIGHT, t), p = exitC.curve.getPointAt(u), q = exitC.curve.getPointAt(u + 0.01);
    S.loc = 'V'; S.p = v3(p.x, 0, p.z); S.rotY = faceTo(P2(p.x, p.z), P2(q.x, q.z)); S.walk = 0.6 * Q(EXIT, EXIT + 0.4, t) * (1 - Q(83.4, 84, t)) + 0.6 * Q(87.6, 88, t); S.phase = u * exitC.L / 0.45 * PI;
    if (t > 84) S.headYaw = -0.5 * Q(84.2, 85, t) + 0.9 * Q(86.4, 87.2, t);       // half-turns to answer, then away
    return S; }
  // night: sitting apart, facing down the tunnel
  const p = exitC.curve.getPointAt(0.7), q = exitC.curve.getPointAt(0.71); S.loc = 'V'; S.p = v3(p.x, 0, p.z); S.rotY = faceTo(P2(p.x, p.z), P2(q.x, q.z)); S.crouch = 0.95; S.lookUp = -0.35 + 0.25 * Q(93, 94.5, t);
  return S;
}
const FOOT = footsteps(devState, EP.duration);
window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false, run: f.run })), chimes: [{ t: 39.0, note: 4 }, { t: 44.4, note: 0 }, { t: 44.7, note: 2 }, { t: 45.0, note: 4 }, { t: 45.3, note: 7 }] };

const look = new THREE.Vector3();
const hud = makeHud(EP, { visor: [] });
const wp = o => o.getWorldPosition(new THREE.Vector3());

function update(t) {
  const S = devState(t), M = miraState(t), loc = S.loc;
  const inSpace = loc === 'S';
  nest.visible = !inSpace; space.visible = inSpace;
  hide.g.visible = loc === 'H'; vent.g.visible = chamber.g.visible = exitC.g.visible = loc === 'V';
  if (inSpace) { scene.fog.near = 1e5; scene.fog.far = 2e5; } else { scene.fog.color.set(0x1a0c10); scene.fog.near = loc === 'H' ? 6 : 4; scene.fog.far = loc === 'H' ? 30 : 40; }
  // Dev
  poseHero(hero, S, t);
  hero.root.visible = !inSpace;
  hero.root.position.set(HO.x + S.x, S.y, HO.z + S.z); hero.root.rotation.set(0, S.rotY, 0); hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = wp(hero.head), fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  hero.headLight.intensity = t > NIGHT ? 0 : (t > 58.6 && t < 78) ? 0 : 8;       // lamp off in the nest
  // Mira
  poseHero(mira, { walk: M.walk, phase: M.phase, crouch: M.crouch, lookUp: M.lookUp, headYaw: M.headYaw, armRo: M.armRo, armLo: M.armLo, lean: M.lean }, t);
  mira.root.visible = !inSpace;
  mira.root.position.set(HO.x + M.p.x, 0, HO.z + M.p.z); mira.root.rotation.set(0, M.rotY, 0); mira.root.updateMatrixWorld(true);
  const mh = wp(mira.head), mf = v3(Math.sin(M.rotY), 0, Math.cos(M.rotY));
  mira.headLight.intensity = loc === 'V' && t < NIGHT ? 5 : 0;
  faceFill.position.copy(mh).addScaledVector(mf, 1.0).add(v3(-mf.z * 0.8, 0.6, mf.x * 0.8)); faceFill.intensity = loc === 'H' ? 3 : (t > 79 || (t > VENT && t < CH0)) ? 3 : (t > CH0 && t < EXIT) ? 5 : 0; hemi.intensity = (t > CH0 && t < EXIT) ? 2.2 : 1.0;
  // the eye
  const eyeOpen = Q(92.0, 92.9, t) * (1 - 0.9 * pulse(t, 95.0, 9)) * (Math.sin(t * 1.3) > -0.97 ? 1 : 0.15);
  mira.hollowEye.visible = scar.visible = t > 91.4; mira.hollowEye.scale.set(1.3, 1.3 * Math.max(0.05, eyeOpen), 1.3); scar.scale.setScalar(0.4 + 0.6 * Q(91.6, 93.4, t));
  vm.color.setRGB(1.6, 0.1, 0.15).multiplyScalar(0.4 + 0.8 * eyeOpen * (0.7 + 0.3 * Math.sin(t * 3)));
  eyeLight.position.copy(wp(mira.hollowEye)).addScaledVector(mf, 0.25); eyeLight.intensity = t > 91.4 ? 1.0 * eyeOpen : 0;
  // Pixel: in Dev's pocket; hostile to Mira (red stripe)
  { pixel.g.visible = !inSpace; const pk = wp(hero.pocket); let p = pk.clone().add(v3(0, -0.02, 0)), sc = 0.42, curl = 0.7, lookA = Math.sin(t * 1.5) * 0.4;
    let rot = S.rotY;
    if (t > 17.6 && t < 20.8) { curl = 0; lookA = 0; rot = faceTo(P2(pk.x, pk.z), P2(mh.x, mh.z)); p.y += 0.06; }
    if (t > NIGHT) { p = a.clone().addScaledVector(fwd, 0.75).add(v3(0, 0.3, 0)); sc = 0.5; curl = 0.2; rot = faceTo(P2(p.x, p.z), P2(mh.x, mh.z)); lookA = 0; }
    pixel.g.position.copy(p); pixel.g.rotation.set(0, rot, 0); pixel.g.scale.setScalar(sc);
    poseSkitterling(pixel, { curl, eyeOpen: 1, look: lookA, t });
    const hostile = (t > 17.8 && t < 20.8) || t > 94.6; pixel.stripe.color.setRGB(...(hostile ? [1.8, 0.2, 0.3] : [0.3, 1.7, 1.9])).multiplyScalar(1 + 0.6 * Math.sin(t * 9) * (hostile ? 1 : 0)); }
  // keys
  const kOn = t > 36.8 && t < 48.2 && loc === 'H', palm = wp(mira.handR).add(v3(0, 0.1, 0));
  keys.forEach((k, i) => k.g.visible = kOn && (i === 3 || t > 43.8));
  if (kOn) {
    const rise = Q(37.0, 38.6, t), mid = palm.clone().lerp(wp(hero.handR), 0.5).add(v3(0, 0.35, 0)), al = Q(44.2, 45.2, t);
    keys[3].g.position.copy(palm).add(v3(0, 0.12 + 0.18 * rise + 0.03 * Math.sin(t * 2), 0)).lerp(mid, al);
    for (let i = 0; i < 3; i++) { const hp = wp(hero.handR).add(v3(0, 0.15, 0)), ang = t * 2.2 + i * 2.09, orb = hp.clone().add(v3(Math.cos(ang) * 0.22, 0.12 + 0.04 * i, Math.sin(ang) * 0.22)); keys[i].g.position.copy(orb).lerp(mid, al); }
    if (al > 0) keys.forEach((k, i) => { const ang = t * 1.4 + i * PI / 2, r = 0.32 * al; k.g.position.add(v3(Math.cos(ang) * r, Math.sin(ang) * r * 0.6, Math.sin(ang) * r * 0.4)); });
    keys.forEach((k, i) => { k.spin(t + i); k.crystal.material.color.setRGB(...KEY_COLORS[i]).multiplyScalar(1 + 1.5 * pulse(t, 45.2, 2)); });
    keyLight.position.copy(keys[3].g.position); keyLight.intensity = 6 * rise + 8 * pulse(t, 45.2, 1.5);
  } else keyLight.intensity = 0;
  hide.ember.material.color.setRGB(2.4, 0.2, 0.2).multiplyScalar(0.8 + 0.2 * Math.sin(t * 3)); hide.lamp.intensity = 9 + Math.sin(t * 3);
  // chamber: veins + scout
  const beat = 0.5 + 0.5 * Math.sin(t * 2.4);
  vent.vein.color.setRGB(1.8, 0.12, 0.18).multiplyScalar(0.5 + 0.5 * beat); chRed.intensity = 24 + 10 * beat;
  const sc = scoutState(t); scout.root.visible = sc.on && loc === 'V';
  if (scout.root.visible) {
    scout.root.position.set(sc.p.x, 0, sc.p.z); scout.root.rotation.set(0, sc.rotY, 0);
    poseHollow(scout, { crawl: 0.25, walk: sc.walk, phase: t * 4.5, t, rise: 1, lookUp: 0.15 * (sc.scan || 0), twitch: 0.5 + 0.5 * (sc.scan || 0), look: (sc.scan || 0) * 0.25 * Math.sin(t * 1.7) });
    scout.setCloak(1, 0, t); scout.root.updateMatrixWorld(true);
  }
  const scan = sc.scan || 0; scanLight.intensity = 30 * scan; scanCone.visible = scan > 0.02 && loc === 'V';
  if (scan > 0) { const ep = wp(scout.eye).sub(HO), sweep = Math.sin((t - 65.6) * 1.6), tgt = v3(0.5, 0.9 + 0.7 * (0.5 + 0.5 * sweep), -58.2);
    scanLight.position.copy(ep); scanLight.target.position.copy(tgt); scanCone.position.copy(ep.clone().lerp(tgt, 0.5)); scanCone.lookAt(tgt.clone().add(HO)); scanCone.rotateX(-PI / 2); scanCone.scale.set(1, ep.distanceTo(tgt) / 2.2, 1); }
  // flashback
  if (inSpace) {
    const k = Q(FB0, FB1, t);
    capsule.g.position.set(4, 2, lerp(80, -40, k) - 160 * Q(28.5, 33.4, t) ** 2); capsule.g.rotation.set(0.05 * Math.sin(t), PI + 0.08 * Math.sin(t * 0.7), 0.15 * Q(27, 30, t) * Math.sin(t * 5));
    capsule.set(t, t < 26 ? 0.6 : 0);
    const open = Q(25.8, 28.4, t); gate.set(t, open); gateLight.intensity = 4 * open;
    raiders.forEach((r, i) => { const go = Q(29.6 + i * 0.25, 33.4, t), lat = (hash2(i, 3) - 0.5) * 60, up = (hash2(i, 4) - 0.5) * 36;
      r.g.visible = go > 0.001; r.g.position.set(lat * (1 - go * 0.6), up * (1 - go * 0.6), -262 + go * 300); r.g.rotation.set(0, 0, t * 0.3 + i); r.core.material.color.setRGB(2.4, 0.15, 0.2); });
  }
  // ---- cameras ----
  let pos = v3(0, 0, 0), fov = 56; const H0 = HO;
  switch (S.scene) {
    case 1: if (t < 5.0) { const k = Q(0, 5, t); pos = a.clone().add(v3(0.9 - 0.4 * k, 1.75, 0.9 + 0.3 * k)); look.copy(H0).add(v3(a.x - H0.x - 0.6 + 0.8 * k, 1.4, -5.4)); fov = 44; }
      else { const k = Q(5, 9.4, t); pos = H0.clone().add(v3(-1.6 - 0.8 * k, 1.5 + 0.2 * k, 2.4 + 1.2 * k)); look.copy(H0).add(v3(0.9, 1.0, -2.6)); fov = 66; }
      break;
    case 2: if (t < 13.6) { pos = mh.clone().addScaledVector(mf, 1.1).add(v3(mf.z * 0.35, 0.05, -mf.x * 0.35)); look.copy(mh).add(v3(0, -0.06, 0)); fov = 40; }
      else if (t < 17.6) { const hp = wp(hide.hatch), n = v3(Math.sin(-0.75), 0, Math.cos(-0.75)), k = Q(13.6, 17.6, t); pos = hp.clone().addScaledVector(n, 3.4 - 0.7 * k).add(v3(0.1, 0.35, 0)).addScaledVector(v3(0.73, 0, 0.68), 0.9); look.copy(hp); fov = 40; }
      else { const pk = wp(pixel.g), dm = mh.clone().sub(pk).setY(0).normalize(); pos = pk.clone().addScaledVector(dm, 0.55).add(v3(-dm.z * 0.35, 0.06, dm.x * 0.35)); look.copy(pk).add(v3(0, 0.03, 0)); fov = 46; }
      break;
    case 3: { const cp = capsule.g.position.clone().add(SPC);
      if (t < 25.8) { pos = cp.clone().add(v3(-9, 4, 18)); look.copy(cp).add(v3(-30, -10, -60)); fov = 56; }
      else if (t < 29.6) { pos = SPC.clone().add(v3(34, 16, -330)); look.copy(SPC).add(v3(0, 0, -260)).lerp(cp, 0.25); fov = 62; }
      else { pos = cp.clone().add(v3(5, 3, 14)); look.copy(SPC).add(v3(0, 0, -250)); fov = 60; }
      break; }
    case 4: if (t < 38.4) { const dd = a.clone().sub(mira.root.position).setY(0).normalize(), pp = v3(-dd.z, 0, dd.x); pos = head.clone().addScaledVector(dd, 1.2).addScaledVector(pp, -0.8).add(v3(0, 0.0, 0)); look.copy(mh).add(v3(0, -0.35, 0)); fov = 40; }
      else if (t < 43.4) { const kp = keys[3].g.position, k = Q(38.4, 43.4, t); pos = kp.clone().add(v3(0, 0.12, 0)).addScaledVector(mf, 1.5 - 0.3 * k).add(v3(mf.z * 0.4, 0, -mf.x * 0.4)); look.copy(kp).lerp(mh, 0.25); fov = 42; }
      else { const mid = mh.clone().lerp(head, 0.5), dd = head.clone().sub(mh).setY(0).normalize(), pp = v3(-dd.z, 0, dd.x), k = Q(43.4, 48, t); pos = mid.clone().addScaledVector(pp, 2.2 + 0.6 * k).add(v3(0, -0.1 + 0.2 * k, 0)); look.copy(mid).add(v3(0, -0.2, 0)); fov = 50; }
      break;
    case 5: if (t < 52.8) { pos = head.clone().addScaledVector(fwd, -1.1).add(v3(0, 0.15, 0)).addScaledVector(right, 0.25); look.copy(mh).addScaledVector(mf, 1.5); fov = 60; }
      else { pos = mh.clone().addScaledVector(mf, 1.6).add(v3(0, 0.05, 0)); look.copy(mh).lerp(head, 0.5).add(v3(0, -0.1, 0)); fov = 50; }
      break;
    case 6: { const sp = scout.root.position.clone().add(HO), mp = mira.root.position;
      if (t < 62.2) { pos = H0.clone().add(v3(1.2, 1.4, -51.2)); look.copy(mh).lerp(head, 0.5).add(v3(0, -0.2, 0)); fov = 50; }
      else if (t < 65.6) { pos = head.clone().add(v3(1.25, 0.05, 0.5)); look.copy(mp).add(v3(0, 1.0, 0)).lerp(sp.clone().add(v3(0, 1.4, 0)), 0.35 * Q(62.2, 65.4, t)); fov = 48; }
      else if (t < 70.6) { const dd = sp.clone().sub(mp).setY(0).normalize(), pp = v3(-dd.z, 0, dd.x), mid = sp.clone().lerp(mp, 0.5), k = Q(65.6, 70.6, t); pos = mid.clone().addScaledVector(pp, 5.2 - 1.0 * k).add(v3(0, 1.3, 0)); look.copy(mid).add(v3(0, 1.15, 0)); fov = 46; }
      else if (t < 72.8) { pos = head.clone().addScaledVector(fwd, 0.85).addScaledVector(right, 0.15).add(v3(0, 0.0, 0)); look.copy(head).add(v3(0, -0.05, 0)); fov = 40; }
      else if (t < 75.2) { pos = H0.clone().add(CC).add(v3(-6, 5.5, 3)); look.copy(mp).lerp(sp, 0.4).add(v3(0, 0.8, 0)); fov = 58; }
      else { pos = a.clone().addScaledVector(fwd, -2.6).addScaledVector(right, 0.8).add(v3(0, 1.2, 0)); look.copy(a).addScaledVector(fwd, 4).add(v3(0, 0.9, 0)); fov = 62; }
      break; }
    case 7: if (t < 79.8) { pos = mh.clone().addScaledVector(mf, 2.8).add(v3(0.3, 0.2, 0)); look.copy(mh).lerp(head, 0.5).add(v3(0, -0.25, 0)); fov = 54; }
      else if (t < 84.2) { pos = head.clone().addScaledVector(fwd, 1.0).addScaledVector(right, -0.3).add(v3(0, 0.0, 0)); look.copy(head).add(v3(0, -0.05, 0)); fov = 42; }
      else { pos = mh.clone().addScaledVector(mf, 1.0).add(v3(-mf.z * 0.25, 0.0, mf.x * 0.25)); look.copy(mh).add(v3(0, -0.05, 0)); fov = 42; }
      break;
    default: { const eyeW = wp(mira.hollowEye);
      if (t < 91.2) { pos = mira.root.position.clone().addScaledVector(mf, 2.4).add(v3(-mf.z * 0.6, 1.1, mf.x * 0.6)); look.copy(a).lerp(mira.root.position, 0.55).add(v3(0, 0.5, 0)); fov = 56; }
      else if (t < 95.4) { const k = Q(91.2, 95.2, t); pos = eyeW.clone().addScaledVector(mf, 1.6 - 0.85 * k).add(v3(-mf.z * 0.2, 0.25 - 0.15 * k, mf.x * 0.2)); look.copy(eyeW).lerp(mh, 0.45 * (1 - k)); fov = 44; }
      else if (t < 97.6) { const pk = wp(pixel.g), dm = mh.clone().sub(pk).setY(0).normalize(); pos = pk.clone().addScaledVector(dm, 0.5).add(v3(-dm.z * 0.3, 0.08, dm.x * 0.3)); look.copy(pk).add(v3(0, 0.03, 0)); fov = 44; }
      else { pos = eyeW.clone().addScaledVector(mf, 0.42).add(v3(0, 0.06, 0)); look.copy(eyeW); fov = 44; }
    }
  }
  aim(camera, pos, look, null, fov);
  const flashMemory = inSpace ? 0.05 : 0;
  postFx(engine, EP, t, { exposure: inSpace ? 2.2 : loc === 'H' ? 2.8 : (t > CH0 && t < EXIT) ? 3.6 : 3.0, glitch: flashMemory, flashes: [[FB0, 0.5, 4], [FB1, 0.5, 4], [45.2, 0.25, 3], [92.2, 0.2, 5]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { hero, devState, mira, scout } });
