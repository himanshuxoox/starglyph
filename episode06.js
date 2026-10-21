// Episode 6 — "The Drowned Moon". A gate on a floating platform in an endless night ocean; the dive; fish,
// a kelp forest that parts for him, a drowned Vaelor city, a mural of the guardian... and the guardian.
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, P2, d2, faceTo, lerpAng, ease, canvasTex,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makeGrass, makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeNightSky } from './engine/sky.js';
import { glyphMaterial, makePillar, makeGate, makeKey, makeVaelorStatue } from './engine/props.js';
import { makeOcean, waveHeight, causticMaterial, makeFishSchool, makeLeviathan, makeLightShafts } from './engine/ocean.js';

const EP = await loadEpisode('06');
const { engine, scene, camera, world } = makeStage({ fog: [0x1a2a5a, 80, 900] });

// =====================================================================
// SURFACE
// =====================================================================
const PLAT = P2(0, 0), BED = -58;
const sky = makeNightSky({ planetDir: [-0.3, 0.3, -1], spires: { heightFn: () => -8, center: [0, 0], rMin: 320, rMax: 900, count: 40, hMin: 40, hMax: 160 } });
world.add(sky.group);
const ocean = makeOcean({ size: 1200, seg: 200, color: 0x0a2246 }); world.add(ocean.mesh);
const stone = new THREE.MeshStandardMaterial({ color: 0x4a4866, roughness: 0.75, metalness: 0.15, flatShading: true });
const gmat = glyphMaterial({ color: 0x34324e, glow: 0x55e6ff, seed: 3, repeat: [3, 1] });
const platform = new THREE.Group(); world.add(platform);
platform.add(tag(new THREE.Mesh(new THREE.CylinderGeometry(6, 5.2, 1.6, 24), stone), SET.METAL));
const rim = new THREE.Mesh(new THREE.CylinderGeometry(6.05, 6.05, 0.4, 24, 1, true), gmat); rim.position.y = 0.6; platform.add(tag(rim, SET.METAL));
const gate = makeGate(3.0, stone); gate.g.position.set(0, 0.8 + 3.2, -3.0); platform.add(gate.g);
const moonL = new THREE.DirectionalLight(0xb4c2ff, 2.4); moonL.position.set(-200, 260, -500);
const hemi = new THREE.HemisphereLight(0x5a6aff, 0x0a0a20, 0.9);
world.add(moonL, hemi);

// =====================================================================
// UNDERWATER
// =====================================================================
const CITY = P2(4, -46), PLAZA = P2(4, -40);
function Hb(x, z) {
  return BED + (fbm(x * 0.04 + 2, z * 0.04) - 0.5) * 4 + (fbm(x * 0.01, z * 0.01 + 7) - 0.5) * 14 - 1.5 * Math.exp(-((d2(P2(x, z), PLAZA) / 10) ** 2));
}
const under = new THREE.Group(); world.add(under);
const cU = { uTime: { value: 0 }, uCaustic: { value: 1 } };
const bedGeoMesh = makeTerrain({ H: Hb, size: 500, seg: 200, col: (x, z, c) => c.setRGB(0.09, 0.16, 0.22).lerp(new THREE.Color(0.18, 0.12, 0.26), smooth(0.35, 0.7, fbm(x * 0.05, z * 0.05 + 4))), set: SET.ROCK });
bedGeoMesh.material = causticMaterial(cU); under.add(bedGeoMesh);
const kelp = makeGrass({ area: [-30, 36, -80, 12], density: 0.9, heightFn: Hb, colA: 0x0f6a6a, colB: 0x3a2a8a, tall: 5.0, tipFrac: 0.5, width: 0.4,
  mask: (x, z) => d2(P2(x, z), PLAZA) > 13 && !(Math.abs(x - 2) < 2.5 && z > -30 && z < 6) });
