// Episode 3 — "The Hollow". Night on the ring-world: a cloaked scout, a chase, an army out of the ground,
// first gunfire, and ECHO taking over the suit. Deterministic: everything is a pure function of t.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { AsciiEngine, SET, tag, smooth, lerp, v3, fbm, hash2, captionAt, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makeGrass, makePool } from './engine/fx.js';
import { makeSkitterling, poseSkitterling, makeMothSwarm, makeCrystal } from './engine/creatures.js';
import { makeNightSky, makeArmada } from './engine/sky.js';
import { makeHollow, makeHollowArmy, poseHollow } from './engine/hollow.js';

const EP_ID = new URLSearchParams(location.search).get('ep') || '03';
const res = await fetch(`./episodes/ep${EP_ID}.json`);
if (!res.ok) throw new Error(`episodes/ep${EP_ID}.json not found (HTTP ${res.status}) - is the episodes/ folder committed?`);
const EP = await res.json();
await Promise.all([
  document.fonts.load('800 40px "JetBrains Mono"'), document.fonts.load('600 30px "JetBrains Mono"'),
  document.fonts.load('500 22px "Saira Condensed"'), document.fonts.load('700 50px "Saira Condensed"'),
]);

const engine = new AsciiEngine(document.getElementById('c'), { sceneScale: 0.75, idScale: 0.5 });
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x30297a, 70, 700);
const camera = new THREE.PerspectiveCamera(58, 720 / 1280, 0.05, 6000);
const Q = (a, b, x) => smooth(a, b, x);
const pulse = (t, t0, k = 3) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);
const glow = (r, g, b, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false, ...o });
const PI = Math.PI;
const P2 = (x, z) => ({ x, z });
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// =====================================================================
// LAYOUT (top view): lake in the middle, Dev starts on its south shore, runs west and round to the north,
// where the army rises. Hill to the south for the ending.
// =====================================================================
const C = P2(0, -16), LAKE_R = 11, WATER_Y = -0.42;
const A1 = 1.45 * PI;                                       // angle (around the lake) where the chase ends
const O = P2(Math.cos(A1), Math.sin(A1)), PERP = P2(-O.z, O.x);
const at = (r, a) => P2(C.x + r * Math.cos(a), C.z + r * Math.sin(a));
const D0 = P2(0.5, -4.2);
const SC0 = P2(2.7, -3.4);                                  // where the scout de-cloaks
const SP = at(18, A1);                                      // Dev's stop when the army rises
const RP = at(11.9, A1);                                    // cornered at the lake edge
const LP = P2(RP.x + O.x * 13, RP.z + O.z * 13);            // ECHO's landing / shockwave
const HOLD = P2(SP.x + O.x * 5, SP.z + O.z * 5);            // scout lands here and commands the army
const HP = P2(6, 18);                                       // hilltop for the ending
const SKULL = P2(LP.x + PERP.x * 3.2 + O.x * 5.5, LP.z + PERP.z * 3.2 + O.z * 5.5);

function H(x, z) {
  const base = (fbm(x * 0.05 + 7, z * 0.05) - 0.5) * 1.0;
  const dl = Math.hypot(x - C.x, z - C.z) / LAKE_R;
  const lake = dl < 1.5 ? -1.4 * (1 - smooth(0.7, 1.22, dl)) : 0;
  const dh = Math.hypot(x - HP.x, z - HP.z);
  const hill = 8.5 * Math.exp(-((dh / 10) ** 2)) + 1.5 * Math.exp(-((dh / 22) ** 2));
  const far = Math.hypot(x, (z + 20) * 0.8);
  const hills = (fbm(x * 0.008 + 3, z * 0.008) - 0.5) * 60 * smooth(75, 260, far);
  return base + lake + hill + hills;
}

const world = new THREE.Group(); scene.add(world);
const sky = makeNightSky({ planetDir: [-0.5, 0.36, -1], spires: { heightFn: H, center: [0, -20], rMin: 210, rMax: 720, count: 120, hMin: 40, hMax: 230 } });
world.add(sky.group);
const armada = makeArmada({ n: 240, dir: [-0.12, 0.42, -1], dist: 1700, spread: [2400, 700] }); world.add(armada.g);
{
  const geo = new THREE.PlaneGeometry(1600, 1600, 280, 280); geo.rotateX(-PI / 2);
  const p = geo.attributes.position, cols = [], a = new THREE.Color(0x0e2a44), b = new THREE.Color(0x24164e), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); p.setY(i, H(x, z));
    c.copy(a).lerp(b, smooth(0.35, 0.65, fbm(x * 0.03 + 9, z * 0.03))); cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  ground.receiveShadow = true; world.add(tag(ground, SET.GRASS));
  // boulders near the action
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a2850, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 46; i++) {
    const a = hash2(i, 11) * PI * 2, r = 14 + hash2(i, 12) * 40, x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r;
    if (d2(P2(x, z), SP) < 6 || d2(P2(x, z), RP) < 5 || d2(P2(x, z), LP) < 6 || d2(P2(x, z), HP) < 4) continue;
    const s = 0.3 + hash2(i, 13) ** 2 * 1.6, m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    m.position.set(x, H(x, z) + s * 0.3, z); m.rotation.set(hash2(i, 14) * 3, hash2(i, 15) * 3, 0); m.scale.y = 0.6; m.castShadow = true;
    world.add(tag(m, SET.ROCK));
  }
}
// lights: cold moonlight from the ring planet, violet back-rim, low ambient
const moon = new THREE.DirectionalLight(0xb4c2ff, 2.6); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 260 });
const rimL = new THREE.DirectionalLight(0xa070ff, 1.5);
const hemi = new THREE.HemisphereLight(0x5a66ff, 0x160c2a, 0.95);
world.add(moon, moon.target, rimL, rimL.target, hemi);
const redLight = new THREE.PointLight(0xff2030, 0, 26, 1.6); world.add(redLight);       // scout eye / beam
const muzzleLight = new THREE.PointLight(0x9ff6ff, 0, 18, 1.8); world.add(muzzleLight);
const blastLight = new THREE.PointLight(0x66f0ff, 0, 60, 1.4); world.add(blastLight);

// reactive grass (not in the lake)
const grass = makeGrass({ area: [-30, 30, -62, 26], density: 11.5, heightFn: H, colA: 0x167f96, colB: 0x5a2ec8, tall: 0.6, tipFrac: 0.14,
  mask: (x, z) => Math.hypot(x - C.x, z - C.z) > LAKE_R * 1.05 });
grass.mesh.userData.noId = true; world.add(grass.mesh);

