// Open space (Ep 13 flashback, Ep 15 chase, Ep 17-20 Solar System): gas giants, a 1990s-style capsule
// (Mira's Kestrel-4), Hollow raider ships, an asteroid field. Stars come free from the ASCII sky pass
// (anything with no geometry behind it renders as the SKY set with procedural stars).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SET, tag, hash2, fbm } from './ascii.js';

const PI = Math.PI;
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// banded gas giant. bands: css colours top->bottom; spot: [u, v, w, h, colour] storm oval
export function makeGasGiant({ r = 300, bands = ['#d8b890', '#b07850', '#e8d0a8', '#9a6040', '#d0a878', '#f0dcc0', '#a87048', '#c89868'], spot = [0.62, 0.62, 0.07, 0.05, '#c05030'], seed = 0, emissive = 0.08 } = {}) {
  const tex = canvasTex(1024, 512, (g, w, h) => {
    const n = bands.length;
    for (let y = 0; y < h; y++) {
      const v = y / h, wob = Math.sin(v * 40 + seed) * 0.01 + (fbm(v * 9 + seed, 0.5) - 0.5) * 0.04;
      const k = Math.min(n - 1, Math.max(0, Math.floor((v + wob) * n)));
      g.fillStyle = bands[k]; g.fillRect(0, y, w, 1);
    }
    // turbulent streaks along the bands
    for (let i = 0; i < 1400; i++) {
      const x = hash2(i, seed + 1) * w, y = hash2(i, seed + 2) * h, len = 20 + hash2(i, seed + 3) * 120;
      g.strokeStyle = hash2(i, seed + 4) > 0.5 ? 'rgba(255,240,220,0.10)' : 'rgba(60,30,20,0.10)'; g.lineWidth = 1 + hash2(i, 5) * 3;
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y - 3, x + len * 0.6, y + 3, x + len, y); g.stroke();
    }
    if (spot) { const [u, v, sw, sh, c] = spot; g.fillStyle = c; g.beginPath(); g.ellipse(u * w, v * h, sw * w, sh * h, 0, 0, PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,230,200,0.5)'; g.lineWidth = 4; g.stroke(); }
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: emissive, fog: false }));
  return tag(m, SET.PLANET);
}

// rocky/cratered moon or small planet with vertex noise
export function makeRockPlanet({ r = 40, color = 0x8a8a90, detail = 5, rough = 0.06, seed = 0, set = SET.PLANET } = {}) {
  const geo = new THREE.IcosahedronGeometry(r, detail), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); const n = fbm(v.x * 3 + seed, v.y * 3 + v.z * 2) - 0.5; v.multiplyScalar(r * (1 + n * rough)); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  return tag(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, fog: false })), set);
}

// Kestrel-4: a small crewed capsule (original design): conical command module, service module, two solar wings
export function makeCapsule() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.5, metalness: 0.3, flatShading: true });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.4, metalness: 0.6, flatShading: true });
  const panel = new THREE.MeshStandardMaterial({ color: 0x1a2a6a, roughness: 0.3, metalness: 0.5, emissive: 0x0a1030 });
  const cm = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.9, 16), white); cm.position.z = 2.45; cm.rotation.x = PI / 2; g.add(tag(cm, SET.METAL));
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 3.0, 16), grey); sm.rotation.x = PI / 2; g.add(tag(sm, SET.METAL));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.58, 1.58, 0.35, 16), new THREE.MeshStandardMaterial({ color: 0x2a6aa8, roughness: 0.5 })); band.rotation.x = PI / 2; band.position.z = 1.2; g.add(tag(band, SET.SUIT));
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.0, 1.1, 14, 1, true), grey); bell.rotation.x = PI / 2; bell.position.z = -2.0; g.add(tag(bell, SET.METAL));
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), grey); arm.position.set(s * 2.2, 0, -0.4); g.add(tag(arm, SET.METAL));
    const w = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.06, 1.6), panel); w.position.set(s * 5.4, 0, -0.4); g.add(tag(w, SET.METAL));
  }
  const nav = [];
  for (const [x, c] of [[-8, [2.4, 0.2, 0.2]], [8, [0.2, 2.4, 0.4]]]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), fog: false })); l.position.set(x, 0.1, -0.4); g.add(tag(l, SET.ENERGY)); nav.push(l); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 10, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.2, 2.4), transparent: true, opacity: 0.8, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.rotation.x = -PI / 2; flame.position.z = -4.0; g.add(tag(flame, SET.ENERGY, true));
  return { g, nav, flame, set(t, burn = 0) { nav[0].visible = Math.sin(t * 6) > 0; nav[1].visible = Math.sin(t * 6 + 2) > 0; flame.visible = burn > 0.02; flame.scale.set(burn, burn * (0.8 + 0.2 * Math.sin(t * 40)), burn); } };
}