kelp.mesh.userData.noId = false; under.add(kelp.mesh);
// the drowned city: ring of arches + pillars + domes around a plaza with the mural wall
for (let i = 0; i < 10; i++) {
  const a = i / 10 * PI * 2, r = 12 + (i % 2) * 2, x = PLAZA.x + Math.sin(a) * r, z = PLAZA.z + Math.cos(a) * r;
  if (Math.abs(a - 0) < 0.3) continue;                                          // gap where he walks in
  const p = makePillar(10 + (i % 3) * 3, 0.8, stone, gmat); p.g.position.set(x, Hb(x, z) - 0.5, z); p.g.rotation.z = (hash2(i, 3) - 0.5) * 0.25; under.add(p.g);
}
for (let i = 0; i < 7; i++) {
  const a = i / 7 * PI * 2 + 0.4, r = 26 + hash2(i, 9) * 14, x = PLAZA.x + Math.sin(a) * r, z = PLAZA.z + Math.cos(a) * r;
  const d = new THREE.Mesh(new THREE.SphereGeometry(5 + hash2(i, 10) * 6, 16, 8, 0, PI * 2, 0, PI / 2), stone); d.position.set(x, Hb(x, z) - 1, z); d.castShadow = true; under.add(tag(d, SET.METAL));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.12, 4, 24), glow(0.3, 1.2, 1.6)); ring.position.set(x, Hb(x, z) + 3 + hash2(i, 11) * 3, z); ring.rotation.x = PI / 2; under.add(tag(ring, SET.ENERGY));
}
for (let i = 0; i < 2; i++) { const s = makeVaelorStatue(11, stone); const x = PLAZA.x + (i ? 6 : -6), z = PLAZA.z - 7; s.position.set(x, Hb(x, z) - 0.3, z); s.rotation.y = i ? -0.4 : 0.4; under.add(s); }
// mural: the guardian serpent with a key on its brow
const muralTex = canvasTex(512, 512, (g, W, Hh) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#fff'; g.lineWidth = 16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(40, 400); g.bezierCurveTo(150, 250, 250, 480, 330, 320); g.bezierCurveTo(390, 200, 300, 120, 400, 110); g.stroke();
  g.lineWidth = 6; for (let k = 0; k < 14; k++) { const x = 60 + k * 24, y = 390 - Math.sin(k * 0.6) * 80; g.beginPath(); g.arc(x, y, 6, 0, PI * 2); g.stroke(); }
  g.beginPath(); g.ellipse(410, 105, 46, 30, 0, 0, PI * 2); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(410, 40); g.lineTo(430, 70); g.lineTo(410, 90); g.lineTo(390, 70); g.closePath(); g.fill();   // the key
  g.beginPath(); g.arc(430, 105, 9, 0, PI * 2); g.fill();
  g.lineWidth = 4; for (let k = 0; k < 12; k++) { g.beginPath(); g.moveTo(30 + k * 40, 470); g.lineTo(50 + k * 40, 500); g.stroke(); }
});
const muralMat = new THREE.MeshStandardMaterial({ color: 0x2a2a44, roughness: 0.7, emissive: 0x55e6ff, emissiveMap: muralTex, emissiveIntensity: 0.15 });
const mural = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 0.8), muralMat); mural.position.set(PLAZA.x, Hb(PLAZA.x, PLAZA.z - 9) + 4.2, PLAZA.z - 9); under.add(tag(mural, SET.METAL));
const fish = makeFishSchool(320); under.add(fish.im);
const fish2 = makeFishSchool(220, [1.2, 0.6, 1.6]); under.add(fish2.im);
const shafts = makeLightShafts(12, 50, [0.3, 0.6, 0.85]); under.add(shafts);
const snow = makePool(500, new THREE.IcosahedronGeometry(1, 0), glow(0.5, 0.9, 1.1), SET.ENERGY); under.add(snow.mesh);
const bubbles = makePool(160, new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xcfefff, roughness: 0.1, metalness: 0.5, emissive: 0x4a8aaa, emissiveIntensity: 0.5 }), SET.SUIT); under.add(bubbles.mesh);
const uHemi = new THREE.HemisphereLight(0x4a9ac8, 0x0a1020, 1.1); under.add(uHemi);
const muralLight = new THREE.PointLight(0x66e8ff, 0, 20, 1.4); under.add(muralLight);
// the guardian
const lev = makeLeviathan({ segs: 72, spacing: 3.4, radius: 4.4 }); under.add(lev.g);
const key = makeKey(1, 4.0); lev.socket.add(key.g);
const keyLight = new THREE.PointLight(0x7aa8ff, 0, 30, 1.2); lev.socket.add(keyLight); keyLight.position.set(0, 2, 2);
const ROUTE = new THREE.CatmullRomCurve3([
  v3(-60, BED + 18, -38), v3(-20, BED + 16, -42), v3(4, BED + 15, -44), v3(40, BED + 14, -48), v3(55, BED + 10, -20), v3(30, BED + 7, 0),
  v3(-8, BED + 6, -10), v3(-22, BED + 6, -36), v3(-6, BED + 6, -56), v3(22, BED + 4, -60), v3(13.5, BED + 2.5, -50)]);
