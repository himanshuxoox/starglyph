// Reusable set pieces (Ep 4+): Vaelor architecture with glowing glyph panels, the galaxy hologram,
// gate keys, gate portals, holographic planets.
import * as THREE from 'three';
import { SET, tag, hash2, fbm } from './ascii.js';

const PI = Math.PI;
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------------------
// Vaelor glyph texture (alien runes in columns). Used as emissiveMap so walls light up.
// ---------------------------------------------------------------------------
export function glyphTexture(seed = 0, w = 256, h = 512) {
  return canvasTex(w, h, (g, W, Hh) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh);
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
    const cw = 32, ch = 40;
    for (let cy = 0; cy < Hh / ch; cy++) for (let cx = 0; cx < W / cw; cx++) {
      if (hash2(cx + seed * 7, cy * 3 + seed) < 0.25) continue;
      const x0 = cx * cw + 6, y0 = cy * ch + 6, s = (k) => hash2(cx * 13 + k, cy * 7 + seed + k);
      g.beginPath();
      g.moveTo(x0 + s(1) * 20, y0); g.lineTo(x0 + 10, y0 + 14 + s(2) * 10);
      if (s(3) > 0.4) { g.moveTo(x0, y0 + 14); g.lineTo(x0 + 20, y0 + 14); }
      if (s(4) > 0.5) { g.moveTo(x0 + 10, y0 + 14); g.lineTo(x0 + 20 * s(5), y0 + 28); }
      if (s(6) > 0.6) { g.arc(x0 + 10, y0 + 20, 6, 0, PI * (1 + s(7))); }
      g.stroke();
    }
  });
}

// glyph-lit material: emissive glyphs whose brightness/colour the episode drives (mat.emissiveIntensity)
export function glyphMaterial({ color = 0x2a2a44, glow = 0x55e6ff, seed = 0, repeat = [1, 1] } = {}) {
  const tex = glyphTexture(seed); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat);
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2, emissive: glow, emissiveMap: tex, emissiveIntensity: 0.2, flatShading: true });
}

// ---------------------------------------------------------------------------
// Vaelor pillar: tapered hexagonal shaft, flared capital, glyph band
// ---------------------------------------------------------------------------
export function makePillar(h = 12, r = 0.9, stone, glyph) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 6), stone); shaft.position.y = h / 2; g.add(shaft);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.92, h * 0.5, 6, 1, true), glyph); band.position.y = h * 0.35; g.add(band);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.6, r * 0.8, h * 0.08, 6), stone); cap.position.y = h - h * 0.04; g.add(cap);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.3, r * 1.4, h * 0.05, 6), stone); base.position.y = h * 0.025; g.add(base);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  tag(g, SET.METAL);
  return { g, band };
}

// ---------------------------------------------------------------------------
// Vaelor statue: very tall, thin robed figure with a crescent head-crest, holding a staff
// ---------------------------------------------------------------------------
export function makeVaelorStatue(h = 9, stone) {
  const g = new THREE.Group(), s = h / 9;
  const robe = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0], [1.3, 0], [1.1, 1.5], [0.8, 4], [0.7, 5.6], [0.95, 6.2], [0.5, 6.6], [0, 6.7]].map(([r, y]) => new THREE.Vector2(r * s, y * s)), 7), stone);
  g.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 8, 6), stone); head.scale.set(0.8, 1.3, 1); head.position.y = 7.2 * s; g.add(head);
  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.7 * s, 0.09 * s, 4, 16, PI * 1.2), stone); crest.position.y = 7.6 * s; crest.rotation.set(0, PI / 2, -PI * 0.1); g.add(crest);
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 8.4 * s, 5), stone); staff.position.set(1.0 * s, 4.2 * s, 0.4 * s); g.add(staff);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.18 * s, 2.6 * s, 5), stone); arm.position.set(0.85 * s, 4.9 * s, 0.25 * s); arm.rotation.z = 0.5; g.add(arm);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return tag(g, SET.ROCK);
}