// Hollow raider: a bony dart with spines and a red core. ~14 m long at scale 1, pointing +z
export function makeHollowShip(scale = 1) {
  const bone = new THREE.MeshStandardMaterial({ color: 0x4a3a40, roughness: 0.5, metalness: 0.5, flatShading: true });
  const parts = [];
  const hull = new THREE.ConeGeometry(1.6, 14, 6); hull.rotateX(PI / 2); parts.push(hull.toNonIndexed());
  for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2, s = new THREE.ConeGeometry(0.35, 6 - (i % 2) * 2, 4); s.rotateX(PI / 2 + 0.5); s.translate(0, 0, -2); s.rotateZ(a); s.translate(0, 0, -2); parts.push(s.toNonIndexed()); }
  for (const sx of [-1, 1]) { const w = new THREE.BoxGeometry(7, 0.25, 3); w.translate(sx * 4, 0, -3); w.rotateZ(sx * 0.25); parts.push(w.toNonIndexed()); }
  const g = new THREE.Group(); g.scale.setScalar(scale);
  g.add(tag(new THREE.Mesh(mergeGeometries(parts), bone), SET.METAL));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.15, 0.2), fog: false })); core.position.z = -5.5; g.add(tag(core, SET.ENERGY));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), core.material); eye.position.set(0, 0.6, 4); g.add(tag(eye, SET.ENERGY));
  return { g, core, eye };
}

