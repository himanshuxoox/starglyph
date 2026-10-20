// Shared night sky for the ring-world (Ep 3+), modelled on the concept art:
// deep navy zenith with blue/violet nebula, soft violet horizon haze, a dark gas giant with a
// huge glowing ring arc, jagged rock spires on the horizon, and (optional) a red armada.
//
// Ep 2 sky bugs this replaces:
//  - nebula blobs were not wrapped around the texture seam -> hard vertical edge in the sky
//  - the horizon glow was a 2%-tall hard magenta stripe -> looked like a flat stage backdrop
//  - the Coil was an open cylinder seen edge-on -> a dim thin band instead of a glowing ring
//  - (engine) sky glyph ramp was not sorted by density -> smooth gradients broke into blocks
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SET, tag, hash2, fbm } from './ascii.js';

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------------------
// Sky dome: seamless equirect texture (everything drawn at x, x-w, x+w so u=0/1 match)
// ---------------------------------------------------------------------------
function skyDome() {
  const tex = canvasTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0.00, '#02041a');
    gr.addColorStop(0.22, '#060c36');
    gr.addColorStop(0.36, '#0e1a5c');
    gr.addColorStop(0.44, '#22287a');
    gr.addColorStop(0.485, '#3e3394');   // haze just above the horizon
    gr.addColorStop(0.50, '#4a3a98');
    gr.addColorStop(0.53, '#2a1e60');
    gr.addColorStop(0.62, '#120c32');
    gr.addColorStop(1.00, '#05040f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const blob = (x, y, r, rgba, sy = 1) => {
      for (const ox of [-w, 0, w]) {
        g.save(); g.translate(x + ox, y); g.scale(1, sy);
        const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
        rg.addColorStop(0, rgba); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.restore();
      }
    };
    // nebula clouds (blue / violet / magenta), mostly in the upper sky
    const cols = ['70,110,255', '120,80,240', '170,70,220', '60,150,255'];
    for (let i = 0; i < 70; i++) {
      const x = hash2(i, 41) * w, y = 60 + hash2(i, 43) ** 0.8 * 380, r = 40 + hash2(i, 45) * 170;
      blob(x, y, r, `rgba(${cols[i % 4]},${(0.08 + hash2(i, 47) * 0.16).toFixed(3)})`, 0.55 + hash2(i, 49) * 0.4);
    }
    // a diagonal milky band of fine nebula
    for (let i = 0; i < 160; i++) {
      const u = hash2(i, 51), x = u * w, y = 90 + u * 260 + (hash2(i, 53) - 0.5) * 70, r = 18 + hash2(i, 55) * 50;
      blob(x, y, r, `rgba(150,170,255,${(0.05 + hash2(i, 57) * 0.08).toFixed(3)})`, 0.7);
    }
    // horizon haze puffs (soft, wide, no hard line)
    for (let i = 0; i < 40; i++) blob(hash2(i, 61) * w, h * 0.49 + (hash2(i, 63) - 0.5) * 40, 80 + hash2(i, 65) * 160, `rgba(110,80,200,${(0.10 + hash2(i, 67) * 0.12).toFixed(3)})`, 0.35);
  });
  tex.wrapS = THREE.RepeatWrapping;
  const m = new THREE.Mesh(new THREE.SphereGeometry(3000, 64, 32), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false }));
  m.renderOrder = -10;
  return tag(m, SET.SKY);
}

// ---------------------------------------------------------------------------
// Gas giant + ring
// ---------------------------------------------------------------------------
const planetMat = (lightDir) => new THREE.ShaderMaterial({
  uniforms: { uLight: { value: lightDir.clone().normalize() }, uDim: { value: 1 } },
  vertexShader: /* glsl */`
    varying vec3 vN; varying vec3 vW; varying vec3 vL;
    void main(){ vL = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */`
    uniform vec3 uLight; uniform float uDim; varying vec3 vN; varying vec3 vW; varying vec3 vL;
    float h(float n){ return fract(sin(n)*43758.5453); }
    void main(){
      vec3 V = normalize(cameraPosition - vW);
      float lat = normalize(vL).y;
      float bands = 0.5 + 0.25*sin(lat*38.0 + sin(lat*9.0)*2.0) + 0.15*sin(lat*91.0);
      float lit = max(dot(vN, uLight), 0.0);
      vec3 base = mix(vec3(0.03,0.05,0.16), vec3(0.10,0.16,0.42), bands);
      vec3 c = base * (0.18 + 1.1*lit);
      float fr = pow(1.0 - max(dot(vN, V), 0.0), 3.0);
      c += vec3(0.35,0.55,1.4) * fr * (0.25 + 1.4*smoothstep(-0.2, 0.6, dot(vN, uLight)));
      gl_FragColor = vec4(c*uDim, 1.0);
    }`,
});
const ringMat = (rIn, rOut) => new THREE.ShaderMaterial({
  uniforms: { uIn: { value: rIn }, uOut: { value: rOut }, uGain: { value: 1 }, uRed: { value: 0 } },
  vertexShader: /* glsl */`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uIn; uniform float uOut; uniform float uGain; uniform float uRed; varying vec2 vP;
    void main(){
      float f = (length(vP) - uIn) / (uOut - uIn);
      if (f < 0.0 || f > 1.0) discard;
      float b = 0.25 + 0.2*sin(f*120.0) + 0.15*sin(f*47.0 + 1.3) + 0.1*sin(f*263.0);
      b *= smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.3, 0.36, f)*0.75 + smoothstep(0.4, 0.46, f)*0.75);  // Cassini-like gap
      b += 1.4 * exp(-pow((f - 0.86) / 0.05, 2.0)) + 0.6 * exp(-pow((f - 0.66) / 0.04, 2.0));               // bright bands
      b *= 1.0 - smoothstep(0.93, 1.0, f);
      vec3 col = mix(vec3(0.45,0.62,1.6), vec3(1.6,1.75,2.2), smoothstep(0.75, 0.9, f));
      col = mix(col, vec3(1.9,0.25,0.35), uRed*0.6);
      gl_FragColor = vec4(col * b * uGain, 1.0);
    }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});

