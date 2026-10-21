// Episode 4 — "The Map". The armada fills the sky; ECHO drains the lake; under it a Vaelor temple holds a
// hologram of the whole universe, the way home, four key slots... one empty, next to a human boot print.
import { Reflector } from 'three/addons/objects/Reflector.js';
import { THREE, SET, tag, hash2, fbm, smooth, PI, Q, pulse, glow, std, P2, d2, faceTo, lerpAng, ease, canvasTex,
  loadEpisode, makeStage, makeTerrain, makeHud, postFx, run, aim, footsteps } from './engine/kit.js';
import { lerp, v3, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makeGrass } from './engine/fx.js';
import { makeSkitterling, poseSkitterling } from './engine/creatures.js';
import { makeNightSky, makeArmada } from './engine/sky.js';
import { glyphMaterial, makePillar, makeVaelorStatue, makeGalaxy, makeHoloPlanet, makeHall } from './engine/props.js';

const EP = await loadEpisode('04');
const { engine, scene, camera, world } = makeStage({ fog: [0x30297a, 70, 700] });

// =====================================================================
// OUTSIDE: same lake as Ep 3 (layout kept for continuity)
// =====================================================================
const C = P2(0, -16), LAKE_R = 11, WATER_Y = -0.42, HP = P2(6, 18), SHORE = P2(0.3, -3.6);
function H(x, z) {
  const base = (fbm(x * 0.05 + 7, z * 0.05) - 0.5) * 1.0;
  const dl = Math.hypot(x - C.x, z - C.z) / LAKE_R;
  const lake = dl < 1.5 ? -1.4 * (1 - smooth(0.7, 1.22, dl)) : 0;
  const dh = Math.hypot(x - HP.x, z - HP.z);
  const hill = 8.5 * Math.exp(-((dh / 10) ** 2)) + 1.5 * Math.exp(-((dh / 22) ** 2));
  const far = Math.hypot(x, (z + 20) * 0.8);
  return base + lake + hill + (fbm(x * 0.008 + 3, z * 0.008) - 0.5) * 60 * smooth(75, 260, far);
}
const outside = new THREE.Group(); world.add(outside);
const sky = makeNightSky({ planetDir: [-0.5, 0.36, -1], spires: { heightFn: H, center: [0, -20], rMin: 210, rMax: 720, count: 120, hMin: 40, hMax: 230 } });
outside.add(sky.group);
const armada = makeArmada({ n: 240, dir: [-0.12, 0.42, -1], dist: 1700, spread: [2400, 700] }); outside.add(armada.g);
const a0 = new THREE.Color(0x0e2a44), b0 = new THREE.Color(0x24164e);
outside.add(makeTerrain({ H, col: (x, z, c) => c.copy(a0).lerp(b0, smooth(0.35, 0.65, fbm(x * 0.03 + 9, z * 0.03))) }));
const grass = makeGrass({ area: [-22, 24, -32, 28], density: 11, heightFn: H, colA: 0x167f96, colB: 0x5a2ec8, tall: 0.6, tipFrac: 0.14,
  mask: (x, z) => Math.hypot(x - C.x, z - C.z) > LAKE_R * 1.05 });
