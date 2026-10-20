// Episode 2 — "The Coil". Dev explores the ring-world; every element reacts to him.
// Deterministic: everything is a pure function of t (seconds).
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { AsciiEngine, SET, tag, smooth, lerp, v3, fbm, hash2, captionAt, clamp01 } from './engine/ascii.js';
import { makeHero, poseHero } from './engine/character.js';
import { makeGrass, makePool, burst } from './engine/fx.js';
import { makeSkitterling, poseSkitterling, makePod, makeMothSwarm, makeDriftback, poseDriftback, makeCrystal } from './engine/creatures.js';

const EP_ID = new URLSearchParams(location.search).get('ep') || '02';
const EP = await (await fetch(`./episodes/ep${EP_ID}.json`)).json();
await Promise.all([
  document.fonts.load('800 40px "JetBrains Mono"'), document.fonts.load('600 30px "JetBrains Mono"'),
  document.fonts.load('500 22px "Saira Condensed"'), document.fonts.load('700 50px "Saira Condensed"'),
]);

const engine = new AsciiEngine(document.getElementById('c'), { sceneScale: 0.75, idScale: 0.5 });
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x241246, 120, 1500);
const camera = new THREE.PerspectiveCamera(58, 720 / 1280, 0.05, 6000);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1, ...o });
const glow = (r, g, b, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false, ...o });
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const Q = (a, b, x) => smooth(a, b, x);                      // shorthand
const pulse = (t, t0, k = 3) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);