const RL = ROUTE.getLength();
const LEV_T0 = 60.5, LEV_T1 = 93;                                              // head glides to a stop in front of him at t=93
const levHeadS = t => { const x = clamp01((t - LEV_T0) / (LEV_T1 - LEV_T0)); return RL * (1 - Math.pow(1 - x, 1.7)); };
const levPath = (s, t) => { const u = levHeadS(t) - s; return u >= 0 ? ROUTE.getPointAt(Math.min(1, u / RL)) : ROUTE.getPointAt(0).add(v3(-(-u), 0, 0)); };

// =====================================================================
// HERO + PIXEL
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 12;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const DIVE = 17.6, LAND = 34.0;
const HIDE = P2(PLAZA.x + 2.6, PLAZA.z + 9.4);
function devState(t) {
  const S = { x: 0, z: 2.2, y: 0.8, rotY: PI, walk: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, lean: 0, scene: 1, air: 0, swim: 0 };
  if (t < 9) { const k = Q(1.2, 4.5, t); S.z = lerp(-1.6, 1.5, k); S.walk = Q(1.2, 1.5, t) * (1 - Q(4.2, 4.5, t)); S.phase = k * 3.1 / 0.52 * PI; S.rotY = 0; S.lookUp = 0.3 * Q(5, 7, t); S.headYaw = 0.4 * Math.sin(t * 0.5) * Q(5, 6, t); return S; }
  if (t < DIVE + 0.6) {
    S.scene = 2; S.rotY = 0; const k = Q(15.6, 17.4, t); S.z = lerp(1.5, 5.0, k); S.walk = Q(15.6, 15.8, t); S.phase = k * 3.5 / 0.45 * PI; S.run = S.walk;
    S.lookUp = -0.4 * Q(9.5, 11, t) * (1 - Q(14.8, 15.6, t));
    if (t > 17.4) { const j = Q(17.4, DIVE + 0.6, t); S.z = 5.0 + j * 2.5; S.y = 0.8 + Math.sin(j * PI) * 1.0 - j * 2.2; S.air = 1; S.crouch = 0.4; S.armRo = { x: -2.6, z: -0.2, ex: -0.1, w: 1 }; S.armLo = { x: -2.6, z: 0.2, ex: -0.1, w: 1 }; S.lean = 0.9 * j; }
    return S;
  }
  // underwater
  S.swim = 1;
  if (t < LAND) {
    S.scene = 3; const k = ease(Q(DIVE + 0.6, LAND, t)); S.x = lerp(0, 2, k); S.z = lerp(7.5, 6, k); S.y = lerp(-1.5, Hb(2, 6) + 0.05, k);
    S.rotY = PI * Q(18.5, 22, t); S.armRo = { x: -0.3, z: -1.0, ex: -0.3, w: 1 - Q(31, 34, t) }; S.armLo = { x: -0.3, z: 1.0, ex: -0.3, w: 1 - Q(31, 34, t) };
    S.lookUp = -0.5 * (1 - Q(28, 33, t)) + 0.2 * Math.sin(t * 0.4); S.walk = 0.25; S.phase = t * 1.6;
    return S;
  }
  const route = [P2(2, 6), P2(2.2, -26), P2(PLAZA.x - 0.5, PLAZA.z - 3.2)];
  if (t < 61) {
    S.scene = t < 48 ? 4 : 5;
    const k = Q(LAND + 0.8, 58.6, t), seg = k < 0.75 ? 0 : 1, kk = seg ? (k - 0.75) / 0.25 : k / 0.75;
    const a = route[seg], b = route[seg + 1]; S.x = lerp(a.x, b.x, kk); S.z = lerp(a.z, b.z, kk); S.rotY = faceTo(a, b);
    S.walk = Q(LAND + 0.8, LAND + 1.4, t) * (1 - Q(58.2, 58.6, t)); S.phase = k * 45 / 0.6 * PI;
    S.lookUp = 0.3 * Q(41, 43, t) * (1 - Q(47, 49, t)) + 0.45 * Q(50, 52, t);
    S.headYaw = 0.5 * Math.sin((t - 36) * 0.4) * Q(36, 37, t) * (1 - Q(49, 50, t));
    S.y = Hb(S.x, S.z) + 0.05; return S;
  }
  // the shadow: he backs to the pillar by the plaza entrance and freezes
  const p0 = route[2], k = Q(66, 69, t);
  S.scene = t < 76 ? 6 : t < 88 ? 7 : 8;
  S.x = lerp(p0.x, HIDE.x, k); S.z = lerp(p0.z, HIDE.z, k); S.y = Hb(S.x, S.z) + 0.05;
  S.rotY = lerpAng(faceTo(route[1], route[2]), PI * 0.1, Q(66, 67, t)); S.walk = Q(66, 66.4, t) * (1 - Q(68.6, 69, t)); S.phase = -k * 15;
  S.lookUp = 0.7 * Q(62, 64, t) * (1 - Q(75, 77, t)) + 0.35 * Q(79, 82, t);
  S.headYaw = 0.6 * Math.sin((t - 77) * 0.6) * Q(77, 78, t) * (1 - Q(87, 89, t));
  S.crouch = 0.3 * Q(69, 70, t) * (1 - Q(89, 90.5, t));
  if (t > 88) { S.rotY = lerpAng(PI * 0.1, faceTo(P2(S.x, S.z), P2(8, -30.5)), Q(89, 90.4, t)); S.lookUp = 0.1; }
  return S;
}
const FOOT = footsteps(devState, EP.duration).filter(f => f.t < DIVE + 0.2);