// ---------------------------------------------------------------------------
// Galaxy hologram: instanced glowing specks in a 2-arm spiral + a core. set(t, k) rotates/blooms it.
// highlight(i) can mark a star (e.g. Earth) by index; returns world position of a given arm position.
// ---------------------------------------------------------------------------
export function makeGalaxy({ n = 2600, radius = 9, color = [0.35, 1.3, 1.8], core = [1.6, 1.4, 2.2] } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; g.add(tag(im, SET.ENERGY));
  const S = [];
  for (let i = 0; i < n; i++) {
    const arm = i % 2, u = hash2(i, 1) ** 0.6, a = u * 4.2 + arm * PI + (hash2(i, 2) - 0.5) * 0.5 * (1 - u * 0.5);
    const r = 0.25 + u * radius, y = (hash2(i, 3) - 0.5) * 0.6 * (1 - u * 0.7);
    const c = new THREE.Color(...(r < 1.6 ? core : color)).multiplyScalar(0.55 + hash2(i, 4) * 0.8);
    im.setColorAt(i, c);
    S.push({ r, a, y, s: 0.012 + hash2(i, 5) ** 4 * 0.035 });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  function set(t, bloom = 1, spin = 0.05) {
    for (let i = 0; i < n; i++) {
      const s = S[i], k = Math.min(1, Math.max(0, bloom * 1.6 - s.r / radius * 0.6));
      const a = s.a + t * spin * (1.5 - s.r / radius), r = s.r * (0.2 + 0.8 * k);
      p.set(Math.cos(a) * r, s.y * k, Math.sin(a) * r); sc.setScalar(k > 0 ? s.s * (0.6 + 0.4 * k) : 1e-4);
      im.setMatrixAt(i, m4.compose(p, q, sc));
    }
    im.instanceMatrix.needsUpdate = true;
  }
  set(0, 1);
  // a point near the rim (Earth): arm 0, far end
  const edge = (t, spin = 0.05) => { const a = 4.2 + t * spin * 0.5 + 0.3, r = radius * 1.02; return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); };
  return { g, im, set, edge, mat };
}

// ---------------------------------------------------------------------------
// Gate key: a faceted crystal inside a slowly turning metal ring. colour per key.
// ---------------------------------------------------------------------------
export const KEY_COLORS = [[0.4, 1.8, 2.2], [0.5, 1.0, 2.4], [1.8, 1.6, 2.4], [2.2, 0.9, 0.4]];
export function makeKey(i = 0, scale = 1) {
  const g = new THREE.Group();
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 * scale, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(...KEY_COLORS[i % 4]), fog: false }));
  crystal.scale.y = 1.6; g.add(tag(crystal, SET.ENERGY));
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x9a96b8, metalness: 0.7, roughness: 0.3 });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.26 * scale, 0.02 * scale, 6, 24), ringMat); g.add(tag(r1, SET.METAL));
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.3 * scale, 0.015 * scale, 6, 24), ringMat); r2.rotation.x = PI / 2; g.add(tag(r2, SET.METAL));
  return { g, crystal, r1, r2, spin(t) { r1.rotation.y = t * 1.3; r2.rotation.z = t * 0.9; crystal.rotation.y = t * 0.7; } };
}

// ---------------------------------------------------------------------------
// Gate portal: stone ring + swirling energy disc (shader). open 0..1
// ---------------------------------------------------------------------------
export function makeGate(radius = 4, stone, color = [0.4, 1.6, 2.2]) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.12, 8, 48), stone); ring.castShadow = true; g.add(tag(ring, SET.METAL));
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.18, radius * 0.34, radius * 0.3), stone);
    b.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0); b.rotation.z = a; g.add(tag(b, SET.METAL));
  }
  const U = { uT: { value: 0 }, uOpen: { value: 0 }, uCol: { value: new THREE.Vector3(...color) } };
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.94, 64), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */`
      uniform float uT; uniform float uOpen; uniform vec3 uCol; varying vec2 vP;
      void main(){
        float r = length(vP) / ${(radius * 0.94).toFixed(3)}, a = atan(vP.y, vP.x);
        float sw = sin(a * 5.0 + r * 14.0 - uT * 4.0) * 0.5 + 0.5;
        float edge = smoothstep(uOpen * 1.02, uOpen * 0.98 - 0.08, r);
        vec3 c = uCol * (0.35 + 0.9 * sw * (1.0 - r * 0.6) + 1.6 * exp(-r * 5.0) * uOpen);
        c += vec3(1.5) * smoothstep(uOpen - 0.06, uOpen, r) * (1.0 - smoothstep(uOpen, uOpen + 0.02, r));
        gl_FragColor = vec4(c, edge * 0.95);
      }`,
  }));
  g.add(tag(disc, SET.ENERGY));
  return { g, disc, U, set(t, open) { U.uT.value = t; U.uOpen.value = open; disc.visible = open > 0.01; } };
}

