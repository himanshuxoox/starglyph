// Reactive environment FX. Everything is a pure function of time + actor positions,
// so any frame can be rendered in any order (needed for deterministic video rendering).
import * as THREE from 'three';
import { SET, tag, hash2 } from './ascii.js';

// ---------------------------------------------------------------------------
// Grass field: instanced blades that sway in wind gusts, part around pushers
// (hero legs, creatures) and get flattened by an expanding shockwave ring.
// ---------------------------------------------------------------------------
export function makeGrass({ area = [-25, 25, -45, 8], density = 14, heightFn, colA = 0x1fa38c, colB = 0x6a3cc0, tall = 1.0, mask = null, tipFrac = 0, width = 1 }) {
  const [x0, x1, z0, z1] = area;
  const n = Math.floor((x1 - x0) * (z1 - z0) * density);
  // blade: tapered triangle strip, 2 segments, y in [0,1]
  const g = new THREE.BufferGeometry();
  const w = 0.07 * width;
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    -w, 0, 0, w, 0, 0, -w * 0.6, 0.5, 0, w * 0.6, 0.5, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0.3, 1, 0, 0.3, 1, 0, 0.3, 1, 0, 0.3, 1, 0, 0.3, 1], 3));
  const yaw = new Float32Array(n), tip = new Float32Array(n);
  g.setAttribute('aYaw', new THREE.InstancedBufferAttribute(yaw, 1));
  g.setAttribute('aTip', new THREE.InstancedBufferAttribute(tip, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPush: { value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] },
    uWave: { value: new THREE.Vector4(0, 0, 0, 0) }, // x, z, radius, strength
    uGust: { value: 1.0 },
  };
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aYaw; attribute float aTip; uniform float uTime; uniform vec4 uPush[4]; uniform vec4 uWave; uniform float uGust;
        varying float vH; varying float vTip;`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        float cy = cos(aYaw), sy = sin(aYaw);
        transformed.xz = mat2(cy, -sy, sy, cy) * transformed.xz;
        vec3 rootW = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float scl = length(instanceMatrix[1].xyz);
        float hgt = position.y; float h2 = hgt * hgt;
        // rolling wind gusts + flutter
        float gust = sin(uTime * 1.25 - rootW.x * 0.16 - rootW.z * 0.05);
        gust = (0.25 + 0.75 * max(gust, 0.0)) * uGust;
        vec2 off = vec2(0.55, 0.18) * gust + vec2(sin(uTime * 3.7 + rootW.z * 1.3 + rootW.x), cos(uTime * 3.1 + rootW.x * 1.7)) * 0.07;
        float flatK = 0.0;
        for (int i = 0; i < 4; i++) {
          vec4 p = uPush[i];
          vec2 d = rootW.xz - p.xy; float dl = length(d) + 1e-4;
          float k = smoothstep(p.z, p.z * 0.25, dl) * p.w;
          off += d / dl * k * 1.25; flatK += k;
        }
        { vec2 d = rootW.xz - uWave.xy; float dl = length(d) + 1e-4;
          float k = exp(-pow((dl - uWave.z) / 1.4, 2.0)) * uWave.w;
          off += d / dl * k * 1.6; flatK += k * 0.8; }
        transformed.xz += off * h2 / scl;
        transformed.y *= 1.0 - clamp(flatK, 0.0, 1.0) * 0.55;
        vH = hgt; vTip = aTip;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH; varying float vTip;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(0.25, 1.25, vH);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n if (vTip > 0.5 && vH > 0.8) totalEmissiveRadiance += (vTip > 1.5 ? vec3(0.25, 1.1, 1.3) : vec3(1.5, 0.35, 1.3)) * 1.8;');
  };
  const mesh = new THREE.InstancedMesh(g, mat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const ca = new THREE.Color(colA), cb = new THREE.Color(colB), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = x0 + hash2(i, 1.3) * (x1 - x0), z = z0 + hash2(i, 2.7) * (z1 - z0);
    if (mask && !mask(x, z)) { mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); continue; }
    tip[i] = hash2(i, 8.3) < tipFrac ? (hash2(i, 9.1) < 0.45 ? 2 : 1) : 0;
    const hs = tall * (0.45 + hash2(i, 4.1) * 0.75);
    p.set(x, heightFn(x, z) - 0.02, z); s.set(hs, hs, hs); m4.compose(p, q, s);
    mesh.setMatrixAt(i, m4); yaw[i] = hash2(i, 5.9) * Math.PI;
    c.copy(ca).lerp(cb, Math.min(1, Math.max(0, (Math.sin(x * 0.09) + Math.cos(z * 0.11)) * 0.5 + 0.5 + (hash2(i, 7) - 0.5) * 0.5)));
    mesh.setColorAt(i, c);
  }
  mesh.frustumCulled = false; mesh.receiveShadow = true;
  tag(mesh, SET.GRASS);
  return { mesh, uniforms };
}

// ---------------------------------------------------------------------------
// Instanced particle pool. emitters return [{x,y,z,s}] for the current time.
// ---------------------------------------------------------------------------
export function makePool(max, geo, mat, set) {
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.frustumCulled = false; mesh.count = 0; tag(mesh, set);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    mesh,
    set(list) {
      const n = Math.min(list.length, max);
      for (let i = 0; i < n; i++) {
        const o = list[i]; p.set(o.x, o.y, o.z); s.setScalar(o.s);
        q.setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0));
        m4.compose(p, q, s); mesh.setMatrixAt(i, m4);
      }
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// Ballistic burst: spawn time, origin, count, speed ranges. Moon gravity by default.
export function burst(out, t, { t0, x, z, y = 0, count = 12, seed = 0, hs = [0.3, 1.2], vs = [0.5, 1.5], dir = null, spread = Math.PI * 2,
  life = 1.8, g = 1.62, size = 0.08, groundFn = null, tStagger = 0, r0 = 0 }) {
  for (let i = 0; i < count; i++) {
    const ts = t0 + hash2(seed, i * 3.1) * tStagger;
    const dt = t - ts; if (dt < 0 || dt > life) continue;
    const a = (dir ?? 0) + (hash2(seed + i, 1.7) - 0.5) * spread;
    const hv = hs[0] + hash2(seed + i, 2.9) * (hs[1] - hs[0]), vv = vs[0] + hash2(seed + i, 4.3) * (vs[1] - vs[0]);
    const px = x + Math.sin(a) * (r0 + hv * dt), pz = z + Math.cos(a) * (r0 + hv * dt);
    let py = y + vv * dt - 0.5 * g * dt * dt;
    const gy = groundFn ? groundFn(px, pz) : -1e9;
    if (py < gy) py = gy;
    const fade = 1 - dt / life;
    out.push({ x: px, y: py, z: pz, s: size * (0.5 + hash2(seed + i, 6.1)) * Math.sqrt(fade) });
  }
}