function ringPlanet({ dir, dist = 2400, radius = 560 }) {
  const g = new THREE.Group();
  const d = new THREE.Vector3(...dir).normalize();
  g.position.copy(d).multiplyScalar(dist);
  const lightDir = new THREE.Vector3(-0.6, 0.35, 0.7);
  const pm = planetMat(lightDir);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), pm);
  planet.rotation.z = 0.35; g.add(tag(planet, SET.PLANET));
  const rIn = radius * 1.3, rOut = radius * 2.25;
  const rm = ringMat(rIn, rOut);
  const ring = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 256, 1), rm);
  // tilt so the ring reads as a big sweeping arc (like the concept art)
  ring.rotation.set(-1.18, 0.38, 0.42); g.add(tag(ring, SET.PLANET));
  // soft halo behind the ring (additive), not in the ID pass
  const haloTex = canvasTex(256, 256, (c, w, h) => { const r = c.createRadialGradient(128, 128, 30, 128, 128, 128); r.addColorStop(0, 'rgba(90,120,255,0.55)'); r.addColorStop(0.5, 'rgba(70,90,230,0.18)'); r.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = r; c.fillRect(0, 0, w, h); });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(rOut * 3.2, rOut * 3.2), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.lookAt(new THREE.Vector3(0, 0, 0).sub(g.position)); halo.position.copy(d).multiplyScalar(radius * 1.5);   // just behind the planet
  halo.renderOrder = -5; g.add(tag(halo, SET.SKY, true));
  g.lookAtOrigin = () => halo.lookAt(new THREE.Vector3(0, 0, 0));
  return { g, planet, ring, ringMat: rm, planetMat: pm, halo };
}