// =====================================================================
// WORLD
// =====================================================================
const LAKE = { x: 0, z: -58, r: 9 }, WATER_Y = -0.35;
function H(x, z) {
  const base = (fbm(x * 0.05 + 7, z * 0.05) - 0.5) * 1.1;
  const far = Math.hypot(x, (z + 30) * 0.8);
  const hills = (fbm(x * 0.008 + 3, z * 0.008) - 0.5) * 55 * smooth(45, 230, far);
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z) / LAKE.r;
  const lake = dl < 1.5 ? -1.3 * (1 - smooth(0.7, 1.25, dl)) : 0;
  return base + hills + lake;
}
const world = new THREE.Group(); scene.add(world);
{
  // sky: deep blue zenith -> violet -> magenta horizon glow, nebula clouds (palette from the concept art)
  const skyTex = canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    // soft wide horizon glow (was a 2%-tall hard stripe that read as a flat backdrop)
    gr.addColorStop(0, '#040824'); gr.addColorStop(0.26, '#0b1144'); gr.addColorStop(0.38, '#221660'); gr.addColorStop(0.46, '#5a2a86');
    gr.addColorStop(0.5, '#7a3494'); gr.addColorStop(0.54, '#3a1a5a'); gr.addColorStop(1, '#0a0618');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const y = 40 + hash2(i, 43) * 190, r = 30 + hash2(i, 45) * 110;
      const c = [['120,70,230', 0.32], ['200,70,200', 0.26], ['60,110,255', 0.3]][i % 3];
      for (const ox of [-w, 0, w]) {                        // drawn wrapped so the texture seam (u=0/1) matches
        const x = hash2(i, 41) * w + ox, rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, `rgba(${c[0]},${c[1]})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.fillRect(0, 0, w, h);
      }
    }
  });
  world.add(tag(new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false })), SET.SKY));

  // the ring (Coil): bright blue band with white/violet cloud streaks
  const bandTex = canvasTex(2048, 128, (g, w, h) => {
    g.fillStyle = '#7d8fd8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) for (let y = 12; y < h - 12; y += 2) {
      const n = fbm(x * 0.012, y * 0.05, 4), c = fbm(x * 0.02 + 30, y * 0.12, 3);
      let col = n > 0.5 ? (n > 0.6 ? '#3a7aa8' : '#2f9a9a') : '#2456d8';
      if (c > 0.57) col = c > 0.66 ? '#f0f2ff' : '#b49cf4';
      g.fillStyle = col; g.fillRect(x, y, 2, 2);
    }
  });
  bandTex.wrapS = THREE.RepeatWrapping; bandTex.repeat.set(5, 1);
  const halo = new THREE.Mesh(new THREE.CylinderGeometry(1500, 1500, 380, 360, 1, true),
    new THREE.MeshStandardMaterial({ map: bandTex, emissiveMap: bandTex, emissive: 0xffffff, emissiveIntensity: 0.75, side: THREE.DoubleSide, roughness: 1, fog: false }));
  halo.position.set(-200, -380, -2650); halo.rotation.set(1.33, 0, -0.32); world.add(tag(halo, SET.PLANET));
  const m1 = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), std(0x9fb6ff, { emissive: 0x2a3a7a, emissiveIntensity: 0.6, fog: false }));
  m1.position.set(-700, 900, -2300); world.add(tag(m1, SET.PLANET));
  const m2 = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 12), std(0xd8c8ff, { emissive: 0x4a3a8a, emissiveIntensity: 0.6, fog: false }));
  m2.position.set(900, 650, -2400); world.add(tag(m2, SET.PLANET));

  // ground
  const geo = new THREE.PlaneGeometry(1600, 1600, 260, 260); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, cols = [], a = new THREE.Color(0x123a52), b = new THREE.Color(0x2c1a5e), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); p.setY(i, H(x, z));
    c.copy(a).lerp(b, smooth(0.35, 0.65, fbm(x * 0.03 + 9, z * 0.03))); cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  ground.receiveShadow = true; world.add(tag(ground, SET.GRASS));

  // far peaks + crystal spires + bioluminescent forest on the left
  for (let i = 0; i < 30; i++) {
    const ang = (i / 30) * Math.PI * 2, d = 380 + hash2(i, 5) * 160;
    const m = new THREE.Mesh(new THREE.ConeGeometry(40 + hash2(i, 6) * 60, 60 + hash2(i, 7) * 120, 5), std(0x1a1840, { flatShading: true, roughness: 1 }));
    m.position.set(Math.cos(ang) * d, H(Math.cos(ang) * d, Math.sin(ang) * d) + 20, Math.sin(ang) * d - 30); world.add(tag(m, SET.ROCK));
  }
  const cMat = std(0x78c8ff, { emissive: 0x1a3a8a, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.3, flatShading: true });
  for (let i = 0; i < 40; i++) {
    const ang = hash2(i, 61) * Math.PI * 2, d = 60 + hash2(i, 63) ** 1.4 * 300;
    const x = Math.sin(ang) * d, z = -Math.abs(Math.cos(ang)) * d - 30;
    const hh = 8 + hash2(i, 65) * (d > 120 ? 70 : 25);
    const m = new THREE.Mesh(new THREE.ConeGeometry(hh * 0.16, hh, 5), cMat);
    m.position.set(x, H(x, z) + hh * 0.42, z); m.rotation.set((hash2(i, 67) - 0.5) * 0.4, hash2(i, 69) * 3, (hash2(i, 71) - 0.5) * 0.4);
    world.add(tag(m, SET.METAL));
  }
  const trunk = std(0x141838), canopy = std(0x1a1e52, { emissive: 0x120a3a, emissiveIntensity: 0.6, flatShading: true }), spot = glow(0.4, 1.2, 1.6);
  for (let i = 0; i < 32; i++) {
    const x = -24 - hash2(i, 81) * 30, z = -28 - hash2(i, 83) * 50, hh = 6 + hash2(i, 85) * 9;
    const tg = new THREE.Group(); tg.position.set(x, H(x, z), z);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, hh, 6), trunk); tr.position.y = hh / 2; tg.add(tr);
    const cn = new THREE.Mesh(new THREE.SphereGeometry(2.5 + hash2(i, 87) * 2, 10, 6), canopy); cn.position.y = hh; cn.scale.y = 0.45; tg.add(cn);
    for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), spot); s.position.set((hash2(i, k) - 0.5) * 3, hh - 0.6, (hash2(i, k + 5) - 0.5) * 3); tg.add(s); }
    world.add(tag(tg, SET.METAL)); s_tag(tg, spot);
  }
  function s_tag(grp, mat) { grp.traverse(o => { if (o.isMesh && o.material === mat) o.userData.set = SET.ENERGY; }); }

  // lights
  const sun = new THREE.DirectionalLight(0xffc7ea, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 300 });
  const rim = new THREE.DirectionalLight(0x9fb2ff, 1.4); rim.position.set(-20, 15, 40);
  world.add(sun, sun.target, rim, new THREE.HemisphereLight(0x8a7cff, 0x24365a, 1.1));
  world.userData.sun = sun;
}

// reactive grass with glowing tips (not in the lake)
const grass = makeGrass({ area: [-16, 16, -56, 8], density: 26, heightFn: H, colA: 0x1f9fae, colB: 0x6a3ce0, tall: 0.62, tipFrac: 0.12,
  mask: (x, z) => Math.hypot(x - LAKE.x, z - LAKE.z) > LAKE.r * 1.06 });
grass.mesh.userData.noId = true;      // same glyph set as the ground under it -> skip in the ID pass
world.add(grass.mesh);

// mirror lake with ripples + something moving underneath
const waterShader = {
  name: 'RippleWater',
  uniforms: {
    color: { value: new THREE.Color(0xc4ccff) }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uTime: { value: 0 }, uRip: { value: [...Array(10)].map(() => new THREE.Vector4()) }, uShadow: { value: new THREE.Vector4() },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
    void main(){ vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform vec3 color; uniform sampler2D tDiffuse; uniform float uTime; uniform vec4 uRip[10]; uniform vec4 uShadow;
    varying vec4 vUv; varying vec3 vW;
    void main(){
      float h = 0.0;
      for (int i = 0; i < 10; i++) { vec4 r = uRip[i]; if (r.w <= 0.0) continue; float age = uTime - r.z; if (age < 0.0) continue;
        float d = length(vW.xz - r.xy), front = age * 1.7;
        h += sin((d - front) * 7.0) * exp(-abs(d - front) * 1.5) * exp(-age * 0.6) * r.w; }
      h += sin(vW.x * 1.7 + uTime * 1.3) * 0.04 + sin(vW.z * 2.3 - uTime * 1.1) * 0.04;
      vec4 uv = vUv; uv.xy += vec2(h * 0.07, h * 0.05) * uv.w;
      vec3 c = texture2DProj(tDiffuse, uv).rgb * color + vec3(0.01, 0.012, 0.035);
      c += vec3(0.25, 0.5, 0.9) * max(h, 0.0) * 0.45;
      if (uShadow.w > 0.0) {
        vec2 q = vW.xz - uShadow.xy;
        float e = length(vec2(q.x / (uShadow.z * 1.9), q.y / (uShadow.z * 0.7)));
        c *= 1.0 - smoothstep(1.0, 0.35, e) * uShadow.w * 0.85;
        for (int k = 0; k < 5; k++) { vec2 sp = vec2((float(k) - 2.0) * uShadow.z * 0.6, sin(float(k) * 1.7) * 0.4);
          c += vec3(0.2, 0.9, 1.3) * exp(-dot(q - sp, q - sp) * 2.5) * uShadow.w; }
      }
      gl_FragColor = vec4(c, 1.0);
    }`,
};
const lake = new Reflector(new THREE.CircleGeometry(LAKE.r * 1.12, 72), { clipBias: 0.003, textureWidth: 270, textureHeight: 480, shader: waterShader });
lake.rotation.x = -Math.PI / 2; lake.position.set(LAKE.x, WATER_Y, LAKE.z); world.add(tag(lake, SET.SKY));
{ const orig = lake.onBeforeRender; lake.onBeforeRender = function (...a) { if (!engine.inIdPass) orig.apply(this, a); }; }

// ambient floating spores + pod spore puffs
const sporePool = makePool(220, new THREE.IcosahedronGeometry(1, 0), glow(0.35, 1.3, 1.1), SET.ENERGY); world.add(sporePool.mesh);
const puffPool = makePool(700, new THREE.IcosahedronGeometry(1, 0), glow(1.6, 0.4, 1.5), SET.ENERGY); world.add(puffPool.mesh);

// =====================================================================
// HERO + PATH
// =====================================================================
const hero = makeHero(); scene.add(hero.root);
function heroState(t) {
  const S = { x: 0, z: 0, rotY: Math.PI, walk: 0, crouch: 0, lookUp: 0, armRo: null, armLo: null, headYaw: 0, scene: 0 };
  if (t < 8) { S.scene = 1; S.z = 2.6 - 0.72 * t; S.walk = 1; }
  else if (t < 20) { S.scene = 2; S.z = -3.16 - 0.74 * (t - 8); S.x = Math.sin(t * 0.3) * 0.2; S.walk = 1; S.lookUp = 0.3 * Q(9, 11, t) * (1 - Q(17, 19, t)); }
  else if (t < 35) {
    S.scene = 3; S.z = -12 - 0.93 * (t - 20); S.x = 0.12; S.walk = 1;
    const w = Q(20.6, 21.4, t) * (1 - Q(33.8, 34.6, t));
    S.armRo = { x: -0.3 + Math.sin(t * 2.2) * 0.06, z: -1.0, ex: -0.2, w }; S.headYaw = -0.3 * w;
  } else if (t < 50) {
    S.scene = 4;
    if (t < 43.8) { S.z = -26 - 1.1 * (t - 35); S.walk = 1; }
    else if (t < 48.3) { S.z = -35.68 + 0.18 * Q(43.85, 44.3, t); S.walk = 0; }
    else { S.z = -35.5 - 1.1 * (t - 48.3); S.walk = Q(48.3, 48.7, t); }
    const up = Q(43.8, 44.05, t) * (1 - Q(44.7, 45.2, t)), wipe = Q(45.2, 45.6, t) * (1 - Q(47.7, 48.2, t));
    S.armRo = up > 0.001 ? { x: -2.0, z: -0.35, ex: -1.1, w: up } : { x: -2.25, z: 0.25 + 0.42 * Math.sin((t - 45.2) * 6), ex: -1.75, w: wipe };
    S.armLo = { x: -2.0, z: 0.35, ex: -1.1, w: up };
    S.lookUp = 0.25 * up - 0.1 * wipe;
  } else if (t < 65) {
    S.scene = 5;
    S.z = t < 51.8 ? -37.6 - 1.1 * (t - 50) : -39.58; S.walk = t < 51.8 ? 1 : 0;
    S.crouch = Q(51.8, 53.3, t) * (1 - Q(63.4, 64.9, t));
    S.armRo = { x: -0.95, z: -0.12, ex: -0.35 - 0.7 * Q(63.4, 64.9, t), w: Q(53.6, 54.8, t) };
    S.lookUp = -0.35 * S.crouch - 0.2 * Q(63.4, 64.9, t);
  } else if (t < 80) {
    S.scene = 6;
    if (t < 71.2) { S.z = -41 - 1.19 * (t - 65); S.walk = 1; }
    else { S.z = -48.38 - 1.22 * Q(71.2, 72.4, t); S.walk = 1 - Q(72.0, 72.5, t); }
    S.lookUp = 0.15 * Q(69, 71, t);
  } else if (t < 92) { S.scene = 7; S.z = -49.6; S.lookUp = Q(80.3, 82, t); S.headYaw = -0.25 * Q(84, 88, t); }
  else {
    S.scene = 8; S.z = -49.6; S.lookUp = 0.9 * (1 - Q(92, 93.5, t)) - 0.1 * Q(99.4, 100, t);
    S.headYaw = 0.55 * Q(95, 96.5, t) * (1 - Q(99.3, 99.9, t)); S.rotY = Math.PI + 0.3 * Q(95.5, 97.5, t);
  }
  S.phase = (2.6 - S.z) / 0.52 * Math.PI;
  return S;
}
const FOOT = [], scan = (fn) => { for (let t = 0; t < EP.duration; t += 1 / 240) fn(t, heroState(t)); };
{ let prev = null; scan((t, S) => {
  if (S.walk < 0.4) { prev = null; return; }
  const k = Math.floor(S.phase / Math.PI);
  if (prev !== null && k !== prev) { const side = k % 2 ? 1 : -1; FOOT.push({ t, x: S.x + Math.cos(S.rotY) * side * 0.12, z: S.z - Math.sin(S.rotY) * side * 0.12, i: FOOT.length }); }
  prev = k; }); }
const inLake = (x, z) => Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r;

// =====================================================================
// INTERACTIVE ELEMENTS
// =====================================================================
// S3 crystals along the right side of the path: light + chime when his hand brushes them
const CRYS = [];
for (let i = 0; i < 8; i++) {
  const z = -13.5 - 1.5 * i, c = makeCrystal(1.5 + hash2(i, 2) * 0.8, i + 3);
  c.g.position.set(0.98 + (hash2(i, 4) - 0.5) * 0.15, H(0.98, z), z); world.add(c.g);
  let tt = 0; scan((t, S) => { if (!tt && S.scene === 3 && S.z <= z + 0.15) tt = t; });
  CRYS.push({ ...c, z, t: tt || 999 });
}
for (let i = 0; i < 26; i++) {                                // non-interactive crystal clutter
  const side = i % 2 ? 1 : -1, x = side * (2.6 + hash2(i, 31) * 7), z = -8 - hash2(i, 33) * 40;
  if (inLake(x, z) || z < -40) continue;
  const c = makeCrystal(1.2 + hash2(i, 35) * 2.8, 40 + i); c.g.position.set(x, H(x, z), z); c.ring.visible = false; world.add(c.g);
}

// S4 bellflower pods: inflate as he nears, puff spores as he passes; one puffs into his visor
const POD_DEF = [[-1.35, -27.5, 2.0], [1.6, -29.3, 2.4], [-1.8, -31.1, 2.6], [1.45, -32.9, 2.0], [-2.6, -34.0, 2.8], [-0.85, -36.25, 1.25], [1.9, -36.8, 2.3], [2.8, -30.5, 2.9]];
const PODS = POD_DEF.map(([x, z, h], i) => {
  const p = makePod(h, i); p.g.position.set(x, H(x, z), z); world.add(p.g);
  let tp = 999; if (i === 5) tp = 43.8; else scan((t, S) => { if (tp === 999 && S.scene === 4 && S.z <= z) tp = t; });
  return { ...p, x, z, tp, face: i === 5 };
});
const visorSpores = [];
for (let i = 0; i < 26; i++) {
  const az = (hash2(i, 51) - 0.5) * 1.2, el = (hash2(i, 53) - 0.4) * 0.8, R = 0.174;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.009 + hash2(i, 55) * 0.008, 6, 4), glow(1.8, 0.5, 1.6));
  m.position.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R + 0.005, Math.cos(az) * Math.cos(el) * R);
  hero.head.add(tag(m, SET.ENERGY)); visorSpores.push({ m, u: (az + 0.6) / 1.2 });
}