grass.mesh.userData.noId = true; outside.add(grass.mesh);
// lake bed: a ring of Vaelor glyphs + the lift platform in the middle (revealed when the water drains)
const bedTex = canvasTex(512, 512, (g, W, Hh) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#fff'; g.lineWidth = 5;
  for (const r of [60, 110, 170, 230]) { g.beginPath(); g.arc(256, 256, r, 0, PI * 2); g.stroke(); }
  g.lineWidth = 3;
  for (let k = 0; k < 48; k++) { const a = k / 48 * PI * 2, r0 = 175 + (k % 2) * 10; g.beginPath(); g.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); g.lineTo(256 + Math.cos(a) * 225, 256 + Math.sin(a) * 225); g.stroke(); }
  for (let k = 0; k < 12; k++) { const a = k / 12 * PI * 2; g.beginPath(); g.arc(256 + Math.cos(a) * 140, 256 + Math.sin(a) * 140, 14, 0, PI * 2); g.stroke(); }
});
const bedMat = new THREE.MeshStandardMaterial({ color: 0x1a1e30, roughness: 0.6, emissive: 0x5ae0ff, emissiveMap: bedTex, emissiveIntensity: 0, transparent: true, depthWrite: false });
const bed = new THREE.Mesh(new THREE.CircleGeometry(9.5, 64), bedMat); bed.rotation.x = -PI / 2; bed.position.set(C.x, H(C.x, C.z) + 0.05, C.z); outside.add(tag(bed, SET.ROCK, true));
const stone = new THREE.MeshStandardMaterial({ color: 0x4a4866, roughness: 0.75, metalness: 0.15, flatShading: true });
const liftGlow = glow(0.4, 1.6, 2.0, { transparent: true });
const lift = new THREE.Group(); outside.add(lift);
lift.add(tag(new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.5, 24), stone), SET.METAL));
const liftRing = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.05, 6, 48), liftGlow); liftRing.rotation.x = PI / 2; liftRing.position.y = 0.26; lift.add(tag(liftRing, SET.ENERGY));
// lake water: drains in a spiral (hole radius grows from the middle)
const waterShader = {
  name: 'DrainWater',
  uniforms: { color: { value: new THREE.Color(0xc4ccff) }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 }, uHole: { value: 0 }, uCenter: { value: new THREE.Vector2(C.x, C.z) } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    void main(){ vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime; uniform float uHole; uniform vec2 uCenter; varying vec4 vUv; varying vec3 vW;
    void main(){
      vec2 q = vW.xz - uCenter; float r = length(q), a = atan(q.y, q.x);
      if (r < uHole) discard;
      float swirl = sin(a * 3.0 + r * 1.6 - uTime * 5.0) * smoothstep(uHole + 6.0, uHole, r) * step(0.01, uHole);
      float h = sin(vW.x * 1.7 + uTime * 1.3) * 0.04 + sin(vW.z * 2.3 - uTime * 1.1) * 0.04 + swirl * 0.5;
      vec4 uv = vUv; uv.xy += vec2(h * 0.07, h * 0.05) * uv.w;
      vec3 c = texture2DProj(tDiffuse, uv).rgb * color + vec3(0.01, 0.012, 0.035);
      c += vec3(0.4, 0.8, 1.3) * max(swirl, 0.0) * 0.35 + vec3(0.8, 1.2, 1.5) * smoothstep(uHole + 0.6, uHole, r) * step(0.01, uHole);
      gl_FragColor = vec4(c, 1.0);
    }`,
};
const lake = new Reflector(new THREE.CircleGeometry(LAKE_R * 1.1, 80), { clipBias: 0.003, textureWidth: 270, textureHeight: 480, shader: waterShader });
lake.rotation.x = -PI / 2; lake.position.set(C.x, WATER_Y, C.z); outside.add(tag(lake, SET.SKY));
{ const orig = lake.onBeforeRender; lake.onBeforeRender = function (...a) { if (!engine.inIdPass) orig.apply(this, a); }; }
const moon = new THREE.DirectionalLight(0xb4c2ff, 2.6); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 260 });
const rimL = new THREE.DirectionalLight(0xa070ff, 1.5), hemi = new THREE.HemisphereLight(0x5a66ff, 0x160c2a, 0.95);
outside.add(moon, moon.target, rimL, rimL.target, hemi);
const liftLight = new THREE.PointLight(0x66e8ff, 0, 18, 1.6); outside.add(liftLight);

// =====================================================================
// INSIDE: the temple (its own space far from the lake)
// =====================================================================
const HALL = v3(2000, 0, 0);
const inside = new THREE.Group(); inside.position.copy(HALL); world.add(inside);
const gm = [0, 1, 2, 3].map(i => glyphMaterial({ color: 0x2e2c48, glow: 0x55e6ff, seed: i + 1, repeat: [1, 1] }));
const hall = makeHall({ R: 18, h: 15, n: 18, stone, glyphMats: gm }); inside.add(hall.g);
const PILLARS = [];
const bandMats = [];
for (let i = 0; i < 12; i++) {
  const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), z = 10 - row * 4.2, x = side * (4.5 + Math.abs(z) * 0.08);
  const bm = glyphMaterial({ color: 0x34324e, glow: 0x55e6ff, seed: 10 + i, repeat: [2, 2] }); bandMats.push(bm);
  const p = makePillar(13, 0.75, stone, bm); p.g.position.set(x, 0, z); inside.add(p.g);
  PILLARS.push({ x, z, mat: bm });
}
for (let i = 0; i < 4; i++) { const a = PI * 0.25 + i * PI / 2, s = makeVaelorStatue(10, stone); s.position.set(Math.sin(a) * 14.5, 0, Math.cos(a) * 14.5); s.rotation.y = a + PI; inside.add(s); }
// altar: 3 round steps + pedestal with four key sockets (the 4th is scratched and empty)
const STEP = [[3.6, 0.25], [2.8, 0.5], [2.1, 0.75]];
for (const [r, y] of STEP) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.1, 0.25, 32), stone); m.position.y = y - 0.125; m.receiveShadow = true; m.castShadow = true; inside.add(tag(m, SET.METAL)); }
const altarH = r => (r < 2.1 ? 0.75 : r < 2.8 ? 0.5 : r < 3.6 ? 0.25 : 0);
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.05, 8), stone); pedestal.position.y = 0.75 + 0.52; pedestal.castShadow = true; inside.add(tag(pedestal, SET.METAL));
const PED_TOP = 0.75 + 1.05;
const sockets = [0, 1, 2, 3].map(i => {
  const a = i * PI / 2 + PI / 4, m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.04, 10), glow(0.4, 1.5, 2.0));
  m.position.set(Math.sin(a) * 0.28, PED_TOP + 0.01, Math.cos(a) * 0.28); inside.add(tag(m, SET.ENERGY)); return { m, a };
});
const scratches = new THREE.Group(); inside.add(scratches);       // claw/tool marks round the empty 4th socket
for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.15), glow(0.08, 0.06, 0.1)); const a = sockets[3].a;
  s.position.set(Math.sin(a) * 0.28 + (k - 1.5) * 0.03, PED_TOP + 0.03, Math.cos(a) * 0.28); s.rotation.y = a + 0.4; scratches.add(tag(s, SET.ROCK)); }
// dust on the top step + boot prints (his, as he walks; and the stranger's)
const dust = new THREE.Mesh(new THREE.RingGeometry(0.62, 2.05, 48), new THREE.MeshStandardMaterial({ color: 0x8a86a0, roughness: 1 }));
dust.rotation.x = -PI / 2; dust.position.y = 0.752; dust.receiveShadow = true; inside.add(tag(dust, SET.ROCK));
const soleTex = (tread) => canvasTex(64, 160, (g, W, Hh) => {
  g.clearRect(0, 0, W, Hh); g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(32, 46, 26, 42, 0, 0, PI * 2); g.fill(); g.beginPath(); g.ellipse(32, 128, 20, 28, 0, 0, PI * 2); g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let y = 10; y < 156; y += tread) { if (y > 88 && y < 100) continue; g.fillRect(0, y, W, tread * 0.45); }
});
const myPrint = new THREE.MeshBasicMaterial({ map: soleTex(14), color: 0x2a2838, transparent: true, depthWrite: false, fog: false });
const strangerPrint = new THREE.MeshBasicMaterial({ map: soleTex(7), color: 0x141220, transparent: true, depthWrite: false, fog: false });
const PRINT = new THREE.PlaneGeometry(0.13, 0.32).rotateX(-PI / 2);
const stranger = new THREE.Mesh(PRINT, strangerPrint); stranger.position.set(-0.42, 0.756, 0.62); stranger.rotation.y = PI + 0.7; inside.add(tag(stranger, SET.ROCK));
// galaxy hologram + earth marker + 4 key worlds
const galaxy = makeGalaxy({ n: 4200, radius: 9 }); galaxy.g.position.y = 6.2; inside.add(galaxy.g);
const earth = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow(0.5, 1.6, 2.6)); galaxy.g.add(tag(earth, SET.ENERGY));
const earthRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 4, 32), glow(0.5, 1.6, 2.6, { transparent: true })); galaxy.g.add(tag(earthRing, SET.ENERGY));
const WORLDS = [[0.75, 1.6, 2.0], [0.3, 0.9, 2.3], [1.6, 1.8, 2.2], [1.6, 1.0, 0.5]].map((c, i) => { const p = makeHoloPlanet(0.42, c, i); inside.add(p.g); return p; });
const holoLight = new THREE.PointLight(0x66e8ff, 0, 30, 1.2); holoLight.position.set(0, 5, 0); inside.add(holoLight);
const redLight = new THREE.PointLight(0xff2a3a, 0, 12, 1.5); redLight.position.set(0, 2.6, 0); inside.add(redLight);
const inHemi = new THREE.HemisphereLight(0x6a7ad0, 0x18142c, 1.5); inside.add(inHemi);
const inKey = new THREE.SpotLight(0xb4c8ff, 30, 50, 0.5, 0.6, 1.2); inKey.position.set(-6, 14, 8); inKey.target.position.set(0, 0, 0); inKey.castShadow = true; inside.add(inKey, inKey.target);
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 15, 24, 1, true), glow(0.2, 0.7, 0.9, { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
shaft.position.set(0, 7.5, 12); inside.add(tag(shaft, SET.ENERGY, true));
const lift2 = lift.clone(); inside.add(lift2);

// =====================================================================
// HERO + PIXEL
// =====================================================================
const hero = makeHero(); scene.add(hero.root); hero.headLight.intensity = 10;
const pixel = makeSkitterling(1); scene.add(pixel.g);
const ENTER = v3(0, 0, 12), ALTAR = v3(0, 0, 1.25);
function devState(t) {
  const S = { x: HP.x, z: HP.z, y: 0, rotY: PI + 0.12, walk: 0, run: 0, phase: 0, crouch: 0, lookUp: 0.35, headYaw: 0, armRo: null, armLo: null, lean: 0, scene: 1, inside: false, air: 0 };
  if (t < 8) { S.lookUp = 0.45 - 0.35 * Q(4.4, 6, t); S.headYaw = 0.35 * Math.sin(t * 0.6); }
  else if (t < 20) {
    S.scene = 2;
    const k = Q(12.6, 19.2, t), p0 = SHORE, p1 = P2(C.x, C.z + 1.1);
    S.x = lerp(p0.x, p1.x, k); S.z = lerp(p0.z, p1.z, k); S.rotY = PI; S.walk = Q(12.6, 12.9, t) * (1 - Q(18.9, 19.2, t)); S.phase = k * 12.5 / 0.52 * PI;
    S.lookUp = 0.1 * (1 - Q(12, 13, t)) - 0.2 * Q(16, 18, t);
    if (Math.hypot(S.x - C.x, S.z - C.z) < 2.0) S.y = 0.35;                        // standing on the lift
    if (t > 19.2) { S.y -= 1.2 * Q(19.4, 20, t); }                                // the lift starts to sink
  } else {
    S.inside = true; S.scene = t < 34 ? 3 : t < 50 ? 4 : t < 62 ? 5 : t < 76 ? 6 : t < 88 ? 7 : 8;
    const desc = 1 - Q(20, 23.4, t);
    const k = Q(23.8, 33.6, t), x = 0, z = lerp(ENTER.z, ALTAR.z, k);
    S.x = x; S.z = z;
    S.y = t < 23.8 ? desc * 13 + 0.25 : (Math.abs(z - ENTER.z) < 2.0 ? 0.25 : 0) + altarH(Math.abs(z));
    S.rotY = PI; S.walk = Q(23.8, 24.2, t) * (1 - Q(33.2, 33.6, t)); S.phase = k * 10.75 / 0.48 * PI;
    S.lookUp = 0.45 * Q(21, 23, t) * (1 - Q(25, 27, t)) + 0.2 * Math.max(0, Math.sin((t - 24) * 0.5)) * (1 - Q(32, 33, t));
    S.headYaw = 0.5 * Math.sin((t - 24) * 0.45) * Q(24, 25, t) * (1 - Q(32.5, 33.5, t));
    if (t > 34) {
      const reach = Q(35.4, 36.6, t) * (1 - Q(39.5, 40.5, t));
      S.armRo = { x: -1.05, z: -0.05, ex: -0.35, w: reach }; S.lean = 0.12 * reach;
      S.lookUp = 0.75 * Q(37.5, 40, t) * (1 - Q(49, 51, t)) - 0.25 * reach;
      S.headYaw = 0.25 * Math.sin(t * 0.3) * Q(40, 42, t);
    }
    if (t > 50) S.lookUp = 0.55 * (1 - Q(60, 62, t)) + 0.35 * Q(62.5, 64, t) * (1 - Q(75, 77, t));
    if (t > 76) { S.lookUp = -0.35 * Q(76.5, 77.5, t); S.headYaw = 0.3 * Q(76.5, 77.5, t) * (1 - Q(80.5, 81.5, t)); }
    if (t > 80.6) {                                                                      // kneels by the print
      S.crouch = Q(80.8, 82.0, t) * (1 - Q(88.2, 89.6, t)); S.lookUp = -0.55 * S.crouch;
      S.rotY = PI + 0.7 * Q(80.6, 81.6, t); S.headYaw = 0;
      S.armRo = { x: -0.8, z: -0.1, ex: -0.4, w: Q(83.5, 84.5, t) * (1 - Q(87.5, 88.5, t)) };
    }
    if (t > 89) { S.rotY = lerpAng(PI + 0.7, 0.1, Q(89.6, 91.4, t)); S.lookUp = 0.4 * Q(91.4, 93.5, t); }
  }
  return S;
}
const FOOT = footsteps(devState, EP.duration, S => ({ inside: S.inside, x: S.x, z: S.z, rotY: S.rotY }));
// his prints in the dust once he's on the top step
const myPrints = FOOT.filter(f => f.inside && Math.abs(f.z) < 2.0).map((f, i) => {
  const m = new THREE.Mesh(PRINT, myPrint); const side = i % 2 ? 1 : -1;
  m.position.set(f.x + Math.cos(f.rotY) * side * 0.12, 0.756, f.z - Math.sin(f.rotY) * side * 0.12); m.rotation.y = f.rotY; inside.add(tag(m, SET.ROCK)); return { m, t: f.t };
});
// pillar glyph bands light up as he passes (time when he is level with each pillar)
for (const p of PILLARS) { p.t = 999; for (let t = 23.5; t < 34; t += 1 / 60) { if (devState(t).z <= p.z + 0.4) { p.t = t; break; } } }

window.AUDIO_META = {
  foot: FOOT.map(f => ({ t: f.t, water: false })),
  chimes: PILLARS.filter(p => p.t < 900).sort((a, b) => a.t - b.t).map((p, i) => ({ t: +p.t.toFixed(3), note: [0, 2, 4, 2, 5, 4, 7, 5, 9, 7, 12, 9][i] })),
};

// =====================================================================
// TIMELINE
// =====================================================================
const look = new THREE.Vector3();
const VISOR = [[63.0, 75.6, 'KEYS LOCATED  3 / 4\n▸ GLASS  ▸ OCEAN  ▸ ICE\n▸ ????  SIGNAL LOST'], [41.0, 49.6, 'STAR MAP · VAELOR\nGALAXIES  2,114,880\nMATCH:  SOL  ▮▮▮▮▯']];
const hud = makeHud(EP, { visor: VISOR });

function update(t) {
  const S = devState(t);
  const inT = S.inside;
  outside.visible = !inT; inside.visible = inT;
  scene.fog.color.set(inT ? 0x0c0b1e : 0x30297a); scene.fog.near = inT ? 20 : 70; scene.fog.far = inT ? 90 : 700;
  const base = inT ? HALL : v3(0, 0, 0);
  const gy = inT ? 0 : H(S.x, S.z);
  // ---- hero ----
  poseHero(hero, S, t);
  hero.root.position.set(base.x + S.x, base.y + gy + S.y, base.z + S.z); hero.root.rotation.set(0, S.rotY, 0); hero.root.updateMatrixWorld(true);
  const a = hero.root.position, head = hero.head.getWorldPosition(new THREE.Vector3());
  const fwd = v3(Math.sin(S.rotY), 0, Math.cos(S.rotY)), right = v3(Math.cos(S.rotY), 0, -Math.sin(S.rotY));
  hero.cyanMat.color.setRGB(0.35, 1.6, 1.8).multiplyScalar(1 + (t > 76.6 && t < 80.6 && Math.sin(t * 40) > 0 ? 1.0 : 0));
  // ---- Pixel on his shoulder; hides in the pocket when the light turns red ----
  {
    const sh = hero.shoulderL.getWorldPosition(new THREE.Vector3()), pk = hero.pocket.getWorldPosition(new THREE.Vector3());
    const hide = Q(77, 77.8, t) * (1 - Q(91, 92.5, t));
    pixel.g.position.copy(sh).lerp(pk, hide); pixel.g.rotation.set(0, S.rotY + 0.4 * Math.sin(t * 0.7) * (1 - hide), 0);
    pixel.g.scale.setScalar(0.55 - 0.2 * hide);
    poseSkitterling(pixel, { curl: hide, eyeOpen: (t % 3.9) < 0.12 ? 0.1 : 1, look: Math.sin(t * 0.9) * 0.5, t });
    pixel.stripe.color.setRGB(0.3, 1.7, 1.9).multiplyScalar(1 + 0.6 * Math.sin(t * 3) * Q(36.6, 38, t) * (1 - Q(50, 52, t)));
    pixel.g.visible = hide < 0.95;
  }

  // ---- outside: lake drains, glyph ring lights, lift sinks ----
  if (!inT) {
    const U = lake.material.uniforms; U.uTime.value = t;
    const drain = Q(8.8, 13.6, t); U.uHole.value = drain * 13.5;
    lake.position.y = WATER_Y - 0.6 * drain; lake.visible = drain < 0.999;
    bedMat.emissiveIntensity = 0.2 + 1.4 * Q(11, 13.5, t) + 0.6 * Math.max(0, Math.sin(t * 2)) * Q(13.5, 15, t);
    bedMat.opacity = Q(9.5, 11.5, t);
    const sink = t > 19.4 ? 1.2 * Q(19.4, 20, t) : 0;
    lift.position.set(C.x, H(C.x, C.z) + 0.1 - sink, C.z);
    liftRing.material.color.setRGB(0.4, 1.6, 2.0).multiplyScalar(0.3 + 1.6 * Q(12, 14, t) + 1.5 * Q(18.6, 19.4, t));
    liftLight.position.set(C.x, H(C.x, C.z) + 2, C.z); liftLight.intensity = 20 * Q(11, 14, t);
    armada.set(1, t + 101);                                                            // continues from Ep 3's ending
    sky.ringMat.uniforms.uGain.value = 0.55; sky.ringMat.uniforms.uRed.value = 1; sky.planetMat.uniforms.uDim.value = 0.7;
    hemi.color.setRGB(0.6, 0.3, 0.6);
    moon.target.position.copy(a); moon.position.copy(a).add(v3(-35, 45, -60)); rimL.target.position.copy(a); rimL.position.copy(a).add(v3(30, 12, 40));
    const gu = grass.uniforms; gu.uTime.value = t; gu.uGust.value = 0.9;
    gu.uPush.value[0].set(a.x, a.z, 1.1, 1); for (let i = 1; i < 4; i++) gu.uPush.value[i].set(0, 0, 0, 0); gu.uWave.value.set(0, 0, 0, 0);
    if (S.scene === 1) gu.uPush.value[1].set(a.x - 1.4, a.z - 3.0, 2.0, 1.4);
  }

  // ---- inside ----
  if (inT) {
    lift2.position.set(0, (1 - Q(20, 23.4, t)) * 13, 12);
    shaft.visible = false;
    for (const p of PILLARS) p.mat.emissiveIntensity = 0.3 + 2.2 * pulse(t, p.t, 0.6) + 0.5 * Q(36.6, 38, t) * (1 - Q(76, 78, t));
    for (const m of gm) { m.emissiveIntensity = 0.3 + 0.8 * Q(36.6, 39, t) * (1 - Q(76, 78, t)); m.emissive.setRGB(0.33, 0.9, 1.0).lerp(new THREE.Color(1.0, 0.15, 0.2), Q(76.6, 77.6, t) * (1 - Q(95, 99, t) * 0)); }
    hall.floorMat.emissiveIntensity = 0.12 + 0.6 * pulse(t, 36.6, 0.5) + 0.3 * Q(36.6, 38, t);
    // galaxy blooms, the camera dives to the edge, then it folds away into the four worlds
    const bloom = Q(36.6, 40.5, t) * (1 - Q(61, 63.5, t));
    galaxy.g.visible = bloom > 0.01; galaxy.set(t, bloom, 0.05); galaxy.g.rotation.y = -0.1;
    const e = galaxy.edge(t), ke = clamp01(bloom * 1.6 - 0.612); earth.position.copy(e).multiplyScalar(0.2 + 0.8 * ke);
    earth.visible = t > 50.5 && bloom > 0.5; earthRing.position.copy(earth.position); earthRing.lookAt(camera.position);
    const er = 0.08 + ((t * 0.8) % 1) * 0.18; earthRing.scale.setScalar(er / 0.2); earthRing.material.opacity = 1 - (t * 0.8) % 1; earthRing.visible = earth.visible;
    holoLight.intensity = 30 * bloom + 12 * Q(62, 64, t) * (1 - Q(76, 78, t));
    WORLDS.forEach((w, i) => {
      const on = Q(63 + i * 0.6, 64 + i * 0.6, t);
      const ang = i * PI / 2 + PI / 4 + t * 0.12, r = 2.3;
      w.g.visible = on > 0.01; w.g.position.set(Math.sin(ang) * r, 3.4 + 0.15 * Math.sin(t + i), Math.cos(ang) * r);
      w.g.scale.setScalar(0.3 + 0.7 * on); w.U.uT.value = t; w.U.uOn.value = on;
      if (i === 3) { w.U.uDead.value = Q(76.4, 77.0, t); w.g.scale.multiplyScalar(1 - 0.15 * Math.sin(t * 30) * w.U.uDead.value); }
      if (t > 88) w.U.uOn.value = on * (i === 3 ? 1 : 1 - Q(88, 90, t) * 0.7);
    });
    sockets.forEach((s, i) => { s.m.material.color.setRGB(...(i === 3 ? [0.05, 0.03, 0.05] : [0.4, 1.5, 2.0])).multiplyScalar(i === 3 ? 1 : 0.4 + 1.6 * Q(63 + i * 0.6, 64 + i * 0.6, t)); });
    redLight.intensity = 10 * Q(76.6, 77.4, t) * (1 - Q(80.5, 81.8, t)) + 4 * Q(89, 91, t);
    for (const p of myPrints) p.m.visible = t >= p.t;
  }

  // ---- cameras ----
  let pos = v3(0, 0, 0), fov = 58; const Hc = inT ? null : H;
  switch (S.scene) {
    case 1: { const k = Q(0, 8, t);                                              // behind him on the hill: the armada over the lake
      pos = a.clone().addScaledVector(fwd, -2.4 - 0.8 * k).addScaledVector(right, 0.3).add(v3(0, 1.9 + 0.4 * k, 0)); look.set(C.x, H(C.x, C.z) + 8 + 10 * (1 - k), C.z); fov = 62; break; }
    case 2: if (t < 12.6) {                                                    // high over the shore: the water spirals away
        pos = v3(SHORE.x + 3.5, H(SHORE.x, SHORE.z) + 7.5 + 2 * Q(8, 12.6, t), SHORE.z + 6); look.set(C.x, H(C.x, C.z), C.z - 1); fov = 64;
      } else if (t < 16.4) { pos = a.clone().addScaledVector(fwd, -3).addScaledVector(right, 1.2).add(v3(0, 1.6, 0)); look.copy(a).addScaledVector(fwd, 6).add(v3(0, -0.5, 0)); fov = 60; }
      else { pos = v3(C.x + 4.5, H(C.x, C.z) + 2.0, C.z - 5.5); look.copy(a).add(v3(0, 0.6, 0)); fov = 56; }
      break;
    case 3: if (t < 24) { pos = v3(HALL.x + 0.8, 2.2, HALL.z + 4.0); look.copy(a).add(v3(0, 1.0, 0)); fov = 62; }                  // he comes down the shaft
      else if (t < 29) { pos = a.clone().addScaledVector(fwd, -3.2).add(v3(0, 1.0 + 0.6 * Q(24, 29, t), 0)).addScaledVector(right, 0.6); look.copy(a).addScaledVector(fwd, 6).add(v3(0, 3, 0)); fov = 64; }
      else { pos = v3(HALL.x - 7.5, 2.2, a.z + 1.5); look.copy(a).add(v3(0, 1.4, 0)); fov = 56; }
      break;
    case 4: { const k = Q(36.6, 49, t);                                         // crane up and around the blooming galaxy
      const ang = -0.6 + 1.2 * k, r = 6.5 + 3 * k;
      pos = v3(HALL.x + Math.sin(ang) * r, 2.0 + 5.5 * k, HALL.z + Math.cos(ang) * r); look.set(HALL.x, 1.6 + 4.6 * Q(37, 41, t), HALL.z); fov = 62 + 6 * k;
      if (t < 36.6) { pos = a.clone().addScaledVector(fwd, 1.6).addScaledVector(right, 0.9).add(v3(0, 1.3, 0)); look.copy(a).addScaledVector(fwd, -0.5).add(v3(0, 1.4, 0)); fov = 54; }
      break; }
    case 5: if (t < 58.4) {                                                     // dive along the arm to the edge: Earth
        const e = earth.getWorldPosition(new THREE.Vector3()), from = v3(HALL.x, 13, HALL.z + 9), to = e.clone().add(v3(0.35, 0.25, 0.9));
        const k = ease(Q(50, 54.6, t)); pos = from.clone().lerp(to, k); look.copy(v3(HALL.x, 6.2, HALL.z).lerp(e, Q(50, 53, t))); fov = 58 - 14 * k;
      } else { pos = head.clone().addScaledVector(fwd, 0.95).addScaledVector(right, 0.25).add(v3(0, 0.05, 0)); look.copy(head).add(v3(0, 0.06, 0)); fov = 40; }
      break;
    case 6: { const k = Q(62, 76, t); pos = v3(HALL.x + 3.8 - 1.2 * k, 2.4 + 0.6 * k, HALL.z + 5.4 - 0.8 * k); look.set(HALL.x, 3.0, HALL.z); fov = 60; break; }
    case 7: if (t < 81.4) { pos = v3(HALL.x - 1.3, PED_TOP + 0.9, HALL.z - 1.5); look.set(HALL.x, PED_TOP + 0.6, HALL.z + 0.3); fov = 50; }   // the scratched socket
      else { const sp = stranger.getWorldPosition(new THREE.Vector3()); pos = sp.clone().add(v3(0.32, 0.62, 0.12)); look.copy(sp).add(v3(0.1, 0, 0.06)); fov = 46; }               // the print + his boot
      break;
    default: { const k = Q(88, 100, t); pos = v3(HALL.x - 2.2, 0.9 + 0.5 * k, HALL.z - 4.2 - 1.5 * k); look.copy(a).add(v3(0, 1.4, 0)).lerp(v3(HALL.x, 7, HALL.z + 12), 0.25); fov = 62; }
  }
  aim(camera, pos, look, Hc, fov);

  postFx(engine, EP, t, { exposure: inT ? 3.0 : 2.9, flashes: [[36.6, 0.25, 4], [76.6, 0.12, 6], [20, 0.3, 6]] });
}

run({ EP, engine, scene, camera, update, hud, dbg: { moonH: H, hero, devState } });