// ---------------------------------------------------------------------------
// Jagged rock spires (merged into one mesh) + red crack veins on some of them
// ---------------------------------------------------------------------------
export function makeSpires({ count = 60, rMin = 90, rMax = 520, center = [0, 0], heightFn = () => 0, avoid = () => false, seed = 0, hMin = 30, hMax = 230 }) {
  const geos = [], cracks = [];
  for (let i = 0; i < count; i++) {
    const a = hash2(i + seed, 1) * Math.PI * 2, d = rMin + hash2(i + seed, 2) ** 0.7 * (rMax - rMin);
    const x = center[0] + Math.cos(a) * d, z = center[1] + Math.sin(a) * d;
    if (avoid(x, z)) continue;
    const hh = hMin + hash2(i + seed, 3) ** 1.3 * (hMax - hMin) * (0.5 + d / rMax * 0.6), r0 = hh * (0.13 + hash2(i + seed, 4) * 0.12);
    const geo = new THREE.CylinderGeometry(r0 * 0.08, r0, hh, 7, 10, false);
    const p = geo.attributes.position, lean = (hash2(i + seed, 5) - 0.5) * 0.25;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k) / hh + 0.5, ang = Math.atan2(p.getZ(k), p.getX(k));
      const n = 0.65 + 0.7 * fbm(ang * 1.6 + i * 3.1, y * 5 + i, 3) + 0.25 * Math.sin(y * 31 + i);
      p.setX(k, p.getX(k) * n + lean * y * hh); p.setZ(k, p.getZ(k) * n);
    }
    geo.translate(x, heightFn(x, z) + hh * 0.45, z); geo.deleteAttribute('uv');
    geos.push(geo.toNonIndexed());
    if (hash2(i + seed, 7) > 0.72) {                         // glowing red fault line running up the spire
      const segs = 5 + Math.floor(hash2(i, 8) * 5); let cx = 0, cy = 0.05;
      const fa = a + Math.PI + (hash2(i, 9) - 0.5) * 1.2;      // on the face looking back at the action
      for (let s = 0; s < segs; s++) {
        const ny = cy + 0.1 + hash2(i * 7 + s, 11) * 0.08, nx = cx + (hash2(i * 7 + s, 12) - 0.5) * 0.25;
        const y0 = cy * hh, y1 = Math.min(0.8, ny) * hh, rr = r0 * (1 - cy * 0.9) * 0.95;
        const len = Math.hypot((nx - cx) * r0, y1 - y0);
        const b = new THREE.BoxGeometry(r0 * 0.05 + 0.4, len, r0 * 0.05 + 0.4);
        b.rotateZ(Math.atan2(-(nx - cx) * r0, y1 - y0));
        const ox = Math.cos(fa) * rr + Math.sin(fa) * (cx + nx) / 2 * r0, oz = Math.sin(fa) * rr - Math.cos(fa) * (cx + nx) / 2 * r0;
        b.translate(x + ox + lean * (cy + ny) / 2 * hh, heightFn(x, z) - hh * 0.05 + (y0 + y1) / 2, z + oz);
        cracks.push(b.toNonIndexed()); cx = nx; cy = ny; if (cy > 0.8) break;
      }
    }
  }
  const g = new THREE.Group();
  const rock = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ color: 0x24224a, roughness: 0.95, metalness: 0.05, flatShading: true }));
  rock.castShadow = false; g.add(tag(rock, SET.ROCK));
  let crackMat = null;
  if (cracks.length) {
    crackMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.12, 0.2), fog: false });
    g.add(tag(new THREE.Mesh(mergeGeometries(cracks), crackMat), SET.ENERGY));
  }
  return { g, rock, crackMat };
}

// ---------------------------------------------------------------------------
// Red armada: ships with red engine lights that appear one by one among the stars
// ---------------------------------------------------------------------------
export function makeArmada({ n = 220, dir = [0.3, 0.45, -1], dist = 1500, spread = [1700, 650] }) {
  const g = new THREE.Group();
  const fwd = new THREE.Vector3(...dir).normalize();
  const right = new THREE.Vector3(0, 1, 0).cross(fwd).normalize(), up = fwd.clone().cross(right).normalize();
  const hull = new THREE.ConeGeometry(1, 4, 5); hull.rotateX(Math.PI / 2);
  const ships = new THREE.InstancedMesh(hull, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.05, 0.1), fog: false }), n);
  const lights = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.18, 0.22), fog: false }), n);
  ships.frustumCulled = lights.frustumCulled = false;
  g.add(tag(ships, SET.METAL), tag(lights, SET.ENERGY));
  const S = [...Array(n)].map((_, i) => {
    const a = (hash2(i, 71) - 0.5) * spread[0], b = (hash2(i, 73) - 0.35) * spread[1], dd = dist * (0.75 + hash2(i, 75) * 0.5);
    const p = fwd.clone().multiplyScalar(dd).addScaledVector(right, a).addScaledVector(up, b);
    return { p, size: 7 + hash2(i, 77) ** 3 * 38, order: hash2(i, 79), ph: hash2(i, 81) * 6.28 };
  });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const travel = right.clone().multiplyScalar(-1).addScaledVector(up, -0.25).normalize();
  q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), travel);
  // k: 0..1 how many are lit; t: time (drift + twinkle)
  function set(k, t) {
    S.forEach((s, i) => {
      const on = Math.min(1, Math.max(0, (k - s.order) * 12));
      pos.copy(s.p).addScaledVector(travel, t * 6 * (1 + s.order));
      sc.setScalar(on > 0 ? s.size * on : 0.0001); m.compose(pos, q, sc); ships.setMatrixAt(i, m);
      const tw = 0.75 + 0.25 * Math.sin(t * 7 + s.ph);
      sc.setScalar(on > 0 ? s.size * 0.42 * on * tw + 3 : 0.0001);
      m.compose(pos.clone().addScaledVector(travel, -s.size * 2.1), q, sc); lights.setMatrixAt(i, m);
    });
    ships.instanceMatrix.needsUpdate = lights.instanceMatrix.needsUpdate = true;
    g.visible = k > 0;
  }
  set(0, 0);
  return { g, set, lightMat: lights.material };
}

// ---------------------------------------------------------------------------
export function makeNightSky({ planetDir = [-0.55, 0.42, -1], spires = {} } = {}) {
  const group = new THREE.Group();
  const dome = skyDome(); group.add(dome);
  const rp = ringPlanet({ dir: planetDir }); group.add(rp.g); rp.g.lookAtOrigin();
  const sp = makeSpires(spires); group.add(sp.g);
  return { group, dome, ...rp, spires: sp };
}