// skitterlings: Pixel (watcher -> friend), the S5 herd, the S8 stampede
const pixel = makeSkitterling(1); world.add(pixel.g);
const HERD = [...Array(20)].map((_, i) => { const c = makeSkitterling(10 + i); world.add(c.g); return { c, a: 0.3 + hash2(i, 61) * 2.6, r: 1.4 + hash2(i, 63) * 2.8, h: hash2(i, 65) }; });
const FLEE = [...Array(12)].map((_, i) => { const c = makeSkitterling(40 + i); world.add(c.g); return { c, x0: -7 + hash2(i, 71) * 4, z0: -45.5 - hash2(i, 73) * 3.2, h: hash2(i, 75) }; });

// lumen-moths and driftbacks
const MOTHS = 60, moths = makeMothSwarm(MOTHS); world.add(moths.g);
const dbA = makeDriftback(), dbB = makeDriftback(); world.add(dbA.g, dbB.g);
const shadowTex = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
const dbShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.6 }));
world.add(tag(dbShadow, SET.GRASS, true));

// audio cues exported for audio.py (render.mjs writes them next to the video)
window.AUDIO_META = {
  foot: FOOT.map(f => ({ t: +f.t.toFixed(3), water: inLake(f.x, f.z) })),
  chimes: CRYS.map((c, i) => ({ t: +c.t.toFixed(3), note: [0, 2, 4, 7, 9, 7, 4, 12][i] })),
  puffs: PODS.filter(p => p.tp < 900).map(p => ({ t: +p.tp.toFixed(3), face: p.face })),
};