// ---------------------------------------------------------------------------
// Holographic planet: wireframe-ish sphere with bands; flicker/red "dead" state
// ---------------------------------------------------------------------------
export function makeHoloPlanet(r = 0.5, color = [0.4, 1.5, 2.0], seed = 0) {
  const U = { uT: { value: 0 }, uCol: { value: new THREE.Vector3(...color) }, uDead: { value: 0 }, uOn: { value: 1 } };
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */`
      uniform float uT; uniform vec3 uCol; uniform float uDead; uniform float uOn; varying vec3 vP; varying vec3 vN;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec3 n = normalize(vP);
        float lat = abs(fract(n.y * 6.0 + ${(seed * 0.37).toFixed(2)}) - 0.5), lon = abs(fract(atan(n.z, n.x) / 6.2832 * 12.0 + uT * 0.05) - 0.5);
        float grid = smoothstep(0.06, 0.0, min(lat, lon));
        float land = smoothstep(0.55, 0.62, fract(sin(dot(floor(n * 4.0), vec3(12.9, 78.2, 37.7))) * 43758.5));
        float fr = pow(1.0 - abs(vN.z), 1.5);
        vec3 col = mix(uCol, vec3(2.2, 0.15, 0.2), uDead);
        float a = (0.25 * land + 0.8 * grid + 0.9 * fr) * uOn;
        a *= 1.0 - uDead * step(0.5, h(vec2(floor(vP.y * 30.0), floor(uT * 15.0))));     // dead: torn scanlines
        gl_FragColor = vec4(col * (0.6 + 0.8 * fr), a);
      }`,
  }));
  return { g: tag(m, SET.ENERGY), U };
}

// ---------------------------------------------------------------------------
// Ring of glyph-panel walls forming a round hall (inner radius R, height h)
// ---------------------------------------------------------------------------
export function makeHall({ R = 16, h = 14, n = 16, stone, glyphMats }) {
  const g = new THREE.Group(), panels = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * PI * 2, w = 2 * R * Math.tan(PI / n) * 1.02;
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.2), glyphMats[i % glyphMats.length]);
    p.position.set(Math.sin(a) * (R + 0.6), h / 2, Math.cos(a) * (R + 0.6)); p.rotation.y = a; p.receiveShadow = true;
    g.add(tag(p, SET.METAL)); panels.push({ mesh: p, a });
  }
  const floorTex = canvasTex(512, 512, (c, W, Hh) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, Hh); c.strokeStyle = '#fff'; c.lineWidth = 3;
    for (let k = 1; k < 9; k++) { c.beginPath(); c.arc(W / 2, Hh / 2, k * 28, 0, PI * 2); c.stroke(); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * PI * 2; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * 56, Hh / 2 + Math.sin(a) * 56); c.lineTo(W / 2 + Math.cos(a) * 250, Hh / 2 + Math.sin(a) * 250); c.stroke(); }
  });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x23223a, roughness: 0.55, metalness: 0.3, emissive: 0x3ad8ff, emissiveMap: floorTex, emissiveIntensity: 0.15 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 1.2, 64), floorMat); floor.rotation.x = -PI / 2; floor.receiveShadow = true; g.add(tag(floor, SET.ROCK));
  const roofMat = stone.clone(); roofMat.side = THREE.BackSide;
  const roof = new THREE.Mesh(new THREE.SphereGeometry(R + 1.2, 32, 12, 0, PI * 2, 0, PI / 2), roofMat); roof.scale.y = 0.55; roof.position.y = h;
  g.add(tag(roof, SET.ROCK));
  return { g, panels, floor, floorMat, roof };
}