window.AUDIO_META = { foot: FOOT.map(f => ({ t: f.t, water: false, run: f.run })) };

// =====================================================================
const look = new THREE.Vector3();
const VISOR = [[10.2, 16.6, 'DEPTH LIMIT  600 m\nAIR  ▮▮▮▮▮▮▮▮▮▮  2:00:00\nKEY SIGNAL  ▼ 58 m'], [64.0, 75.0, 'SONAR CONTACT\nSIZE   ~400 m\nSPEED  12 kn  ▸ CLOSING']];
const hud = makeHud(EP, { visor: VISOR });
const DEEP = new THREE.Color(0x06223a);

function update(t) {
  const S = devState(t);
  const waterY = waveHeight(S.x, S.z, t);
  platform.position.set(PLAT.x, -0.7 + waveHeight(PLAT.x, PLAT.z, t) * 0.25, PLAT.z); platform.rotation.set(Math.sin(t * 0.6) * 0.015, 0, Math.cos(t * 0.5) * 0.015);
  poseHero(hero, S, t);
  hero.root.position.set(S.x, S.swim ? S.y : S.y + platform.position.y, S.z); hero.root.rotation.set(0, S.rotY, 0); hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = hero.head.getWorldPosition(new THREE.Vector3());
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  hero.headLight.intensity = S.swim ? (t > 77.6 && t < 98 ? 0 : 22) : 8;
  // platform bobs on the swell
  gate.set(t, (1 - Q(1.0, 2.6, t)));
  ocean.U.uTime.value = t; gmat.emissiveIntensity = 0.6 + 0.3 * Math.sin(t * 2);

  // ---- Pixel rides in the chest pocket under water ----
  {
    const sh = hero.shoulderL.getWorldPosition(new THREE.Vector3()), pk = hero.pocket.getWorldPosition(new THREE.Vector3());
    const inPocket = Q(15, 15.8, t) * (1 - Q(99, 100, t));
    pixel.g.position.copy(sh).lerp(pk.add(v3(0, 0.02, 0)), inPocket); pixel.g.rotation.set(0, S.rotY, 0); pixel.g.scale.setScalar(0.55 - 0.15 * inPocket);
    poseSkitterling(pixel, { curl: inPocket * (t > 88 ? 1 : 0.4), eyeOpen: (t % 3.9) < 0.12 ? 0.1 : 1, look: Math.sin(t * 0.9) * 0.5, t });
    pixel.stripe.color.setRGB(0.3, 1.7, 1.9).multiplyScalar(t > 77.6 && t < 98 ? 0.15 : 1);
  }

  // ---- under water ----
  const camUnder = camera.position.y < waveHeight(camera.position.x, camera.position.z, t) - 0.05;
  under.visible = t > DIVE - 1;
  cU.uTime.value = t;
  const shadow = Q(62, 66, t) * (1 - Q(74, 78, t));
  cU.uCaustic.value = 0.9 * (1 - 0.85 * shadow);
  for (const s of shafts.children) s.material.opacity = (0.08 + 0.05 * Math.sin(t + s.position.x)) * (1 - 0.9 * shadow);
  shafts.position.set(a.x, 0, a.z);
  fish.set(t, v3(2, -20 + Math.sin(t * 0.2) * 3, 5.5), head, Q(62.5, 65, t), Q(20, 23, t));
  fish2.set(t * 0.8, v3(PLAZA.x - 6, Hb(PLAZA.x, PLAZA.z) + 6, PLAZA.z + 4), head, Q(62, 64.5, t), 1);
  { const L = []; for (let i = 0; i < 500; i++) { const x = a.x + (hash2(i, 1) - 0.5) * 30, z = a.z + (hash2(i, 2) - 0.5) * 30, y = a.y + (((hash2(i, 3) * 20 - t * 0.3) % 20) + 20) % 20 - 6; L.push({ x: x + Math.sin(t * 0.3 + i) * 0.3, y, z, s: 0.015 + hash2(i, 4) * 0.02 }); } snow.set(S.swim ? L : []); }
  { const B = []; if (S.swim) for (let i = 0; i < 160; i++) { const ph = ((t * 0.7 + hash2(i, 1)) % 1); B.push({ x: head.x + Math.sin(i * 1.7 + t) * 0.12 * ph, y: head.y + 0.1 + ph * 2.5, z: head.z + 0.18 + Math.cos(i * 2.3) * 0.1 * ph, s: 0.012 + 0.02 * hash2(i, 2) }); } bubbles.set(B); }
  muralMat.emissiveIntensity = 0.15 + 1.6 * Q(49, 52, t) * (1 - Q(61, 63, t) * 0.7);
  muralLight.position.set(PLAZA.x, Hb(PLAZA.x, PLAZA.z) + 4, PLAZA.z - 7); muralLight.intensity = 20 * Q(49, 52, t);
  // kelp: parts round him, bends hard in the guardian's wake
  const gu = kelp.uniforms; gu.uTime.value = t * 0.6; gu.uGust.value = 0.6 + 2.2 * Q(62, 64, t) * (1 - Q(76, 82, t));
  gu.uPush.value[0].set(a.x, a.z, 2.2, S.swim ? 1.3 : 0); gu.uPush.value[1].set(a.x + fwd.x * 2, a.z + fwd.z * 2, 2.6, S.walk > 0.2 ? 1.3 : 0);
  const lh = levPath(0, t); gu.uPush.value[2].set(lh.x, lh.z, 9, t > LEV_T0 ? 1.4 : 0); const lb = levPath(60, t); gu.uPush.value[3].set(lb.x, lb.z, 9, t > LEV_T0 ? 1.4 : 0);
  // the guardian
  lev.g.visible = t > LEV_T0 - 0.5;
  if (lev.g.visible) lev.set(t, levPath, { glow: 0.6 + 0.6 * Q(76, 80, t), eyeOpen: Q(92.8, 93.6, t), mouth: 0.15 * Math.sin(t * 0.7), lookAt: head });
  key.spin(t); key.crystal.material.color.setRGB(0.5, 1.0, 2.4).multiplyScalar(1 + 0.6 * Math.sin(t * 3)); keyLight.intensity = 60 * Q(86, 92, t);
  uHemi.intensity = 1.1 * (1 - 0.6 * shadow) * (t > 77.6 ? 0.6 : 1);
  scene.fog.color.copy(camUnder ? DEEP : new THREE.Color(0x1a2a5a)); scene.fog.near = camUnder ? 2 : 80; scene.fog.far = camUnder ? 68 - 10 * shadow : 900;
  sky.group.visible = !camUnder; ocean.mesh.material.color.set(camUnder ? 0x3a7aa8 : 0x0a2246);

  // ---- cameras ----
  let pos, fov = 58;
  switch (S.scene) {
    case 1: if (t < 5.6) { pos = v3(6.5, 2.6 + waveHeight(6.5, 7, t) * 0.3, 8.5); look.set(0, 2.6, -1.5); fov = 60; }
      else { pos = a.clone().addScaledVector(fwd, -3.2).add(v3(0.9, 1.4, 0)); look.copy(a).addScaledVector(fwd, 20).add(v3(0, 4, 0)); fov = 64; }
      break;
    case 2: if (t < 15.4) { pos = head.clone().addScaledVector(fwd, 1.0).addScaledVector(right, 0.28).add(v3(0, 0.02, 0)); look.copy(head).add(v3(0, -0.05, 0)); fov = 40; }
      else { pos = v3(5.5, 1.4 + waveHeight(5.5, 9, t) * 0.4, 12.5); look.copy(a).add(v3(0, 0.6, 0)); fov = 60; }
      break;
    case 3: { const k = Q(DIVE + 0.6, LAND, t); pos = a.clone().add(v3(3.4 - 1.2 * k, -2.6 + 3.6 * k, 3.2)); look.copy(a).add(v3(0, 0.6, 0)); fov = 66; break; }
    case 4: if (t < 41.6) { pos = a.clone().addScaledVector(fwd, 3.4).addScaledVector(right, 0.8).add(v3(0, 1.0, 0)); look.copy(a).add(v3(0, 1.2, 0)); fov = 62; }
      else { pos = a.clone().addScaledVector(fwd, -4.2).addScaledVector(right, 1.0).add(v3(0, 2.4, 0)); look.copy(a).addScaledVector(fwd, 18).add(v3(0, 2.5, 0)); fov = 66; }
      break;
    case 5: { pos = a.clone().addScaledVector(fwd, -3.6).addScaledVector(right, 1.6).add(v3(0, 1.0, 0)); look.set(PLAZA.x, Hb(PLAZA.x, PLAZA.z) + 4.5, PLAZA.z - 8.6); fov = 62; break; }
    case 6: if (t < 68.4) { pos = a.clone().add(v3(-1.6, 0.5, 2.4)); look.copy(a).add(v3(0, 8, -4)); fov = 70; }                 // looking up: the moon goes dark
      else { pos = v3(HIDE.x + 6, Hb(HIDE.x, HIDE.z) + 1.4, HIDE.z + 4); look.copy(a).add(v3(0, 1.4, 0)); fov = 60; }
      break;
    case 7: { let lb = levPath(0, t), bd = 1e9; for (let s2 = 0; s2 < 240; s2 += 6) { const p = levPath(s2, t), d = p.distanceTo(a); if (d < bd) { bd = d; lb = p; } } pos = a.clone().addScaledVector(fwd, -2.0).addScaledVector(right, -1.4).add(v3(0, 1.3, 0)); look.copy(lb).lerp(a.clone().add(v3(0, 1.4, 0)), 0.35); fov = 66; break; }
    default: { const hp = lev.head.position, mid = hp.clone().lerp(a, 0.5), dd = hp.clone().sub(a).setY(0).normalize(), pp = v3(-dd.z, 0, dd.x);
      const kp = key.g.getWorldPosition(new THREE.Vector3()), k8 = ease(Q(88, 96, t));
      pos = head.clone().addScaledVector(dd, -3.4 + 0.3 * k8).addScaledVector(pp, -0.9).add(v3(0, 0.9, 0)); look.copy(hp).lerp(kp, 0.5 * k8).lerp(head, 0.3); fov = 64 - 6 * k8; }
  }
  aim(camera, pos, look, S.swim ? (x, z) => Hb(x, z) + 0.3 : null, fov);
  postFx(engine, EP, t, { exposure: camUnder ? 3.2 : 2.8, flashes: [[0.5, 0.8, 2.5], [18.0, 0.25, 6], [93.0, 0.15, 4]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { moonH: Hb, hero, devState, lev, levPath, RL }, clear: t => (camera.position.y < waveHeight(camera.position.x, camera.position.z, t) ? DEEP : null) });