// =====================================================================
// TIMELINE
// =====================================================================
const look = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const vis = (o, on) => { o.visible = on; };
function placeCritter(c, x, z, rotY, opts, yOff = 0, scale = 1) {
  c.g.position.set(x, H(x, z) + yOff, z); c.g.rotation.set(0, rotY, 0); c.g.scale.setScalar(scale); poseSkitterling(c, opts);
}
function dbPos(which, t) {
  if (which === 0) {
    if (t < 20) return { p: v3(-420 + (t - 8) * 6, 190, -820), on: t >= 8, dir: v3(1, 0, 0) };
    const k = (t - 80) / 13; return { p: v3(90, 62, -80).lerp(v3(-90, 56, -62), k), on: t >= 80, dir: v3(-180, -6, 18).normalize() };
  }
  const k = (t - 80.8) / 13; return { p: v3(120, 80, -120).lerp(v3(-70, 74, -100), k), on: t >= 80, dir: v3(-190, -6, 20).normalize() };
}

function update(t) {
  const S = heroState(t);
  const silence = Q(92, 92.6, t) * (1 - Q(99.4, 100.5, t));
  // ---- hero ----
  poseHero(hero, S, t);
  hero.root.position.set(S.x, H(S.x, S.z), S.z); hero.root.rotation.set(0, S.rotY, 0);
  hero.root.updateMatrixWorld(true);
  const a = hero.root.position;
  hero.headLight.intensity = S.scene >= 6 ? 26 : 8;
  const speak = t > 100 && t < 104.3 ? (Math.sin(t * 40) > 0 ? 3 : 1) : 1;
  hero.cyanMat.color.setRGB(0.35, 1.6, 1.8).multiplyScalar(speak);
  const head = hero.head.getWorldPosition(tmp.set(0, 0, 0)).clone();
  const hand = hero.handR.getWorldPosition(tmp2.set(0, 0, 0)).clone();

  // ---- scene visibility (keeps draw calls low) ----
  for (const c of CRYS) vis(c.g, S.scene <= 4);
  for (const p of PODS) vis(p.g, S.scene >= 3 && S.scene <= 5);
  for (const h of HERD) vis(h.c.g, S.scene === 5);
  for (const f of FLEE) vis(f.c.g, S.scene === 8);
  vis(lake, S.scene >= 5);

  // ---- S3 crystals ----
  for (const c of CRYS) {
    const k = pulse(t, c.t, 1.1);
    c.mat.emissive.setRGB(0.1, 0.29, 0.63).lerp(new THREE.Color(0.5, 1.4, 1.8), Math.min(1, k * 1.2));
    c.mat.emissiveIntensity = 0.5 + 2.5 * k;
    const age = t - c.t; c.ring.visible = age > 0 && age < 2.5;
    if (c.ring.visible) { const r = 0.3 + age * 1.6; c.ring.scale.set(r, r, r); c.ring.material.opacity = 1 - age / 2.5; }
  }
  // ---- S4 pods ----
  const puffs = [];
  PODS.forEach((p, i) => {
    const d = Math.hypot(a.x - p.x, a.z - p.z);
    const inflate = 0.55 + 0.45 * Q(4.2, 1.8, d) + 0.05 * Math.sin(t * 1.3 + i) + 0.15 * pulse(t, p.tp, 2);
    p.bulb.scale.setScalar(inflate);
    p.coreMat.color.setRGB(1.6, 0.4, 1.4).multiplyScalar(0.5 + 0.5 * Q(4.2, 1.8, d) + 2.5 * pulse(t, p.tp, 2.5));
    p.g.rotation.z = Math.sin(t * 0.8 + i) * 0.03;
    const mouth = p.bulb.localToWorld(p.mouth.clone());
    if (p.face) {
      const dir = Math.atan2(head.x - mouth.x, head.z - mouth.z);
      burst(puffs, t, { t0: p.tp, tStagger: 0.25, x: mouth.x, z: mouth.z, y: mouth.y, count: 90, seed: 300 + i, dir, spread: 0.8, hs: [1.0, 2.2], vs: [0.0, 0.5], g: 0.25, life: 2.6, size: 0.025 });
    } else burst(puffs, t, { t0: p.tp, tStagger: 0.3, x: mouth.x, z: mouth.z, y: mouth.y, count: 45, seed: 300 + i, hs: [0.1, 0.6], vs: [0.5, 1.4], g: -0.15, life: 3.2, size: 0.03 });
  });
  puffPool.set(puffs);
  const wipe = Q(45.4, 47.6, t);
  for (const s of visorSpores) s.m.visible = S.scene === 4 && t > 43.9 + s.u * 0.12 && t < 48.3 && s.u > wipe;

  // ---- Pixel ----
  if (S.scene === 1) {
    const W = v3(1.0, 0, -0.5);
    const want = Math.atan2(a.x - W.x, a.z - W.z), body = lerp(0.95, want, Q(4.6, 6.4, t));
    placeCritter(pixel, W.x, W.z, body, { eyeOpen: Q(0.9, 1.5, t), look: clamp01(1 - Q(4.6, 6.4, t)) * Math.max(-0.7, Math.min(0.7, want - body)), t }, 0, 1.35);
    vis(pixel.g, true);
  } else if (S.scene === 5) {
    const start = v3(1.0, 0, -40.8), groundUnder = v3(hand.x, 0, hand.z + 0.08);
    vis(pixel.g, t > 55);
    if (t < 58.4) {
      const k = Q(55.6, 58.4, t), x = lerp(start.x, groundUnder.x, k), z = lerp(start.z, groundUnder.z, k);
      placeCritter(pixel, x, z, Math.atan2(groundUnder.x - start.x, groundUnder.z - start.z), { walk: Q(55.5, 55.9, t) * (1 - Q(58.1, 58.4, t)), phase: t * 16, curl: 1 - Q(55, 55.6, t), t });
    } else {
      const k = Q(58.4, 59.4, t), y0 = H(groundUnder.x, groundUnder.z);
      pixel.g.position.set(lerp(groundUnder.x, hand.x, k), lerp(y0, hand.y + 0.02, k), lerp(groundUnder.z, hand.z, k));
      pixel.g.rotation.set(0, Math.atan2(head.x - hand.x, head.z - hand.z) + 1.1 * Q(59.4, 60.4, t), 0); pixel.g.scale.setScalar(1);
      poseSkitterling(pixel, { walk: 1 - k, phase: t * 14, eyeOpen: t > 61.8 && t < 62.0 ? 0.1 : 1, t });
    }
    pixel.stripe.color.setRGB(0.55, 0.45, 1.7).lerp(new THREE.Color(0.3, 1.7, 1.9), Q(60.2, 61.4, t));
    pixel.rim.color.setRGB(0.3, 0.6, 1.6).lerp(new THREE.Color(0.3, 1.8, 2.0), Q(60.2, 61.4, t));
  } else if (S.scene >= 6) {
    const sh = hero.shoulderL.getWorldPosition(new THREE.Vector3()), pk = hero.pocket.getWorldPosition(new THREE.Vector3());
    const k = Q(93.4, 94.6, t);
    pixel.g.position.copy(sh).lerp(pk, k); pixel.g.rotation.set(0, S.rotY + Math.sin(t * 0.7) * 0.4 * (1 - k), 0);
    pixel.g.scale.setScalar(0.8 * (1 - 0.5 * k)); vis(pixel.g, t < 94.9);
    poseSkitterling(pixel, { curl: k, eyeOpen: (t % 4.1) < 0.12 ? 0.1 : 1, look: Math.sin(t * 0.9) * 0.5, t });
    pixel.stripe.color.setRGB(0.3, 1.7, 1.9).multiplyScalar(1 + 0.8 * Math.sin(t * 3) * Q(80, 82, t) * (1 - silence));
  } else vis(pixel.g, false);

  // ---- S5 herd scatters when he crouches ----
  if (S.scene === 5) for (const [i, h] of HERD.entries()) {
    const ts = 52.0 + h.h * 0.7, run = Math.max(0, Math.min(1.6, t - ts)) * 3.2, hide = Q(ts + 1.2, ts + 2.4, t);
    const ang = h.a + Math.sin(t * 0.4 + i) * 0.3 * (t < ts ? 1 : 0), r = h.r + run;
    const x = a.x + Math.sin(ang) * r, z = a.z - 0.4 + Math.cos(ang) * r;
    const wander = t < ts ? 0.4 + 0.6 * Math.max(0, Math.sin(t * 1.7 + i * 2)) : 1;
    placeCritter(h.c, x, z, t < ts ? h.a + Math.sin(t * 0.9 + i) * 1.2 : ang, { walk: wander * (1 - hide), phase: t * (t < ts ? 9 : 22) + i, curl: hide, eyeOpen: 1, t }, -0.1 * hide, 1.2 + h.h * 0.4);
  }
  // ---- S8 stampede across the shore ----
  if (S.scene === 8) for (const [i, f] of FLEE.entries()) {
    const ts = 95.8 + f.h * 0.9, run = Math.max(0, t - ts) * (3.5 + f.h * 2);
    placeCritter(f.c, f.x0 + run, f.z0 + Math.sin(run * 0.8 + i) * 0.3, Math.PI / 2, { walk: t > ts ? 1 : 0, phase: t * 26 + i, curl: t > ts ? 0 : 1, t }, t > ts ? 0 : -0.08);
  }

  // ---- moths: ambient -> gather around his lamp -> scatter in the silence ----
  const lamp = head.clone().add(v3(Math.sin(S.rotY) * 0.35, 0.1, Math.cos(S.rotY) * 0.35));
  const ml = [];
  for (let i = 0; i < MOTHS; i++) {
    const h1 = hash2(i, 91), h2 = hash2(i, 93), h3 = hash2(i, 95), dir = i % 2 ? 1 : -1;
    const ang = h1 * 6.283 + t * 0.12 * dir, r = 2.4 + h2 * 5;
    const amb = v3(a.x + Math.cos(ang) * r, a.y + 0.6 + h3 * 2.4 + Math.sin(t * 1.1 + i) * 0.2, a.z - 2 + Math.sin(ang) * r);
    const rd = Math.hypot(amb.x - a.x, amb.z - a.z); if (rd < 2.5) { amb.x += (amb.x - a.x) / rd * (2.5 - rd); amb.z += (amb.z - a.z) / rd * (2.5 - rd); }
    const th = t * (1.6 + h2 * 1.6) * dir + i, R = 0.35 + h3 * 0.85 + 0.15 * Math.sin(t * 0.7 + i) + 0.25 * Q(80, 82, t) * Math.max(0, Math.sin(t * 2.1));
    const orb = v3(lamp.x + Math.cos(th) * R, lamp.y + (h1 - 0.5) * 0.9 + 0.12 * Math.sin(t * 2 + i), lamp.z + Math.sin(th) * R);
    const w = Q(68 + h1 * 1.5, 70.5 + h1 * 1.5, t);
    const p = amb.lerp(orb, w);
    let s = 1.7, yaw = th + Math.PI / 2 * dir;
    if (t > 92.4) {
      const k = t - 92.4, oa = h1 * 6.283;
      p.add(v3(Math.cos(oa) * k * 6, k * 1.6, Math.sin(oa) * k * 6)); s *= Math.max(0, 1 - k / 4); yaw = -oa + Math.PI / 2;
    }
    if (t < 68 && i >= 16) s = 0;
    if (S.scene === 1) s = 0;
    ml.push({ x: p.x, y: p.y, z: p.z, yaw, flap: Math.sin(t * 24 + i * 1.3) * 0.9, s });
  }
  moths.set(ml);

  // ---- ambient spores: drift, flee from him, freeze in the silence ----
  const sp = [];
  for (let i = 0; i < 220; i++) {
    const f = 1 - silence * 0.9;
    let x = a.x + (hash2(i, 151) - 0.5) * 22 + Math.sin(t * 0.35 * f + i) * 0.8, z = a.z + 3 - hash2(i, 153) * 22 + Math.cos(t * 0.3 * f + i * 1.3) * 0.8;
    let y = H(x, z) + 0.3 + hash2(i, 155) * 2.8 + Math.sin(t * 0.9 * f + i * 2.1) * 0.25;
    const dx = x - a.x, dz = z - a.z, dl = Math.hypot(dx, dz) + 1e-3, rep = Math.max(0, 2.6 - dl) * 0.9;
    x += dx / dl * rep; z += dz / dl * rep; y += rep * 0.3;
    if (S.scene === 1 || inLake(x, z) && y < WATER_Y + 0.2) continue;
    sp.push({ x, y, z, s: 0.03 + hash2(i, 157) * 0.04 });
  }
  sporePool.set(sp);

  // ---- driftbacks + their shadow ----
  [dbA, dbB].forEach((d, k) => {
    const st = dbPos(k, t); d.g.visible = st.on && (k === 0 ? (t < 20 || t > 80) : t > 80);
    d.g.position.copy(st.p); d.g.rotation.y = Math.atan2(st.dir.x, st.dir.z); poseDriftback(d, t, k * 2);
    d.dotMat.color.setRGB(0.4, 1.4, 2.0).multiplyScalar(1 + 0.6 * Math.sin(t * 2.4 + k));
  });
  { const st = dbPos(0, t); dbShadow.visible = t > 80 && t < 93;
    dbShadow.position.set(st.p.x + 6, H(st.p.x + 6, st.p.z + 26) + 0.06, st.p.z + 26); dbShadow.scale.set(34, 1, 16); dbShadow.rotation.y = 0.12; }

  // ---- lake ripples + underwater shape ----
  {
    const U = lake.material.uniforms; U.uTime.value = t;
    const rip = [];
    for (const f of FOOT) if (inLake(f.x, f.z) && f.t <= t) rip.push([f.x, f.z, f.t, 0.9]);
    for (let tt = 72.6; tt <= t; tt += 1.7) rip.push([a.x, a.z - 0.1, tt, 0.35]);
    for (const tt of [81.5, 84.5, 87.5, 90.5]) if (tt <= t) rip.push([LAKE.x, LAKE.z - 1, tt, 1.0]);
    const shX = (tt) => lerp(-10, 9, Q(73.5, 79.5, tt));
    for (const tt of [75, 76.6, 78.2]) if (tt <= t) rip.push([shX(tt), -61, tt, 0.7]);
    rip.sort((p, q) => q[2] - p[2]);
    for (let i = 0; i < 10; i++) { const r = rip[i]; U.uRip.value[i].set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0, r && t - r[2] < 7 ? r[3] : 0); }
    U.uShadow.value.set(shX(t), -61, 2.6, Q(73.5, 74.6, t) * (1 - Q(78.8, 79.6, t)));
  }

  // ---- grass: legs part it, wind rolls it, the invisible thing carves a trail toward him ----
  const gu = grass.uniforms;
  gu.uTime.value = t; gu.uGust.value = (S.scene === 2 ? 1.6 : 1.0) * (1 - silence * 0.9);
  gu.uPush.value[0].set(a.x, a.z, S.crouch > 0.5 ? 1.6 : 1.2, 1);
  gu.uPush.value[1].set(a.x - Math.sin(S.rotY) * 0.6, a.z - Math.cos(S.rotY) * 0.6, 1.0, 0.8 * S.walk);
  const trail = (tt) => v3(-34, 0, -45).lerp(v3(-3.2, 0, -48.6), Q(94, 101.5, tt));
  const tr0 = trail(t), tr1 = trail(t - 0.5), tOn = S.scene === 8 && t > 94 ? 1.3 : 0;
  gu.uPush.value[2].set(tr0.x, tr0.z, 1.7, tOn); gu.uPush.value[3].set(tr1.x, tr1.z, 1.5, tOn);
  if (S.scene === 1) { gu.uPush.value[2].set(2.05 - t * 0.015, 0.3, 0.9, 1.4); gu.uPush.value[3].set(1.0, -0.5, 0.45, 1.0); }
  if (S.scene === 6 && t >= 71.2) { gu.uPush.value[2].set(a.x - 1.3, a.z + 3.3, 1.8, 1.5); }
  if (S.scene === 7) { gu.uPush.value[2].set(a.x - 1.7, a.z + 3.8, 1.8, 1.5); }
  if (S.scene === 5) { gu.uPush.value[2].set(a.x, a.z - 0.8, 3.2, 1.1); gu.uPush.value[3].set(a.x + 1.8, a.z - 1.6, 1.6, 1.4); }
  if (S.scene === 8 && t < 94) { gu.uPush.value[3].set(a.x + 1.9, a.z + 3.6, 1.8, 1.5); }
  gu.uWave.value.set(0, 0, 0, 0);

  // ---- light follows the action ----
  const sun = world.userData.sun; sun.target.position.copy(a); sun.position.copy(a).add(v3(-40, 30, -45));

  // ---- cameras ----
  camera.fov = 58;
  switch (S.scene) {
    case 1: camera.position.set(2.05 - t * 0.015, H(2.0, 0.3) + 0.26, 0.3); look.set(0.75, H(0.75, -0.8) + 0.44, -0.85); camera.fov = 50; break;
    case 2: { const k = Q(8, 20, t); camera.position.copy(a).add(v3(1.4, 1.3, 3.6).lerp(v3(2.6, 3.4, 8.0), k)); look.copy(a).add(v3(-0.2, 1.4 + 3.2 * k, -5)); break; }
    case 3: camera.position.copy(a).add(v3(-1.8, 1.45, -4.2)); look.copy(a).add(v3(0.55, 1.15, 0.6)); break;
    case 4: { const k = Q(43.2, 44.0, t) * (1 - Q(48.4, 49.5, t));
      camera.position.copy(a).add(v3(0.9, 1.55, -3.4).lerp(v3(0.34, 1.72, -1.45), k)); look.copy(a).add(v3(0, 1.3, 0).lerp(v3(0, 1.66, 0), k)); break; }
    case 5: { const k = Q(53.5, 64, t); camera.position.copy(a).add(v3(2.9, 0.7, -2.7).lerp(v3(2.1, 0.85, -1.9), Q(53, 55, t)).lerp(v3(1.6, 0.8, -1.45), k));
      look.copy(a).add(v3(0, 0.9, 0)).lerp(hand, 0.65 * Q(54, 56, t)); break; }
    case 6: if (t < 71.2) { camera.position.copy(a).add(v3(-1.4, 1.25, 3.6)); look.copy(a).add(v3(0.4, 0.9, -8)); }
      else { camera.position.set(a.x - 1.3, WATER_Y + 1.65, a.z + 3.3); look.set(a.x + 0.35, WATER_Y + 0.9, a.z - 6); } break;
    case 7: { camera.position.copy(a).add(v3(-1.7, 1.5, 3.8)); camera.fov = 66; look.copy(a).add(v3(0, 1.6, -4)).lerp(dbA.g.position, Q(80.2, 82.5, t) * 0.45); break; }
    default:
      if (t >= 99.4 && t < 102.6) { camera.position.copy(a).add(v3(-0.45, 1.74, -1.3)); look.copy(head); }
      else { const k = Q(92, 99, t); camera.position.copy(a).add(v3(1.9, 1.9, 3.6).lerp(v3(1.4, 1.7, 2.9), k)); look.copy(a).add(v3(-1.3, 1.0, -1.5)); }
  }
  camera.position.y = Math.max(camera.position.y, H(camera.position.x, camera.position.z) + 0.1);
  camera.updateProjectionMatrix(); camera.lookAt(look);

  // ---- post fx ----
  const u = engine.u; u.time.value = t; u.exposure.value = 2.5;
  u.flash.value = 0.25 * pulse(t, 43.8, 4) + 0.15 * pulse(t, 100.3, 6);
  u.glitch.value = t > 100.2 && t < 101.6 ? 0.35 : (t > 101.6 && t < 104.2 ? 0.08 : 0);
}