// ---------------------------------------------------------------------------
// Vaelor knight (original design): 2.8 m, long robed armour, crescent crest, amber rune lines, slit eyes.
// Built seated against a pillar; pose(k) via fields: lift (head up 0..1), reach (right hand out 0..1)
// ---------------------------------------------------------------------------
export function makeVaelorKnight(matsIn = {}) {
  const armour = matsIn.armour || new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.45, metalness: 0.6, flatShading: true });
  const cloth = matsIn.cloth || new THREE.MeshStandardMaterial({ color: 0x3a2a3a, roughness: 0.9, flatShading: true });
  const rune = matsIn.rune || new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 0.4), fog: false });
  const claw = new THREE.MeshStandardMaterial({ color: 0x2a2830, roughness: 0.3, metalness: 0.7 });
  const add = (p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(...s); m.castShadow = true; p.add(m); return m; };
  const root = new THREE.Group();
  const pelvis = new THREE.Group(); pelvis.position.y = 0.42; root.add(pelvis);
  add(pelvis, new THREE.CylinderGeometry(0.32, 0.4, 0.35, 8), cloth);
  // legs stretched forward along +z, robe draped over them
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * 0.18, 0, 0.05); leg.rotation.x = PI / 2 - 0.12; pelvis.add(leg);
    add(leg, new THREE.CylinderGeometry(0.12, 0.1, 0.95, 6), armour, 0, -0.48, 0);
    const knee = new THREE.Group(); knee.position.y = -0.95; knee.rotation.x = sx > 0 ? -0.6 : -0.15; leg.add(knee);
    add(knee, new THREE.CylinderGeometry(0.1, 0.08, 0.95, 6), armour, 0, -0.48, 0);
    add(knee, new THREE.BoxGeometry(0.16, 0.08, 0.32), armour, 0, -0.98, 0.1);
  }
  add(pelvis, new THREE.ConeGeometry(0.62, 1.3, 8, 1, true), cloth, 0, -0.05, 0.62, PI / 2 + 0.15, 0, 0, [1, 1, 0.35]);
  const torso = new THREE.Group(); torso.position.y = 0.15; torso.rotation.x = -0.32; pelvis.add(torso);
  add(torso, new THREE.CylinderGeometry(0.38, 0.3, 0.95, 8), armour, 0, 0.48, 0, 0, 0, 0, [1, 1, 0.7]);
  add(torso, new THREE.BoxGeometry(0.06, 0.6, 0.02), rune, 0, 0.5, 0.27);
  add(torso, new THREE.BoxGeometry(0.5, 0.04, 0.02), rune, 0, 0.7, 0.26);
  for (const sx of [-1, 1]) add(torso, new THREE.SphereGeometry(0.24, 8, 6, 0, PI * 2, 0, PI / 2), armour, sx * 0.44, 0.9, 0, 0, 0, sx * 0.4);
  for (let k = 0; k < 3; k++) add(torso, new THREE.ConeGeometry(0.035, 0.5, 4), claw, -0.1 + k * 0.12, 0.38 + k * 0.08, 0.32, PI / 2 + 0.6, 0, 0.3 - k * 0.2);   // Hollow claws still in him
  const neck = new THREE.Group(); neck.position.y = 1.0; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.2; neck.add(head);
  add(head, new THREE.SphereGeometry(0.2, 10, 8), armour, 0, 0, 0, 0, 0, 0, [0.8, 1.25, 0.95]);
  const crest = add(head, new THREE.TorusGeometry(0.34, 0.035, 5, 20, PI * 1.25), armour, 0, 0.18, -0.05, 0, PI / 2, -PI * 0.12);
  const eyes = [-1, 1].map(sx => add(head, new THREE.BoxGeometry(0.08, 0.018, 0.02), rune, sx * 0.07, 0.04, 0.18, 0, 0, -sx * 0.25));
  const arm = sx => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.46, 0.82, 0); torso.add(sh);
    add(sh, new THREE.CylinderGeometry(0.09, 0.08, 0.62, 6), armour, 0, -0.31, 0);
    const el = new THREE.Group(); el.position.y = -0.62; sh.add(el);
    add(el, new THREE.CylinderGeometry(0.08, 0.07, 0.58, 6), armour, 0, -0.29, 0);
    add(el, new THREE.BoxGeometry(0.03, 0.4, 0.02), rune, 0, -0.3, 0.07);
    const hand = new THREE.Group(); hand.position.y = -0.62; el.add(hand);
    add(hand, new THREE.BoxGeometry(0.12, 0.16, 0.06), armour, 0, -0.06, 0);
    return { sh, el, hand };
  };
  const armR = arm(-1), armL = arm(1);
  const staff = new THREE.Group(); armL.hand.add(staff);
  add(staff, new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5), armour, 0, -0.2, 0.1, 0.9, 0, 0);
  add(staff, new THREE.OctahedronGeometry(0.08, 0), rune, 0, 0.45, 0.65);
  root.traverse(o => { if (o.isMesh) o.userData.set = o.material === rune ? SET.ENERGY : o.material === cloth ? SET.ROCK : SET.METAL; });
  function pose({ lift = 0, reach = 0, t = 0, breathe = 1 } = {}) {
    torso.rotation.x = -0.32 + 0.22 * lift + 0.02 * Math.sin(t * 1.1) * breathe;
    neck.rotation.set(0.9 * (1 - lift) - 0.1, 0.15 * Math.sin(t * 0.3) * lift, 0);
    armR.sh.rotation.set(-0.4 - 1.0 * reach, 0, 0.2 - 0.15 * reach); armR.el.rotation.x = -0.9 * (1 - reach) - 0.25 * reach;
    armL.sh.rotation.set(-0.5, 0, -0.3); armL.el.rotation.x = -1.1;
  }
  pose();
  return { root, head, torso, armR, armL, eyes, rune, armour, cloth, pose };
}