// mirror lake with ripples (same water shader as Ep 2)
const waterShader = {
  name: 'RippleWater',
  uniforms: {
    color: { value: new THREE.Color(0xc4ccff) }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uTime: { value: 0 }, uRip: { value: [...Array(10)].map(() => new THREE.Vector4()) }, uRed: { value: 0 },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    void main(){ vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime; uniform vec4 uRip[10]; uniform float uRed;
    varying vec4 vUv; varying vec3 vW;
    void main(){
      float h = 0.0;
      for (int i = 0; i < 10; i++) { vec4 r = uRip[i]; if (r.w <= 0.0) continue; float age = uTime - r.z; if (age < 0.0) continue;
        float d = length(vW.xz - r.xy), front = age * 2.4;
        h += sin((d - front) * 5.0) * exp(-abs(d - front) * 1.0) * exp(-age * 0.5) * r.w; }
      h += sin(vW.x * 1.7 + uTime * 1.3) * 0.04 + sin(vW.z * 2.3 - uTime * 1.1) * 0.04;
      vec4 uv = vUv; uv.xy += vec2(h * 0.07, h * 0.05) * uv.w;
      vec3 c = texture2DProj(tDiffuse, uv).rgb * color + vec3(0.01, 0.012, 0.035);
      c += mix(vec3(0.25, 0.5, 0.9), vec3(1.2, 0.15, 0.2), uRed) * max(h, 0.0) * 0.45;
      gl_FragColor = vec4(c, 1.0);
    }`,
};
const lake = new Reflector(new THREE.CircleGeometry(LAKE_R * 1.1, 80), { clipBias: 0.003, textureWidth: 270, textureHeight: 480, shader: waterShader });
lake.rotation.x = -PI / 2; lake.position.set(C.x, WATER_Y, C.z); world.add(tag(lake, SET.SKY));
{ const orig = lake.onBeforeRender; lake.onBeforeRender = function (...a) { if (!engine.inIdPass) orig.apply(this, a); }; }

// =====================================================================
// HERO + PATH
// =====================================================================
const hero = makeHero(); scene.add(hero.root);
hero.headLight.intensity = 10;
const T_RUN0 = 22.4, T_RUN1 = 40.6;
const aStart = Math.atan2(D0.z - C.z, D0.x - C.x), rStart = d2(D0, C);
// run distance profile (accelerate, cruise, skid) -> normalised path parameter
const RUN_S = []; { let s = 0; for (let k = 0; k <= 2400; k++) { const t = T_RUN0 + (T_RUN1 - T_RUN0) * k / 2400; RUN_S.push(s); s += Q(T_RUN0, T_RUN0 + 0.9, t) * (1 - Q(T_RUN1 - 0.7, T_RUN1, t) * 0.85); } for (let k = 0; k <= 2400; k++) RUN_S[k] /= RUN_S[2400]; }
const runU = t => { const k = clamp01((t - T_RUN0) / (T_RUN1 - T_RUN0)) * 2400, i = Math.floor(k), f = k - i; return i >= 2400 ? 1 : RUN_S[i] + (RUN_S[i + 1] - RUN_S[i]) * f; };
const pathAt = u => {
  const ua = Math.min(1, u / 0.86), ea = ua < 0.85 ? ua / 0.85 * 0.9 : 0.9 + 0.1 * Math.sin((ua - 0.85) / 0.15 * PI / 2);   // ease into the final turn
  const a = lerp(aStart, A1, ea), r = lerp(rStart, 15, smooth(0, 0.2, u)) + 3 * smooth(0.74, 1.0, u);
  return at(r, a);
};
const faceTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const ROT_SC = faceTo(D0, SC0), ROT_OUT = Math.atan2(O.x, O.z);
const lerpAng = (a, b, k) => { let d = ((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return a + d * k; };
// gun: one shot list shared by visuals and audio
const SHOTS = []; for (const [a, b, dt] of [[57.25, 58.0, 0.11], [58.85, 59.7, 0.1], [60.9, 62.1, 0.1], [62.75, 64.35, 0.09]]) for (let t = a; t <= b + 1e-6; t += dt) SHOTS.push(+t.toFixed(3));

function devState(t) {
  const S = { x: D0.x, z: D0.z, y: 0, rotY: PI, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0, headYaw: 0, armRo: null, armLo: null, jet: 0, lean: 0, scene: 1, air: 0 };
  if (t < 8) { S.scene = 1; S.headYaw = -0.75 * Q(5.6, 7.0, t); }
  else if (t < 16) {
    S.scene = 2; S.rotY = lerpAng(PI, ROT_SC, Q(8.0, 9.4, t)); S.headYaw = -0.75 * (1 - Q(8.0, 9.0, t));
    S.lookUp = 0.55 * Q(10.5, 12.6, t); const back = Q(12.7, 13.6, t) * 0.35; S.x -= Math.sin(ROT_SC) * back; S.z -= Math.cos(ROT_SC) * back;
    S.walk = Q(12.7, 12.9, t) * (1 - Q(13.4, 13.7, t)) * 0.5; S.phase = -back * 6;
  } else if (t < T_RUN0) {
    S.scene = 3; S.rotY = ROT_SC; S.lookUp = 0.12; const back = 0.35; S.x -= Math.sin(ROT_SC) * back; S.z -= Math.cos(ROT_SC) * back;
  } else if (t < T_RUN1) {
    S.scene = 4; const u = runU(t), p = pathAt(u), q = pathAt(Math.min(1, u + 0.004));
    const back = 0.35 * (1 - Q(T_RUN0, T_RUN0 + 1, t)); S.x = p.x - Math.sin(ROT_SC) * back; S.z = p.z - Math.cos(ROT_SC) * back;
    S.rotY = lerpAng(ROT_SC, faceTo(p, q), Q(T_RUN0, T_RUN0 + 0.6, t));
    S.run = Q(T_RUN0, T_RUN0 + 0.6, t) * (1 - Q(T_RUN1 - 0.6, T_RUN1, t)); S.walk = Math.max(S.run, 0.3 * (1 - Q(T_RUN1 - 0.2, T_RUN1, t)));
    S.headYaw = 0.9 * Q(29.6, 30.2, t) * (1 - Q(31.0, 31.6, t)) + 0.6 * Q(38.6, 39.2, t);
    S.lookUp = 0.35 * Q(38.6, 39.4, t);
  } else if (t < 55) {
    S.scene = 5; S.rotY = ROT_OUT; S.x = SP.x; S.z = SP.z;
    S.lookUp = 0.35 * (1 - Q(40.6, 41.6, t)) + 0.15 * Q(44, 46, t); S.lean = 0.1 * (1 - Q(40.6, 41.5, t));
    const k = Q(49.6, 55.0, t); S.x = lerp(SP.x, RP.x, k); S.z = lerp(SP.z, RP.z, k);
    S.walk = Q(49.6, 50.0, t) * (1 - Q(54.4, 55.0, t)); S.phase = -k * 6.1 / 0.52 * PI;          // walking backwards
    S.headYaw = 0.35 * Math.sin(t * 0.9) * Q(46, 48, t);
  } else if (t < 65 || t < 67.6) {
    S.scene = t < 65 ? 6 : 7; S.x = RP.x; S.z = RP.z;
    const draw = Q(55.2, 55.9, t) * (1 - Q(55.9, 56.5, t)), aim = Q(55.9, 56.5, t) * (1 - Q(66.6, 67.4, t));
    const sh = SHOTS.find(s => t >= s && t < s + 0.06), kick = sh ? 1 - (t - sh) / 0.06 : 0;
    const sweep = 0.22 * Math.sin((t - 56.5) * 0.7) * Q(56.5, 58, t);
    S.rotY = ROT_OUT + sweep;
    S.armRo = draw > 0.01 ? { x: -2.7, z: -0.4, ex: -1.4, w: draw } : { x: -1.5 - 0.12 * kick, y: 0, z: 0.08, ex: -0.3, w: aim };
    S.armLo = { x: -1.3, z: -0.3, ex: -0.9, w: aim };
    S.lean = 0.05 * aim - 0.05 * kick; S.lookUp = -0.05 * aim;
    S.crouch = 0.12 * aim;
  } else if (t < 80) {
    S.scene = 7;
    const T0 = 68.0, T1 = 72.4, k = clamp01((t - T0) / (T1 - T0));
    S.rotY = ROT_OUT; S.jet = Q(67.6, 67.9, t) * (1 - Q(72.4, 72.7, t));
    if (t < T0) { S.x = RP.x; S.z = RP.z; S.crouch = 0.45 * Q(67.6, 68.0, t); }
    else if (t < T1) {
      const e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);                                  // ease so it hangs at the apex
      S.x = lerp(RP.x, LP.x, e); S.z = lerp(RP.z, LP.z, e); S.air = 9.5 * 4 * e * (1 - e);
      S.crouch = 0.55 * (1 - Q(0.15, 0.4, k)) + 0.35 * Q(0.75, 0.95, k); S.lean = 0.2;
      S.armRo = { x: 0.4, z: -0.5, ex: -0.3, w: 1 }; S.armLo = { x: 0.4, z: 0.5, ex: -0.3, w: 1 };
    } else {
      S.x = LP.x; S.z = LP.z;
      S.crouch = 1.0 * (1 - Q(74.2, 75.6, t));                                                    // three-point landing
      S.armRo = { x: -0.6, z: -0.1, ex: -0.2, w: 1 - Q(74.2, 75.4, t) }; S.lean = 0.25 * (1 - Q(74.2, 75.6, t));
      S.lookUp = -0.3 * (1 - Q(74.6, 75.8, t)) + 0.1 * Q(76, 78, t);
      S.headYaw = 0.5 * Math.sin((t - 76) * 0.8) * Q(76, 77, t);
    }
  } else {
    S.scene = t < 92 ? 8 : 9; S.x = HP.x; S.z = HP.z; S.rotY = PI + 0.12;
    const tired = 1 - Q(86.5, 89.0, t);
    S.crouch = 0.28 * tired; S.lean = 0.42 * tired + 0.05 * Math.sin(t * 5.2) * tired;
    S.armRo = { x: -0.55, z: -0.12, ex: -0.5, w: tired }; S.armLo = { x: -0.55, z: 0.12, ex: -0.5, w: tired };
    S.lookUp = -0.2 * tired + 0.12 * Q(89, 90.5, t) + 0.4 * Q(97.4, 99.4, t);
    S.headYaw = -0.55 * Q(84.6, 85.6, t) * (1 - Q(87.4, 88.4, t));
  }
  if (S.scene === 4) S.phase = runU(t) * 54 / 0.85 * PI;
  return S;
}
// footsteps for audio (and grass)
const FOOT = []; { let prev = null; for (let t = 0; t < EP.duration; t += 1 / 240) { const S = devState(t); if (S.walk < 0.35) { prev = null; continue; }
  const k = Math.floor(S.phase / PI); if (prev !== null && k !== prev) FOOT.push({ t: +t.toFixed(3), run: S.run > 0.5 }); prev = k; } }

// =====================================================================
// THE SCOUT
// =====================================================================
const scout = makeHollow('scout'); world.add(scout.root);
const lag = t => lerp(2.6, 1.3, Q(24, 37, t));
const SCOUT_LEAP0 = 37.4, SCOUT_LEAP1 = 40.2;
function scoutPathPos(t) { return pathAt(runU(t - lag(t))); }
function scoutState(t) {
  const S = { x: SC0.x, z: SC0.z, y: 0, rotY: ROT_SC + PI, crawl: 0, walk: 0, phase: 0, reveal: 0, ghost: 0, eye: 0, look: 0, lookUp: 0, reach: 0, twitch: 0.4, alive: true };
  S.ghost = Q(8.2, 9.2, t) * (1 - Q(11.6, 12.5, t)); S.reveal = Q(9.3, 12.3, t); S.eye = Q(12.45, 12.7, t);
  S.lookUp = -0.35 * (1 - Q(11.8, 12.7, t)); S.crawl = 0.25 * Q(13, 15, t);
  if (t < 8) return S;
  if (t >= 22.6 && t < SCOUT_LEAP0) {
    const p = scoutPathPos(t), k = Q(22.6, 24.4, t), q = scoutPathPos(t + 0.05);
    S.x = lerp(SC0.x, p.x, k); S.z = lerp(SC0.z, p.z, k); S.rotY = lerpAng(ROT_SC + PI, faceTo(p, q), Q(22.6, 23.3, t));
    S.crawl = Q(22.6, 23.2, t); S.walk = S.crawl; S.phase = t * 9.5; S.twitch = 0.2;
  } else if (t >= SCOUT_LEAP0 && t < SCOUT_LEAP1) {
    const a = scoutPathPos(SCOUT_LEAP0), k = (t - SCOUT_LEAP0) / (SCOUT_LEAP1 - SCOUT_LEAP0);
    const run = k < 0.35;                                                         // sprint, then a long leap over him
    const kk = run ? k / 0.35 * 0.25 : 0.25 + (k - 0.35) / 0.65 * 0.75;
    S.x = lerp(a.x, HOLD.x, kk); S.z = lerp(a.z, HOLD.z, kk);
    S.y = run ? 0 : 3.6 * Math.sin(PI * (k - 0.35) / 0.65);
    S.rotY = faceTo(a, HOLD); S.crawl = 1; S.walk = run ? 1 : 0.3; S.phase = t * 11;
  } else if (t >= SCOUT_LEAP1) {
    const adv = Q(47.5, 66, t) * 4.0;
    S.x = HOLD.x - O.x * adv; S.z = HOLD.z - O.z * adv;
    S.rotY = lerpAng(faceTo(SP, HOLD), faceTo(HOLD, RP), Q(SCOUT_LEAP1, SCOUT_LEAP1 + 0.6, t));
    S.crawl = 1 - Q(40.6, 42.0, t) * 0.92; S.reach = Q(41.0, 41.6, t) * (1 - Q(43.2, 44.2, t));
    S.lookUp = 0.4 * Q(41.0, 41.6, t) * (1 - Q(43.0, 44, t)); S.twitch = 1;
    S.walk = Q(47.5, 48, t) * 0.35; S.phase = t * 3;
  }
  S.y += t >= SCOUT_LEAP0 && t < SCOUT_LEAP1 ? 0 : 0;
  return S;
}
// scout dies in the shockwave; its broken skull lands at SKULL and keeps transmitting
const T_SLAM = 72.4, WAVE_V = 15;
const T_SCOUT_HIT = T_SLAM + d2(HOLD, LP) / WAVE_V;
const skull = new THREE.Group(); world.add(skull);
{
  const head = scout.head.clone(true); head.position.set(0, 0, 0); head.rotation.set(0, 0, 0); head.scale.setScalar(1.9); skull.add(head);
  const ribs = scout.chest.clone(true); ribs.position.set(0.0, -0.25, -0.55); ribs.rotation.set(1.3, 0.3, 0.4); ribs.scale.setScalar(1.3); skull.add(ribs);
  skull.traverse(o => { if (o.isMesh) o.castShadow = true; });
}
const SKULL_REST = { x: SKULL.x, z: SKULL.z, rot: [0.5, 0.9, 1.25] };

// =====================================================================
// THE ARMY
// =====================================================================
const N_ARMY = 120;
const army = makeHollowArmy(N_ARMY); world.add(army.group);
const SOLD = [];
for (let i = 0; SOLD.length < N_ARMY && i < 5000; i++) {
  const d = 3.5 + hash2(i, 201) ** 0.8 * 30, w = (hash2(i, 203) - 0.5) * 52;
  const p = P2(RP.x + O.x * d + PERP.x * w, RP.z + O.z * d + PERP.z * w);
  if (d2(p, C) < LAKE_R + 1.6 || d2(p, SP) < 2.6 || d2(p, HOLD) < 2.2) continue;
  if (Math.abs(w) < 1.4 && d < 6.4) continue;                                             // keep his retreat line clear
  if (SOLD.some(s => d2(s.p0, p) < 1.7)) continue;
  const k = SOLD.length;
  SOLD.push({ p0: p, d, w, h: hash2(k, 207), rise: 41.1 + d2(p, HOLD) * 0.085 + hash2(k, 209) * 1.0, speed: 0.28 + hash2(k, 211) * 0.25, scale: 0.85 + hash2(k, 213) * 0.35 });
}
// the front ones get shot (one target per ~3 shots, closest to him first)
const byFront = SOLD.map((s, i) => [i, d2(s.p0, RP)]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
const HITS = [];
for (let k = 0; k * 3 + 2 < SHOTS.length && k < 12; k++) { const s = SOLD[byFront[k]]; s.hitT = SHOTS[k * 3 + 2] + 0.05; HITS.push({ i: byFront[k], t: s.hitT }); }
function soldierPos(s, t) {
  const tt = Math.min(t, T_SLAM), go = Math.max(0, tt - 47.5) * s.speed;
  const dx = RP.x - s.p0.x, dz = RP.z - s.p0.z, dl = Math.hypot(dx, dz), m = Math.min(go, Math.max(0, dl - 3.2 - s.h * 2));
  return P2(s.p0.x + dx / dl * m, s.p0.z + dz / dl * m);
}
for (const s of SOLD) {
  const pp = soldierPos(s, T_SLAM), dl = d2(pp, LP);
  s.blowT = dl < 36 ? T_SLAM + dl / WAVE_V : null;
  s.blowH = (16 - dl * 0.32) * (0.6 + hash2(SOLD.indexOf(s), 215) * 0.6); s.blowV = 5 + hash2(SOLD.indexOf(s), 217) * 6 - dl * 0.08;
  s.dust = s.blowT ? s.blowT + 1.3 + hash2(SOLD.indexOf(s), 219) * 1.2 : null;
}
// far horde: hundreds more red eyes on the dark hills
const FAR_N = 420;
const farEyes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), glow(2.6, 0.15, 0.2), FAR_N * 2); farEyes.frustumCulled = false; world.add(tag(farEyes, SET.ENERGY));
const FAR = [...Array(FAR_N)].map((_, i) => {
  const d = 34 + hash2(i, 301) ** 0.7 * 120, w = (hash2(i, 303) - 0.5) * (70 + d * 1.4);
  const x = RP.x + O.x * d + PERP.x * w, z = RP.z + O.z * d + PERP.z * w;
  return { x, z, y: H(x, z) + 1.0 + hash2(i, 305) * 0.4, on: 43.2 + hash2(i, 307) * 6.5 + d * 0.01, ph: hash2(i, 309) * 6.28 };
});

// =====================================================================
// PROPS / CREATURES / FX
// =====================================================================
const pixel = makeSkitterling(1); world.add(pixel.g);
const MOTHS = 46, moths = makeMothSwarm(MOTHS); world.add(moths.g);
const CRYS = [];
for (let i = 0; i < 18; i++) {
  const u = 0.12 + i * 0.042, side = i % 2 ? 1 : -1, p0 = pathAt(u), a = lerp(aStart, A1, u);
  const r = d2(p0, C) + side * (1.6 + hash2(i, 401) * 1.2), p = at(r, a);
  const c = makeCrystal(1.4 + hash2(i, 403) * 1.6, 60 + i); c.g.position.set(p.x, H(p.x, p.z), p.z); c.ring.visible = false; world.add(c.g);
  let tDev = 999, tSc = 999;
  for (let t = T_RUN0; t < T_RUN1; t += 1 / 60) { const S = devState(t); if (tDev === 999 && Math.hypot(S.x - p.x, S.z - p.z) < 2.6) tDev = t; }
  for (let t = 22.6; t < SCOUT_LEAP0; t += 1 / 60) { const S = scoutState(t); if (tSc === 999 && Math.hypot(S.x - p.x, S.z - p.z) < 2.8) tSc = t; }
  CRYS.push({ ...c, p, tDev, tSc });
}
// particle pools
const dustPool = makePool(2600, new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x9a98b0, roughness: 0.5, metalness: 0.4, flatShading: true }), SET.METAL);
const emberPool = makePool(1400, new THREE.IcosahedronGeometry(1, 0), glow(2.4, 0.2, 0.25), SET.ENERGY);
const soilPool = makePool(2400, new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x2a2440, roughness: 1, flatShading: true }), SET.ROCK);
const cyanPool = makePool(900, new THREE.IcosahedronGeometry(1, 0), glow(0.5, 1.9, 2.3), SET.ENERGY);
world.add(dustPool.mesh, emberPool.mesh, soilPool.mesh, cyanPool.mesh);
// tracers (stretched boxes)
const tracers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glow(0.7, 2.2, 2.6), 24); tracers.frustumCulled = false; world.add(tag(tracers, SET.ENERGY));
const flash = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), glow(1.8, 2.4, 2.6)); world.add(tag(flash, SET.ENERGY));
// shockwave: flat ring + faint dome
const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 96), glow(0.6, 2.2, 2.6, { transparent: true })); wave.rotation.x = PI / 2; world.add(tag(wave, SET.ENERGY));
const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, PI * 2, 0, PI / 2), glow(0.3, 1.0, 1.3, { transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
world.add(tag(dome, SET.ENERGY, true));
// red signal beam from the broken skull + rising rings
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 900, 10, 1, true), glow(2.6, 0.15, 0.22));
beam.position.set(SKULL.x, H(SKULL.x, SKULL.z) + 450, SKULL.z); world.add(tag(beam, SET.ENERGY));
const beamHalo = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 900, 12, 1, true), glow(1.4, 0.05, 0.1, { transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
beamHalo.position.copy(beam.position); world.add(tag(beamHalo, SET.ENERGY, true));
const sigRings = [...Array(6)].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 4, 32), glow(2.2, 0.15, 0.2, { transparent: true })); m.rotation.x = PI / 2; world.add(tag(m, SET.ENERGY)); return m; });

// audio cues exported for audio.py
window.AUDIO_META = {
  foot: FOOT.map(f => ({ t: f.t, water: false, run: f.run })),
  shots: SHOTS, hits: HITS.map(h => h.t),
  blows: SOLD.filter(s => s.dust).map(s => +s.dust.toFixed(3)).sort((a, b) => a - b),
  rises: SOLD.map(s => +s.rise.toFixed(3)).sort((a, b) => a - b),
  crystals: CRYS.flatMap(c => [c.tDev, c.tSc]).filter(t => t < 900).map(t => +t.toFixed(3)).sort((a, b) => a - b),
};

// =====================================================================
// TIMELINE
// =====================================================================
const look = new THREE.Vector3(), tmp = new THREE.Vector3();
const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), zAxis = new THREE.Vector3(0, 0, 1);
const vis = (o, on) => { o.visible = on; };

function update(t) {
  const S = devState(t);
  const ending = Q(94.5, 101, t);
  // ---- hero ----
  poseHero(hero, S, t);
  hero.root.position.set(S.x, H(S.x, S.z) + S.air, S.z); hero.root.rotation.set(0, S.rotY, 0);
  hero.root.updateMatrixWorld(true);
  const a = hero.root.position;
  const head = hero.head.getWorldPosition(new THREE.Vector3());
  const echoOn = Q(66.3, 67.0, t) * (1 - Q(77, 84, t));
  const flick = (t > 16.2 && t < 22) ? (hash2(Math.floor(t * 20), 5) > 0.7 ? 0.25 : 1) : 1;
  hero.cyanMat.color.setRGB(0.35, 1.6, 1.8).multiplyScalar(flick * (1 + 2.6 * echoOn + (t > 85.8 && t < 92 && Math.sin(t * 40) > 0 ? 1.4 : 0)));
  hero.jetMat.opacity = 0.9;
  hero.handGun.visible = t > 55.9 && t < 67.4; hero.gun.visible = !hero.handGun.visible;
  const breathRate = S.scene === 8 ? 5.0 : 2.6;
  hero.fogMat.opacity = ((t > 9.5 && t < 22.4) || S.scene === 8) ? 0.12 + 0.22 * Math.max(0, Math.sin(t * breathRate)) : 0;

  // ---- scout ----
  const sc = scoutState(t);
  const scoutDead = t >= T_SCOUT_HIT;
  scout.setCloak(sc.reveal, sc.ghost, t);
  if (scoutDead) scout.root.visible = false;
  else {
    scout.root.position.set(sc.x, H(sc.x, sc.z) + sc.y, sc.z); scout.root.rotation.set(0, sc.rotY, 0);
    poseHollow(scout, { crawl: sc.crawl, walk: sc.walk, phase: sc.phase, t, reach: sc.reach, look: sc.look, lookUp: sc.lookUp, twitch: sc.twitch });
    scout.eye.scale.set(1, 0.15 + 0.85 * sc.eye, 1); scout.eye2.visible = sc.eye > 0.5;
    scout.red.color.setRGB(2.4, 0.16, 0.2).multiplyScalar(0.25 + 0.75 * sc.eye + 1.5 * pulse(t, 12.5, 2.5));
  }
  const scoutHead = scout.head.getWorldPosition(new THREE.Vector3());
  redLight.position.copy(scoutHead).add(v3(0, 0.2, 0));
  redLight.intensity = scoutDead ? 0 : (S.scene === 3 ? 1.5 : S.scene <= 2 ? 6 * sc.eye + 10 * pulse(t, 12.5, 2) : 3 * sc.eye);
  // skull: flies off when the wave hits, then lies there beaming
  {
    const k = clamp01((t - T_SCOUT_HIT) / 1.6);
    vis(skull, scoutDead);
    if (scoutDead) {
      const gy = H(SKULL.x, SKULL.z) + 0.25;
      const x = lerp(HOLD.x, SKULL.x, k), z = lerp(HOLD.z, SKULL.z, k), y = lerp(H(HOLD.x, HOLD.z) + 2.6, gy, k) + 7 * Math.sin(PI * k);
      skull.position.set(x, y, z);
      const sp = (1 - k) * 9;
      skull.rotation.set(SKULL_REST.rot[0] + sp * 1.3, SKULL_REST.rot[1] + sp, SKULL_REST.rot[2] + sp * 0.7);
    }
  }
  const beamOn = Q(90.5, 92.6, t) * (0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 3.1));
  vis(beam, beamOn > 0.01); vis(beamHalo, beamOn > 0.01);
  beam.scale.set(0.6 + beamOn * 0.6, 1, 0.6 + beamOn * 0.6); beamHalo.material.opacity = 0.3 * beamOn;
  sigRings.forEach((r, i) => { const ph = ((t * 0.6 + i / sigRings.length) % 1); r.visible = beamOn > 0.01; r.position.set(SKULL.x, H(SKULL.x, SKULL.z) + 1 + ph * 70, SKULL.z); r.scale.setScalar(0.6 + ph * 3); r.material.opacity = (1 - ph) * beamOn; });
  if (t > 80) { redLight.position.set(SKULL.x, H(SKULL.x, SKULL.z) + 2, SKULL.z); redLight.intensity = 40 * beamOn; redLight.distance = 40; }
  else redLight.distance = 26;

  // ---- army ----
  const SL = [], dust = [], embers = [], soil = [], cy = [];
  SOLD.forEach((s, i) => {
    const rk = Q(s.rise, s.rise + 1.8, t);
    if (t < s.rise || (s.hitT && t > s.hitT) || (s.dust && t > s.dust)) { SL.push(null); }
    else {
      let p = soldierPos(s, t), y = H(p.x, p.z), rx = 0, rz = 0, rotY = faceTo(p, RP) + Math.sin(t * 0.7 + i) * 0.15, sprawl = 0;
      if (s.blowT && t > s.blowT) {
        const dt = t - s.blowT, dx = p.x - LP.x, dz = p.z - LP.z, dl = Math.hypot(dx, dz) + 1e-3;
        p = P2(p.x + dx / dl * s.blowH * dt, p.z + dz / dl * s.blowH * dt);
        y = Math.max(H(p.x, p.z), y + s.blowV * dt - 9 * dt * dt);
        rx = -dt * (4 + s.h * 5); rz = dt * (s.h - 0.5) * 6; sprawl = 1;
      }
      const walk = t > 47.5 && !(s.blowT && t > s.blowT) ? 1 : 0;
      SL.push({ on: true, x: p.x, y, z: p.z, rotY, rx, rz, scale: s.scale,
        pose: { crawl: 0.75 - 0.25 * Math.sin(t * 0.5 + i) * (1 - walk), walk, phase: t * (5 + s.h * 2) + i, t, rise: rk, twitch: 1, sprawl, lookUp: 0.2 },
        eye: Q(s.rise + 0.7 + s.h * 0.6, s.rise + 0.9 + s.h * 0.6, t) * (0.8 + 0.4 * Math.sin(t * 9 + i)) });
      // soil bursting out as it claws up
      if (t < s.rise + 2.2) for (let k = 0; k < 8; k++) {
        const dt = t - s.rise - hash2(i, k) * 0.6; if (dt < 0 || dt > 1.4) continue;
        const ang = hash2(i, k + 9) * 6.283, hv = 0.6 + hash2(i, k + 19) * 1.6, vv = 2 + hash2(i, k + 29) * 3;
        soil.push({ x: s.p0.x + Math.sin(ang) * hv * dt, y: H(s.p0.x, s.p0.z) + Math.max(0, vv * dt - 4.9 * dt * dt), z: s.p0.z + Math.cos(ang) * hv * dt, s: 0.06 + hash2(i, k + 39) * 0.08, rx: dt * 5, ry: k });
      }
    }
    // shot: shatter into glyph dust + embers
    for (const [tt, n, seed] of [[s.hitT, 26, 0], [s.dust, 18, 50]]) {
      if (!tt || t < tt || t > tt + 2.4) continue;
      let p = soldierPos(s, tt);
      if (seed && s.blowT) { const dt = tt - s.blowT, dx = p.x - LP.x, dz = p.z - LP.z, dl = Math.hypot(dx, dz) + 1e-3; p = P2(p.x + dx / dl * s.blowH * dt, p.z + dz / dl * s.blowH * dt); }
      const y0 = H(p.x, p.z) + 0.8 * s.scale, dt = t - tt;
      for (let k = 0; k < n; k++) {
        const ang = hash2(i * 7 + k, seed + 1) * 6.283, hv = 0.6 + hash2(i + k, seed + 2) * 2.6, vv = 0.5 + hash2(i + k, seed + 3) * 3.2;
        const x = p.x + Math.sin(ang) * hv * dt, z = p.z + Math.cos(ang) * hv * dt, y = Math.max(H(x, z) + 0.03, y0 + vv * dt - 4.9 * dt * dt);
        const fade = 1 - dt / 2.4;
        (k % 4 === 0 ? embers : dust).push({ x, y, z, s: (k % 4 === 0 ? 0.035 : 0.07) * (0.5 + hash2(i, k + seed)) * Math.sqrt(fade), rx: dt * (3 + k), ry: k, rz: dt * 2 });
      }
    }
  });
  army.set(SL);
  // far horde eyes
  FAR.forEach((f, i) => {
    const on = Q(f.on, f.on + 0.3, t) * (1 - 0.6 * Q(73, 76, t) * (hash2(i, 1) < 0.5 ? 1 : 0));
    const s = on > 0 ? 0.09 * on * (0.85 + 0.15 * Math.sin(t * 6 + f.ph)) : 0;
    for (const sd of [-1, 1]) {
      sv.setScalar(s || 1e-4); pv.set(f.x + PERP.x * sd * 0.14, f.y, f.z + PERP.z * sd * 0.14);
      m4.compose(pv, qq.identity(), sv); farEyes.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4);
    }
  });
  farEyes.instanceMatrix.needsUpdate = true; farEyes.visible = t > 43;

  // ---- gun: muzzle flash, tracers, light ----
  const muzzle = hero.muzzle.getWorldPosition(new THREE.Vector3());
  const lastShot = SHOTS.filter(s => s <= t).pop();
  const fl = lastShot !== undefined && t - lastShot < 0.05 && hero.handGun.visible;
  vis(flash, fl); if (fl) { flash.position.copy(muzzle); flash.scale.setScalar(0.04 + hash2(lastShot * 100, 3) * 0.05); }
  muzzleLight.position.copy(muzzle); muzzleLight.intensity = fl ? 14 : 0;
  let nt = 0;
  for (const [k, sh] of SHOTS.entries()) {
    const dt = t - sh; if (dt < 0 || dt > 0.12) continue;
    const tgt = SOLD[byFront[Math.min(11, Math.floor(k / 3))]], tp = soldierPos(tgt, sh);
    const end = v3(tp.x + (hash2(k, 1) - 0.5) * 0.8, H(tp.x, tp.z) + 0.7 + hash2(k, 2) * 0.5, tp.z), dir = end.clone().sub(muzzle);
    const L = dir.length(), u = Math.min(1, dt / 0.08), seg = Math.min(L * 0.35, 3.0);
    const head2 = muzzle.clone().addScaledVector(dir, u), tail = muzzle.clone().addScaledVector(dir, Math.max(0, u - seg / L));
    pv.copy(head2).add(tail).multiplyScalar(0.5); qq.setFromUnitVectors(zAxis, dir.clone().normalize()); sv.set(0.035, 0.035, head2.distanceTo(tail) + 0.01);
    m4.compose(pv, qq, sv); tracers.setMatrixAt(nt++, m4); if (nt >= 24) break;
  }
  for (let k = nt; k < 24; k++) tracers.setMatrixAt(k, m4.makeScale(0, 0, 0));
  tracers.instanceMatrix.needsUpdate = true;

  // ---- ECHO jump: jets particles, shockwave, blast light ----
  if (S.jet > 0.01) {
    const pk = hero.jets.getWorldPosition(new THREE.Vector3());
    for (let k = 0; k < 70; k++) {
      const ts = Math.floor(t * 60) / 60 - k / 60, dt = t - ts; if (dt > 1.1) continue;
      const jx = (hash2(ts * 60, 1) - 0.5) * 0.4, jz = (hash2(ts * 60, 2) - 0.5) * 0.4;
      cy.push({ x: pk.x + jx * (1 + dt * 4), y: pk.y - dt * 7 + 4.9 * dt * dt * 0.2, z: pk.z + jz * (1 + dt * 4), s: 0.05 * (1 - dt), rx: k });
    }
  }
  const wr = Math.max(0, t - T_SLAM) * WAVE_V, wOn = t > T_SLAM && t < T_SLAM + 2.2;
  vis(wave, wOn); vis(dome, t > T_SLAM && t < T_SLAM + 0.9);
  if (wOn) { wave.position.set(LP.x, H(LP.x, LP.z) + 0.3, LP.z); wave.scale.set(wr, wr, 1 + wr * 0.8); wave.material.opacity = 1 - (t - T_SLAM) / 2.2; }
  if (dome.visible) { const r = (t - T_SLAM) * 30; dome.position.set(LP.x, H(LP.x, LP.z), LP.z); dome.scale.set(r, r * 0.45, r); dome.material.opacity = 0.18 * (1 - (t - T_SLAM) / 0.9); }
  blastLight.position.set(LP.x, H(LP.x, LP.z) + 2, LP.z); blastLight.intensity = 40 * pulse(t, T_SLAM, 2.5) + 30 * echoOn * (S.scene === 7 ? 1 : 0);
  if (t > T_SLAM && t < T_SLAM + 3) for (let k = 0; k < 220; k++) {               // ground debris thrown up by the slam
    const dt = t - T_SLAM - hash2(k, 7) * 0.15; if (dt < 0) continue;
    const ang = hash2(k, 1) * 6.283, hv = 4 + hash2(k, 2) * 12, vv = 3 + hash2(k, 3) * 9, x = LP.x + Math.sin(ang) * hv * dt, z = LP.z + Math.cos(ang) * hv * dt;
    soil.push({ x, y: Math.max(H(x, z), H(LP.x, LP.z) + vv * dt - 9 * dt * dt), z, s: 0.08 + hash2(k, 4) * 0.15, rx: dt * 6, ry: k });
  }
  // scout breaks apart
  if (t > T_SCOUT_HIT && t < T_SCOUT_HIT + 2.5) for (let k = 0; k < 90; k++) {
    const dt = t - T_SCOUT_HIT, ang = hash2(k, 31) * 6.283, hv = 2 + hash2(k, 32) * 6, vv = 2 + hash2(k, 33) * 6;
    const x = HOLD.x + Math.sin(ang) * hv * dt, z = HOLD.z + Math.cos(ang) * hv * dt;
    (k % 3 ? dust : embers).push({ x, y: Math.max(H(x, z), H(HOLD.x, HOLD.z) + 1.5 + vv * dt - 6 * dt * dt), z, s: 0.09 * (1 - dt / 2.5), rx: dt * 7, ry: k });
  }
  // red signal glyphs spiralling up the beam
  if (beamOn > 0.01) for (let k = 0; k < 160; k++) {
    const ph = (t * 0.25 + hash2(k, 41)) % 1, ang = k * 2.4 + t * 1.5, r = 0.6 + ph * 3.5;
    embers.push({ x: SKULL.x + Math.cos(ang) * r, y: H(SKULL.x, SKULL.z) + 0.8 + ph * 40, z: SKULL.z + Math.sin(ang) * r, s: 0.08 * (1 - ph) * beamOn, rx: k });
  }
  dustPool.set(dust); emberPool.set(embers); soilPool.set(soil); cyanPool.set(cy);

  // ---- crystals: cyan as he passes, red as the scout passes ----
  for (const c of CRYS) {
    const kd = pulse(t, c.tDev, 1.3), ks = pulse(t, c.tSc, 1.1), kb = t > T_SLAM ? pulse(t, T_SLAM + d2(c.p, LP) / WAVE_V, 1.0) : 0;
    c.mat.emissive.setRGB(0.1, 0.29, 0.63).lerp(new THREE.Color(0.5, 1.4, 1.8), Math.min(1, (kd + kb) * 1.2)).lerp(new THREE.Color(1.9, 0.12, 0.2), Math.min(1, ks * 1.3));
    c.mat.emissiveIntensity = 0.45 + 2.6 * Math.max(kd, ks, kb);
    c.g.visible = S.scene >= 4 && S.scene <= 7 || S.scene === 9;
  }

  // ---- Pixel: peeks out and dives in (S2), climbs to the shoulder on the hill (S8+) ----
  {
    const pk = hero.pocket.getWorldPosition(new THREE.Vector3()), sh = hero.shoulderL.getWorldPosition(new THREE.Vector3());
    if (t < 9.6) {
      const up = Q(0.5, 1.2, t) * (1 - Q(8.5, 9.1, t));
      pixel.g.position.copy(pk).add(v3(0, -0.07 + 0.08 * up, 0)); pixel.g.rotation.set(0, S.rotY + 0.3 * Math.sin(t), 0); pixel.g.scale.setScalar(0.45);
      poseSkitterling(pixel, { curl: 1 - up * 0.7, eyeOpen: (t % 3.3) < 0.12 ? 0.1 : 1, look: Math.sin(t * 1.3) * 0.5, t }); vis(pixel.g, up > 0.02);
    } else if (t > 83.2) {
      const out = Q(83.2, 84.0, t), climb = Q(85.0, 86.8, t);
      pixel.g.position.copy(pk).add(v3(0, -0.07 + 0.08 * out, 0)).lerp(sh, climb); pixel.g.rotation.set(0, S.rotY + 0.4 * Math.sin(t * 0.8) * (1 - climb) + PI * 0.15 * climb, 0);
      pixel.g.scale.setScalar(0.45 + 0.3 * climb);
      poseSkitterling(pixel, { curl: 1 - out, walk: Q(85, 85.3, t) * (1 - Q(86.5, 86.8, t)), phase: t * 14, eyeOpen: (t % 3.7) < 0.12 ? 0.1 : 1, look: Math.sin(t * 0.9) * 0.4, t });
      pixel.stripe.color.setRGB(0.3, 1.7, 1.9).multiplyScalar(1 + 0.5 * Math.sin(t * 3));
      vis(pixel.g, true);
    } else vis(pixel.g, false);
  }

  // ---- moths in the crystal meadow scatter as he runs through ----
  {
    const mc = pathAt(0.42), ml = [], tPass = 29.4;
    for (let i = 0; i < MOTHS; i++) {
      const h1 = hash2(i, 91), h2 = hash2(i, 93), h3 = hash2(i, 95);
      const ang = h1 * 6.283 + t * 0.2, r = 1.5 + h2 * 5;
      const p = v3(mc.x + Math.cos(ang) * r, H(mc.x, mc.z) + 0.8 + h3 * 2.2 + Math.sin(t * 1.3 + i) * 0.2, mc.z + Math.sin(ang) * r);
      let s = 1.6;
      if (t > tPass) { const k = t - tPass; p.add(v3(Math.cos(h1 * 9) * k * 5, k * 2.4, Math.sin(h1 * 9) * k * 5)); s *= Math.max(0, 1 - k / 3.5); }
      if (S.scene !== 4) s = 0;
      ml.push({ x: p.x, y: p.y, z: p.z, yaw: ang, flap: Math.sin(t * 24 + i * 1.3) * 0.9, s });
    }
    moths.set(ml);
  }

  // ---- lake ----
  {
    const U = lake.material.uniforms; U.uTime.value = t; U.uRed.value = Q(91, 95, t);
    const rip = [];
    if (t > T_SLAM) rip.push([RP.x, RP.z + 2, T_SLAM + d2(RP, LP) / WAVE_V, 1.4]);
    for (const [k, h] of HITS.entries()) if (t > h.t && k < 4) rip.push([RP.x - O.x * 3, RP.z - O.z * 3, h.t + 0.3, 0.3]);
    for (let tt = 92; tt <= t; tt += 1.9) rip.push([C.x + 3, C.z - 4, tt, 0.25]);
    rip.sort((p, q) => q[2] - p[2]);
    for (let i = 0; i < 10; i++) { const r = rip[i]; U.uRip.value[i].set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0, r && t - r[2] < 8 ? r[3] : 0); }
  }

  // ---- grass: feet part it, the invisible thing carves a line toward him, the slam flattens a ring ----
  const gu = grass.uniforms;
  gu.uTime.value = t; gu.uGust.value = 0.8 + 0.6 * Q(22, 24, t) * (1 - Q(80, 82, t));
  gu.uPush.value[0].set(a.x, a.z, S.run > 0.5 ? 1.5 : 1.1, S.air > 1 ? 0 : 1);
  const trail = tt => v3(14, 0, -0.5).lerp(v3(SC0.x, 0, SC0.z), Q(0.5, 7.4, tt));
  const tr = trail(t);
  gu.uPush.value[1].set(t < 8.5 ? tr.x : sc.x, t < 8.5 ? tr.z : sc.z, t < 8.5 ? 1.5 : (sc.crawl > 0.5 ? 2.0 : 1.4), scoutDead ? 0 : 1.3);
  const tr2 = trail(t - 0.6); gu.uPush.value[2].set(tr2.x, tr2.z, 1.3, t < 8.5 ? 1.2 : 0);
  gu.uPush.value[3].set(LP.x, LP.z, 4.5, t > T_SLAM ? 1.4 : 0);
  gu.uWave.value.set(LP.x, LP.z, wr, t > T_SLAM ? 1.8 * Math.exp(-(t - T_SLAM) * 0.9) : 0);
  if (S.scene === 1) { gu.uPush.value[3].set(a.x + 1.4, a.z + 3.0, 2.0, 1.5); }               // clear blades in front of the camera
  if (S.scene === 8 || S.scene === 9) { gu.uPush.value[3].set(a.x, a.z - 2.5, 2.2, 1.2); }

  // ---- lights ----
  moon.target.position.copy(a); moon.position.copy(a).add(v3(-35, 45, -60));
  rimL.target.position.copy(a); rimL.position.copy(a).add(v3(30, 12, 40));
  hemi.color.setRGB(0.35, 0.4, 1.0).lerp(new THREE.Color(0.8, 0.2, 0.3), 0.45 * ending);
  sky.ringMat.uniforms.uGain.value = 1 - 0.5 * ending; sky.ringMat.uniforms.uRed.value = ending;
  sky.planetMat.uniforms.uDim.value = 1 - 0.35 * ending;
  if (sky.spires.crackMat) sky.spires.crackMat.color.setRGB(1.6, 0.12, 0.2).multiplyScalar(1 + 1.2 * ending);
  armada.set(Q(95.5, 101.5, t), t);

  // ---- cameras ----
  camera.fov = 58;
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  switch (S.scene) {
    case 1: { const k = Q(0, 8, t);                                                         // behind-right of him, lake ahead, trail coming from the right
      camera.position.copy(a).add(v3(0.75 + 0.5 * k, 1.65, 3.6 - 0.5 * k)); look.copy(a).add(v3(0.1 + 1.0 * Q(5, 8, t), 1.15, -4)); break; }
    case 2: { const sp = v3(sc.x, 0, sc.z), dir = sp.clone().sub(v3(a.x, 0, a.z)).normalize(), side = v3(dir.z, 0, -dir.x);
      const k = Q(8, 16, t);
      camera.position.copy(a).addScaledVector(dir, -2.3 - 0.4 * k).addScaledVector(side, -1.0).add(v3(0, 1.0 - 0.2 * k, 0));
      look.copy(sp).add(v3(0, 1.6 + 0.8 * Q(9, 12.6, t), 0)).lerp(v3(a.x, 1.4, a.z), 0.25); camera.fov = 60; break; }
    case 3: { camera.position.copy(head).addScaledVector(fwd, 1.0).addScaledVector(right, 0.28).add(v3(0, 0.04, 0)); look.copy(head).add(v3(0, -0.06, 0)); camera.fov = 38; break; }
    case 4: if (t < 31.5) {                                                                   // in front of him, running at the camera, scout behind
        camera.position.copy(a).addScaledVector(fwd, 3.6 - 0.6 * Q(22.4, 24, t)).add(v3(0, 0.75, 0)).addScaledVector(right, 0.5); look.copy(a).add(v3(0, 1.05, 0)).addScaledVector(fwd, -2.5);
        camera.fov = 64;
      } else {                                                                              // low side tracking through the crystals
        camera.position.copy(a).addScaledVector(right, -11).addScaledVector(fwd, -2.0).add(v3(0, 2.0, 0)); look.copy(a).add(v3(0, 0.9, 0)).addScaledVector(fwd, -2.8);
        if (t > 38.2) { camera.position.copy(a).addScaledVector(fwd, -4.0).addScaledVector(right, 1.0).add(v3(0, 1.2, 0)); look.copy(a).add(v3(0, 2.6, 0)).addScaledVector(fwd, 4); camera.fov = 66; }
        camera.fov = 62;
      } break;
    case 5: if (t < 44.2) {                                                                 // low behind him: the ground splits ahead
        camera.position.copy(a).addScaledVector(fwd, -2.2).addScaledVector(right, 0.8).add(v3(0, 0.55, 0)); look.copy(a).addScaledVector(fwd, 8).add(v3(0, 1.8, 0)); camera.fov = 64;
      } else if (t < 49.6) {                                                                // high wide: hundreds rising, eyes lighting up
        const k = Q(44.2, 49.6, t);
        camera.position.copy(a).addScaledVector(fwd, -3.2 - 2.5 * k).addScaledVector(right, 1.2).add(v3(0, 0.9 + 6.2 * k, 0));
        look.set(SP.x + O.x * 13, H(SP.x, SP.z) + 0.6, SP.z + O.z * 13); camera.fov = 60 + 6 * k;
      } else {                                                                              // in front of him, backing toward the lake, army behind the camera
        camera.position.copy(a).addScaledVector(fwd, -2.8).addScaledVector(right, 0.7).add(v3(0, 0.95, 0)); look.copy(a).add(v3(0, 1.0, 0)).addScaledVector(fwd, 6).addScaledVector(right, 0.5); camera.fov = 62;
      } break;
    case 6: if (t < 60.6) {                                                                  // over the shoulder from the lake side
        camera.position.copy(v3(RP.x, 0, RP.z)).addScaledVector(v3(O.x, 0, O.z), -1.9).addScaledVector(v3(PERP.x, 0, PERP.z), 0.75).add(v3(0, H(RP.x, RP.z) + 1.75, 0));
        look.set(RP.x + O.x * 10, H(RP.x, RP.z) + 1.2, RP.z + O.z * 10); camera.fov = 60;
      } else {                                                                              // reverse: low in front, muzzle flashes light his visor
        camera.position.copy(v3(RP.x, 0, RP.z)).addScaledVector(v3(O.x, 0, O.z), 3.8).addScaledVector(v3(PERP.x, 0, PERP.z), 1.1).add(v3(0, H(RP.x, RP.z) + 1.4, 0));
        look.set(RP.x, H(RP.x, RP.z) + 1.4, RP.z); camera.fov = 58;
      } break;
    case 7: if (t < 67.6) { camera.position.copy(head).addScaledVector(fwd, 1.05).addScaledVector(right, -0.3).add(v3(0, -0.06, 0)); look.copy(head).add(v3(0, -0.08, 0)); camera.fov = 38; }
      else if (t < T_SLAM) {                                                               // side-on: the jump over the army
        const mid = v3((RP.x + LP.x) / 2, 0, (RP.z + LP.z) / 2);
        const gy = H(a.x, a.z);
        camera.position.copy(mid).addScaledVector(v3(PERP.x, 0, PERP.z), 8.5).add(v3(0, H(mid.x, mid.z) + 3.0, 0));
        look.set(a.x, gy + (a.y - gy) * 0.72 + 0.4, a.z).lerp(v3(mid.x, gy + 2, mid.z), 0.35); camera.fov = 68;
      } else if (t < 76.4) {                                                               // high wide: shockwave
        const k = Q(T_SLAM, 76.4, t);
        camera.position.set(LP.x - O.x * 9 + PERP.x * 7, H(LP.x, LP.z) + 7.5 + 2.5 * k, LP.z - O.z * 9 + PERP.z * 7);
        look.set(LP.x + O.x * 4, H(LP.x, LP.z) + 0.5, LP.z + O.z * 4); camera.fov = 72;
      } else { camera.position.copy(a).addScaledVector(fwd, 3.0).addScaledVector(right, 1.0).add(v3(0, 1.2, 0)); look.copy(a).add(v3(0, 1.2, 0)); camera.fov = 56; }
      break;
    case 8: { const k = Q(80, 92, t);
      camera.position.copy(a).addScaledVector(fwd, 2.5 - 0.5 * k).addScaledVector(right, 0.8).add(v3(0, 1.3, 0));
      look.copy(a).add(v3(0, 1.25, 0)); if (t > 85) look.lerp(hero.shoulderL.getWorldPosition(tmp), 0.3 * Q(85, 86.5, t)); camera.fov = 54; break; }
    default: { const k = Q(92, 105, t);                                                     // behind him on the hill: lake, battlefield, beam, the sky filling with red
      camera.position.copy(a).addScaledVector(fwd, -3.4 - 1.6 * k).addScaledVector(right, 1.1).add(v3(0, 2.1 + 1.0 * k, 0));
      look.set(SKULL.x, H(SKULL.x, SKULL.z) + 3 + 12 * Q(95, 101, t), SKULL.z); camera.fov = 62 + 6 * k; }
  }
  camera.position.y = Math.max(camera.position.y, H(camera.position.x, camera.position.z) + 0.15);
  for (const c of CRYS) {
    const cx = camera.position.x, cz = camera.position.z, dx = a.x - cx, dz = a.z - cz, L2 = dx * dx + dz * dz + 1e-6;
    const k = clamp01(((c.p.x - cx) * dx + (c.p.z - cz) * dz) / L2), ex = cx + dx * k - c.p.x, ez = cz + dz * k - c.p.z;
    if (Math.hypot(c.p.x - cx, c.p.z - cz) < 3.2 || (k > 0.02 && k < 0.98 && Math.hypot(ex, ez) < 1.3)) c.g.visible = false;
  }
  camera.updateProjectionMatrix(); camera.lookAt(look);
  // shake on the slam
  if (t > T_SLAM && t < T_SLAM + 1.2) { const sk = 0.06 * (1 - (t - T_SLAM) / 1.2); camera.rotation.z += (hash2(Math.floor(t * 60), 3) - 0.5) * sk; camera.rotation.x += (hash2(Math.floor(t * 60), 4) - 0.5) * sk; }

  // ---- post fx ----
  const u = engine.u; u.time.value = t; u.exposure.value = 3.0;
  u.flash.value = 0.22 * pulse(t, 12.5, 5) + 0.3 * pulse(t, T_SLAM, 6) + 0.12 * pulse(t, 41.0, 4) + (fl ? 0.05 : 0);
  const eg = EP.echo.find(e => t >= e.t0 && t < e.t1);
  u.glitch.value = eg ? (t - eg.t0 < 0.5 ? 0.25 : 0.03) : (t > 12.4 && t < 12.8 ? 0.2 : 0);
}

// =====================================================================
// HUD
// =====================================================================
const $ = id => document.getElementById(id);
$('tag').textContent = EP.series; $('title').textContent = EP.title;
$('glitch').style.whiteSpace = 'pre'; $('glitch').style.lineHeight = '1.15';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const GLYPHS = 'ΞΣΔΛΠΦΨΩ⌬⟁⟟⊗⊕⋔⌖⍜⍟';
const VISOR = [
  [16.2, 22.2, 'SUIT LOG · NIGHT 1\nTHREAT  ▮▮▮▮▮▮▮▮▮▮ ???\nO2      ▮▮▮▮▮▮▯▯▯▯ 64%\nHEART   148 BPM'],
  [66.0, 73.0, 'MOTOR CONTROL ▸ ECHO\nTHRUST  ▮▮▮▮▮▮▮▮▮▮\nPILOT   NOT YOU'],
  [86.0, 91.8, 'O2      ▮▮▮▮▯▯▯▯▯▯ 41%\nHEART   122 BPM\nSUIT AI  ECHO // ONLINE'],
];
function hud(t) {
  const c = captionAt(EP.captions, t, 30);
  const cur = c && (c.typing || Math.floor(t * 2.6) % 2 === 0) ? '<span id="cur"></span>' : '';
  $('cap').innerHTML = c ? esc(c.text) + cur : ''; $('cap').style.opacity = c ? c.fade : 0;
  const v = VISOR.find(x => t > x[0] && t < x[1]);
  if (v) { const n = Math.floor((t - v[0]) * 45); $('visor').textContent = v[2].slice(0, Math.max(0, n)); $('visor').style.opacity = (1 - Q(v[1] - 0.5, v[1], t)) * (Math.sin(t * 50) > -0.9 ? 1 : 0.6); }
  else $('visor').style.opacity = 0;
  // ECHO speaks: cold cyan text that resolves out of alien glyphs
  const e = EP.echo.find(x => t >= x.t0 && t < x.t1), gl = $('glitch');
  if (e) {
    const k = Q(e.t0 + 0.05, e.t0 + 0.7, t), j = Math.floor(t * 20);
    let s = '';
    for (let i = 0; i < e.text.length; i++) {
      const ch = e.text[i];
      s += (i / e.text.length) < k || ch === ' ' || ch === '\n' ? ch : GLYPHS[Math.floor(hash2(i, j) * GLYPHS.length)];
    }
    gl.textContent = s; gl.style.opacity = (1 - Q(e.t1 - 0.3, e.t1, t)) * (hash2(j, 3) > 0.08 ? 1 : 0.3);
    const dx = (hash2(j, 1) - 0.5) * 8 * (1 - k * 0.8);
    gl.style.transform = `translateX(${dx}px)`; gl.style.textShadow = `${dx}px 0 #ff2a6d, ${-dx}px 0 #19f0ff, 0 0 18px #0ff, 0 0 4px #000`;
  } else gl.style.opacity = 0;
  const [c0] = EP.events.cta;
  $('cta').style.opacity = Q(c0, c0 + 0.3, t); $('cta').textContent = '▶ EP 4 — THE MAP · follow';
  $('tag').style.opacity = 0.85; $('title').style.opacity = 1;
}

window.renderAt = t => { update(t); engine.render(scene, camera); hud(t); };
window.EP = EP; window.__dbg = { engine, scene, camera, moonH: H, hero, scout, SOLD, devState, scoutState };
window.renderAt(0);
window.READY = true;