// =====================================================================
// HUD
// =====================================================================
const $ = id => document.getElementById(id);
$('tag').textContent = EP.series; $('title').textContent = EP.title;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const VISOR = 'SUIT LOG · DAY 1\nO2     ▮▮▮▮▮▮▮▯▯▯ 71%\nCOMMS  NO SIGNAL\nLOC    UNKNOWN';
const GLYPHS = 'ΞΣΔΛΠΦΨΩ⌬⟁⟟⊗⊕⋔⌖⍜⍟';
const FINAL = 'YOU. ARE. FAR.';
function hud(t) {
  const c = captionAt(EP.captions, t, 30);
  const cur = c && (c.typing || Math.floor(t * 2.6) % 2 === 0) ? '<span id="cur"></span>' : '';
  $('cap').innerHTML = c ? esc(c.text) + cur : ''; $('cap').style.opacity = c ? c.fade : 0;
  // visor HUD in the suit-log shot
  const vOn = t > 8.8 && t < 19.8, n = Math.floor((t - 8.8) * 40);
  $('visor').textContent = vOn ? VISOR.slice(0, Math.max(0, n)) : '';
  $('visor').style.opacity = vOn ? (1 - Q(19.2, 19.8, t)) * (Math.sin(t * 50) > -0.9 ? 1 : 0.6) : 0;
  // the helmet speaks
  const [g0, g1] = EP.events.glitch_text, gl = $('glitch');
  if (t > g0 && t < g1) {
    const k = Q(g0 + 1.1, g0 + 2.2, t), j = Math.floor(t * 20);
    let s = '';
    for (let i = 0; i < FINAL.length; i++) {
      const resolved = (i / FINAL.length) < k || FINAL[i] === ' ';
      s += resolved ? FINAL[i] : GLYPHS[Math.floor(hash2(i, j) * GLYPHS.length)];
    }
    gl.textContent = s; gl.style.opacity = (1 - Q(g1 - 0.4, g1, t)) * (hash2(j, 3) > 0.1 ? 1 : 0.3);
    const dx = (hash2(j, 1) - 0.5) * 10 * (1 - k * 0.7);
    gl.style.transform = `translateX(${dx}px)`; gl.style.textShadow = `${dx}px 0 #ff2a6d, ${-dx}px 0 #19f0ff, 0 0 18px #0ff`;
  } else gl.style.opacity = 0;
  const [c0] = EP.events.cta;
  $('cta').style.opacity = Q(c0, c0 + 0.3, t); $('cta').textContent = '▶ EP 3 — THE HOLLOW · follow';
  $('tag').style.opacity = 0.85; $('title').style.opacity = 1;
}

window.renderAt = t => { update(t); engine.render(scene, camera); hud(t); };
window.EP = EP; window.__dbg = { engine, scene, camera, moonH: H, FOOT, hero };
window.renderAt(0);
window.READY = true;