// tumbling asteroid field around a centre. returns {mesh, set(t, centre)}; positions are deterministic in t
export function makeAsteroids({ n = 400, spread = [300, 80, 600], size = [0.6, 9], seed = 0, color = 0x6a625c } = {}) {
  const base = new THREE.IcosahedronGeometry(1, 1), p = base.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 0.7 + 0.5 * fbm(v.x * 1.7 + 3, v.y * 1.7 + v.z); v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z); }
  base.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(base, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }), n); mesh.frustumCulled = false;
  const R = [...Array(n)].map((_, i) => ({ x: (hash2(i, seed + 1) - 0.5) * spread[0], y: (hash2(i, seed + 2) - 0.5) * spread[1], z: (hash2(i, seed + 3) - 0.5) * spread[2],
    s: size[0] + (size[1] - size[0]) * hash2(i, seed + 4) ** 3, rx: hash2(i, seed + 5) * 6, ry: hash2(i, seed + 6) * 6, w: 0.2 + hash2(i, seed + 7) * 0.8, dx: (hash2(i, seed + 8) - 0.5) * 2 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  function set(t) { R.forEach((r, i) => { e.set(r.rx + t * r.w, r.ry + t * r.w * 0.7, 0); q.setFromEuler(e); pos.set(r.x + r.dx * t, r.y, r.z); sc.setScalar(r.s); mesh.setMatrixAt(i, m4.compose(pos, q, sc)); }); mesh.instanceMatrix.needsUpdate = true; }
  set(0);
  return { mesh: tag(mesh, SET.ROCK), set, rocks: R };
}

// ---------------------------------------------------------------------------
// Earth (Ep 14 memory, Ep 17-20): procedural continents, ice caps, clouds, night-side city lights,
// a thin blue atmosphere shell. lightDir: direction the sunlight comes FROM (world).
// ---------------------------------------------------------------------------
export function makeEarth({ r = 60, seed = 3, lightDir = [1, 0.3, 0.6], cities = 1 } = {}) {
  const W = 1024, H = 512;
  const day = canvasTex(W, H, (g) => {
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W * PI * 2, v = y / H, lat = Math.abs(v - 0.5) * 2;
      const nx = Math.cos(u) * 1.6, nz = Math.sin(u) * 1.6;                     // seamless around the sphere
      const n = fbm(nx + seed, nz + v * 3.2 + seed * 0.7, 5), cl = fbm(nx * 1.7 + 40, nz * 1.7 + v * 6, 4);
      let c = [18, 52, 128];
      if (n > 0.53) c = n > 0.64 ? [138, 112, 72] : (lat > 0.55 ? [92, 110, 70] : [44, 118, 58]);
      if (lat > 0.86) c = [228, 236, 248];
      if (cl > 0.57) c = c.map(q => q + (246 - q) * Math.min(1, (cl - 0.57) * 6));
      const k = (y * W + x) * 4; img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  const night = canvasTex(W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600 * cities; i++) {
      const x = hash2(i, 31) * W, y = H * (0.2 + 0.6 * hash2(i, 32)), u = x / W * PI * 2, v = y / H;
      const n = fbm(Math.cos(u) * 1.6 + seed, Math.sin(u) * 1.6 + v * 3.2 + seed * 0.7, 5);
      if (n < 0.55 || n > 0.66) continue;
      g.fillStyle = `rgba(255,${190 + hash2(i, 33) * 50 | 0},120,${0.4 + hash2(i, 34) * 0.6})`; g.fillRect(x, y, 1 + hash2(i, 35) * 2, 1);
    }
  });
  const U = { uDay: { value: day }, uNight: { value: night }, uL: { value: new THREE.Vector3(...lightDir).normalize() }, uRed: { value: 0 }, uShield: { value: 0 }, uT: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform sampler2D uDay; uniform sampler2D uNight; uniform vec3 uL; uniform float uRed; uniform float uShield; uniform float uT;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 d = texture2D(uDay, vUv).rgb, n = texture2D(uNight, vUv).rgb;
        d = pow(d, vec3(2.2));
        float lit = dot(normalize(vN), uL), dayK = smoothstep(-0.12, 0.25, lit);
        vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - max(dot(normalize(vN), V), 0.0), 2.5);
        vec3 c = d * (0.04 + 1.25 * max(lit, 0.0)) + n * (1.0 - dayK) * 1.6;
        c += vec3(0.25, 0.5, 1.4) * fr * (0.25 + 0.9 * dayK);
        c += vec3(1.6, 0.12, 0.18) * uRed * (fr * 1.5 + 0.15 * step(0.6, fract(vUv.x * 40.0 + uT)));
        c += vec3(0.3, 1.6, 2.0) * uShield * (fr * 1.8);
        gl_FragColor = vec4(c, 1.0);
      }` });
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 48), mat); g.add(tag(ball, SET.PLANET));
  const atm = new THREE.Mesh(new THREE.SphereGeometry(r * 1.035, 64, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.55, 1.4), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, fog: false }));
  g.add(tag(atm, SET.SKY, true));
  return { g, ball, U, atm };
}

// The Moon (Ep 17-20): intact, or shattered into a debris ring around a Hollow hive core (broken 0..1)
export function makeMoon({ r = 16, seed = 7 } = {}) {
  const g = new THREE.Group();
  const whole = makeRockPlanet({ r, color: 0x9a98a2, detail: 5, rough: 0.05, seed }); g.add(whole);
  const N = 220, base = new THREE.IcosahedronGeometry(1, 1), pp = base.attributes.position, vv = new THREE.Vector3();
  for (let i = 0; i < pp.count; i++) { vv.fromBufferAttribute(pp, i); vv.multiplyScalar(0.7 + 0.5 * fbm(vv.x * 2 + 1, vv.y * 2 + vv.z)); pp.setXYZ(i, vv.x, vv.y, vv.z); }
  base.computeVertexNormals();
  const frag = new THREE.InstancedMesh(base, new THREE.MeshStandardMaterial({ color: 0x8a8894, roughness: 1, flatShading: true, fog: false }), N); frag.frustumCulled = false; g.add(tag(frag, SET.ROCK));
  const F = [...Array(N)].map((_, i) => {
    const a = hash2(i, 1) * PI * 2, el = (hash2(i, 2) - 0.5) * (i < 40 ? 1.6 : 0.35), d = r * (1.4 + hash2(i, 3) * 2.6);
    return { a, el, d, s: r * (0.04 + 0.3 * hash2(i, 4) ** 3), w: 0.03 + hash2(i, 5) * 0.06, sp: hash2(i, 6) * 6 };
  });
  const core = new THREE.Group(); g.add(core);
  const bone = new THREE.MeshStandardMaterial({ color: 0x4a3a40, roughness: 0.5, metalness: 0.5, flatShading: true, fog: false });
  const parts = [];
  for (let k = 0; k < 18; k++) { const a = k / 18 * PI * 2, c = new THREE.ConeGeometry(r * 0.08, r * (1.2 + hash2(k, 9)), 5); c.translate(0, r * 0.6, 0); c.rotateX(hash2(k, 7) * 2.6); c.rotateY(a); parts.push(c.toNonIndexed()); }
  const sp = new THREE.IcosahedronGeometry(r * 0.45, 2); parts.push(sp.toNonIndexed());
  core.add(tag(new THREE.Mesh(mergeGeometries(parts.map(p => { p.deleteAttribute('uv'); return p; })), bone), SET.METAL));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.15, 0.2), fog: false })); core.add(tag(eye, SET.ENERGY));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  function set(t, broken = 0) {
    whole.visible = broken < 0.02; frag.visible = core.visible = broken >= 0.02;
    F.forEach((f, i) => {
      const a = f.a + t * f.w * 0.2, d = r * 0.6 + (f.d - r * 0.6) * broken;
      p.set(Math.cos(a) * d * Math.cos(f.el), Math.sin(f.el) * d * 0.6, Math.sin(a) * d * Math.cos(f.el));
      e.set(f.sp + t * f.w, f.sp * 2 + t * f.w * 0.7, 0); q.setFromEuler(e); s.setScalar(f.s);
      frag.setMatrixAt(i, m4.compose(p, q, s));
    });
    frag.instanceMatrix.needsUpdate = true; core.rotation.y = t * 0.05; eye.scale.setScalar(0.85 + 0.15 * Math.sin(t * 2));
  }
  set(0, 0);
  return { g, whole, frag, core, eye, set };
}

// Vaelor mothership silhouette (Ep 14 memory / Ep 18 wreck), ~70 m long along +z, cyan rib bands
export function makeVaelorShip(scale = 1) {
  const g = new THREE.Group(); g.scale.setScalar(scale);
  const hull = new THREE.MeshStandardMaterial({ color: 0x5b5180, metalness: 0.55, roughness: 0.5, flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 20), hull); body.scale.set(12, 8, 36); g.add(tag(body, SET.METAL));
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 50), hull); ridge.position.y = 8; g.add(tag(ridge, SET.METAL));
  const bandMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.4, 1.6), fog: false });
  for (let k = -6; k <= 6; k++) { const z = k * 5, f = Math.sqrt(Math.max(0.05, 1 - (z / 36) ** 2)), b = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 4, 48), bandMat); b.scale.set(12.2 * f, 8.2 * f, 1); b.position.z = z; g.add(tag(b, SET.ENERGY)); }
  for (const s of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 14), hull); fin.position.set(s * 10, 3, -26); fin.rotation.z = s * 0.6; g.add(tag(fin, SET.METAL)); }
  const engine = new THREE.Mesh(new THREE.TorusGeometry(5, 1.3, 8, 24), hull); engine.position.z = -34; g.add(tag(engine, SET.METAL));
  const flame = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24), bandMat); flame.position.z = -34.5; flame.rotation.y = PI; g.add(tag(flame, SET.ENERGY));
  return { g, bandMat, flame };
}

// Kestrel-4 cockpit interior (Ep 17-20): a small padded cylinder, window, glowing panel + LEDs, hatch, lights.
// Build it far from everything (its own set). Seats face -z (the window).
export function makeCockpit() {
  const g = new THREE.Group();
  const wallM = new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.6, metalness: 0.4, side: THREE.BackSide, flatShading: true });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.9, 3.2, 14, 1, false), wallM); shell.rotation.x = PI / 2; shell.position.set(0, 1.1, 0); g.add(tag(shell, SET.METAL));
  const winMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), winMat); win.position.set(0, 1.35, -1.55); g.add(tag(win, SET.SKY));
  const panelM = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, emissive: 0x1a6a8a, emissiveIntensity: 0.6 });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.4), panelM); panel.position.set(0, 0.85, -1.15); panel.rotation.x = -0.5; g.add(tag(panel, SET.METAL));
  const leds = [];
  for (let i = 0; i < 18; i++) {
    const c = i % 3 ? [0.3, 1.8, 0.6] : [2.2, 0.4, 0.3];
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), fog: false }));
    l.position.set(-0.75 + (i % 9) * 0.19, 0.95 + Math.floor(i / 9) * 0.1, -1.0 - Math.floor(i / 9) * 0.06); l.rotation.x = -0.5; g.add(tag(l, SET.ENERGY)); leds.push(l);
  }
  const hatch = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshStandardMaterial({ color: 0xc8c2b6, roughness: 0.6, side: THREE.DoubleSide })); hatch.position.set(1.25, 1.1, 0.4); hatch.rotation.y = -PI / 2; g.add(tag(hatch, SET.METAL));
  const red = new THREE.PointLight(0xff3040, 0, 4, 1.4); red.position.set(0, 1.9, 0); g.add(red);
  const light = new THREE.PointLight(0xbfe8ff, 4, 6, 1.3); light.position.set(0, 1.9, -0.6); g.add(light, new THREE.HemisphereLight(0x8a9aa8, 0x202024, 0.8));
  const screen = new THREE.PointLight(0x66e8ff, 0, 3, 1.4); screen.position.set(0, 1.1, -0.9); g.add(screen);
  return { g, leds, red, light, screen, win, winMat, panelM, set(t) { leds.forEach((l, i) => l.visible = Math.sin(t * (3 + i) + i) > -0.3); } };
}
