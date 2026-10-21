// Ocean pieces (Ep 6-7): animated sea surface (same wave maths in JS for floating things), caustic seabed,
// fish schools that scatter from the hero, light shafts, and the leviathan.
import * as THREE from 'three';
import { SET, tag, hash2 } from './ascii.js';

const PI = Math.PI;
// [dirX, dirZ, wavenumber, amplitude, speed, phase]
export const WAVES = [[1, 0.2, 0.09, 0.55, 0.9, 0], [0.6, 0.8, 0.16, 0.28, 1.3, 1.3], [-0.4, 1, 0.31, 0.12, 1.9, 2.1], [0.9, -0.5, 0.55, 0.05, 2.6, 0.7]];
export function waveHeight(x, z, t, amp = 1) {
  let y = 0;
  for (const [dx, dz, k, a, w, p] of WAVES) { const l = Math.hypot(dx, dz); y += a * Math.sin(k * (dx * x + dz * z) / l - w * t + p); }
  return y * amp;
}

export function makeOcean({ size = 900, seg = 220, color = 0x0a2a50, center = [0, 0], y = 0 } = {}) {
  const U = { uTime: { value: 0 }, uAmp: { value: 1 } };
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.18, metalness: 0.35, side: THREE.DoubleSide, flatShading: false });
  const W = WAVES.map(([dx, dz, k, a, w, p]) => { const l = Math.hypot(dx, dz); return `vec4(${(dx / l).toFixed(4)}, ${(dz / l).toFixed(4)}, ${k.toFixed(4)}, ${a.toFixed(4)})`; }).join(',');
  const WP = WAVES.map(([, , , , w, p]) => `vec2(${w.toFixed(3)}, ${p.toFixed(3)})`).join(',');
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uAmp; varying float vCrest;
        const vec4 WV[${WAVES.length}] = vec4[](${W}); const vec2 WP[${WAVES.length}] = vec2[](${WP});`)
      .replace('#include <beginnormal_vertex>', `
        vec3 wpos0 = (modelMatrix * vec4(position, 1.0)).xyz;
        float hy = 0.0; vec2 grad = vec2(0.0);
        for (int i = 0; i < ${WAVES.length}; i++) {
          float ph = WV[i].z * dot(WV[i].xy, wpos0.xz) - WP[i].x * uTime + WP[i].y;
          hy += WV[i].w * sin(ph); grad += WV[i].w * WV[i].z * cos(ph) * WV[i].xy;
        }
        hy *= uAmp; grad *= uAmp; vCrest = hy;
        vec3 objectNormal = normalize(vec3(-grad.x, 1.0, -grad.y));`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position); transformed.y += hy;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCrest;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(0.25, 0.45, 0.6) * smoothstep(0.45, 0.9, vCrest);');
  };
  const m = new THREE.Mesh(geo, mat); m.position.set(center[0], y, center[1]); m.receiveShadow = true;
  return { mesh: tag(m, SET.PROP), U, mat };
}

// seabed material: vertex colours + animated caustic light (emissive) from above
export function causticMaterial(U, base = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, ...base });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp; uniform float uTime; uniform float uCaustic;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 cp = vWp.xz * 0.45;
        float c1 = sin(cp.x * 2.1 + uTime * 0.9 + sin(cp.y * 1.7 + uTime * 0.6) * 1.5);
        float c2 = sin(cp.y * 2.4 - uTime * 0.8 + sin(cp.x * 1.3 - uTime * 0.5) * 1.5);
        float cau = pow(max(0.0, 1.0 - abs(c1 + c2) * 0.6), 6.0);
        totalEmissiveRadiance += vec3(0.25, 0.75, 0.9) * cau * uCaustic;`);
  };
  return mat;
}

// ---------------------------------------------------------------------------
// Fish school: instanced small fish that orbit a centre and flee from a point
// ---------------------------------------------------------------------------
export function makeFishSchool(n = 260, color = [0.5, 1.4, 1.8]) {
  const geo = new THREE.ConeGeometry(0.1, 0.5, 5); geo.rotateX(PI / 2);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x8ab8d8, roughness: 0.3, metalness: 0.5, emissive: new THREE.Color(...color), emissiveIntensity: 0.9 }), n);
  im.frustumCulled = false; tag(im, SET.METAL);
  const F = [...Array(n)].map((_, i) => ({ r: 2 + hash2(i, 1) * 4, y: (hash2(i, 2) - 0.5) * 3, ph: hash2(i, 3) * 6.28, sp: 0.6 + hash2(i, 4) * 0.5, s: 0.7 + hash2(i, 5) * 0.8 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1), v = new THREE.Vector3();
  // center: Vector3, flee: Vector3|null (the hero), scatter: 0..1 (everything bolts outward)
  function set(t, center, flee = null, scatter = 0, show = 1) {
    for (let i = 0; i < n; i++) {
      const f = F[i], a = f.ph + t * f.sp;
      p.set(center.x + Math.cos(a) * f.r, center.y + f.y + Math.sin(t * 0.7 + f.ph) * 0.4, center.z + Math.sin(a) * f.r);
      v.set(-Math.sin(a), 0.05 * Math.cos(t + f.ph), Math.cos(a));
      if (flee) { const d = p.clone().sub(flee), dl = d.length(); if (dl < 2.5) { p.addScaledVector(d.normalize(), (2.5 - dl) * 0.9); } }
      if (scatter > 0) { const out = p.clone().sub(center).normalize(); p.addScaledVector(out, scatter * 25 * (0.5 + f.sp)); v.lerp(out, scatter); }
      q.setFromUnitVectors(z, v.normalize()); sc.setScalar(show > 0 ? f.s * show : 1e-4);
      im.setMatrixAt(i, m4.compose(p, q, sc));
    }
    im.instanceMatrix.needsUpdate = true;
  }
  return { im, set };
}

// ---------------------------------------------------------------------------
// Leviathan: instanced body segments along a path(s, t) (s in metres from the head), fins, glowing spots,
// a big head with one eye and a brow socket that holds a gate key.
// ---------------------------------------------------------------------------
export function makeLeviathan({ segs = 70, spacing = 3.2, radius = 4.2 } = {}) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x3a5a8a, roughness: 0.45, metalness: 0.25, flatShading: true, emissive: 0x0a1a3a, emissiveIntensity: 1 });
  const spotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.6, 2.2), fog: false });
  const body = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), skin, segs); body.frustumCulled = false; g.add(tag(body, SET.ROCK));
  const spots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), spotMat, segs * 2); spots.frustumCulled = false; g.add(tag(spots, SET.ENERGY));
  const finGeo = new THREE.ConeGeometry(1, 1, 3); finGeo.rotateX(-PI / 2); finGeo.scale(0.25, 1, 1);
  const fins = new THREE.InstancedMesh(finGeo, skin, segs); fins.frustumCulled = false; g.add(tag(fins, SET.ROCK));
  const prof = s => { const u = s / segs; return radius * (u < 0.08 ? 0.75 + u * 3 : (1 - Math.pow(u, 1.6) * 0.92)); };
  // head
  const head = new THREE.Group(); g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.25, 18, 12), skin); skull.scale.set(1, 0.75, 1.6); head.add(tag(skull, SET.ROCK));
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.05, 14, 10, 0, PI * 2, PI / 2, PI / 2), skin); jaw.scale.set(1, 0.6, 1.5); jaw.position.set(0, -radius * 0.35, radius * 0.4); head.add(tag(jaw, SET.ROCK));
  const brow = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.6, radius * 0.25, radius * 1.4), skin); brow.position.set(0, radius * 0.85, radius * 0.6); brow.rotation.x = 0.2; head.add(tag(brow, SET.ROCK));
  for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.25, radius * 2.4, 5), skin); h.position.set(sx * radius * 0.8, radius * 0.7, -radius * 0.9); h.rotation.set(-1.9, 0, sx * 0.4); head.add(tag(h, SET.ROCK)); }
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xe8d8a8, roughness: 0.1, metalness: 0.1, emissive: 0x8a6a2a, emissiveIntensity: 1.2 });
  const eye = new THREE.Group(); eye.position.set(radius * 1.02, radius * 0.25, radius * 1.1); head.add(eye);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.42, 20, 14), eyeWhite); eye.add(tag(ball, SET.SUIT));
  const iris = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.3, 18, 12, 0, PI * 2, 0, PI * 0.35), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 0.3), fog: false }));
  iris.rotation.z = -PI / 2; iris.position.x = radius * 0.16; eye.add(tag(iris, SET.ENERGY));
  const pupil = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.05, radius * 0.4, radius * 0.08), new THREE.MeshBasicMaterial({ color: 0x000000 })); pupil.position.x = radius * 0.43; eye.add(tag(pupil, SET.ROCK));
  const lid = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.46, 18, 10, 0, PI * 2, 0, PI / 2), skin); lid.rotation.z = -PI / 2; eye.add(tag(lid, SET.ROCK));
  const socket = new THREE.Group(); socket.position.set(0, radius * 1.02, radius * 1.15); head.add(socket);    // the key sits here
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), zA = new THREE.Vector3(0, 0, 1), tng = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  // path(s, t) -> Vector3 position of the body point s metres behind the head
  function set(t, path, { glow = 1, eyeOpen = 1, mouth = 0, lookAt = null } = {}) {
    for (let i = 0; i < segs; i++) {
      const s = i * spacing, a = path(s, t), b = path(s + 0.5, t);
      tng.copy(a).sub(b).normalize(); q.setFromUnitVectors(zA, tng);
      const r = prof(i); sc.set(r, r * 0.85, spacing * 0.95); body.setMatrixAt(i, m4.compose(a, q, sc));
      for (const sd of [-1, 1]) {
        const side = new THREE.Vector3().crossVectors(tng, up).normalize();
        const pp = a.clone().addScaledVector(side, sd * r * 0.82).addScaledVector(up, r * 0.25);
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 - i * 0.35);
        sc.setScalar(i % 2 ? 0.0001 : r * 0.17 * (0.6 + 0.8 * pulse) * glow); spots.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4.compose(pp, q, sc));
      }
      sc.set(r * 1.6, r * 1.4, r * 1.6); const fp = a.clone().addScaledVector(up, r * 0.75);
      fins.setMatrixAt(i, m4.compose(fp, q, i % 5 === 2 ? sc : sc.setScalar(0.0001)));
    }
    body.instanceMatrix.needsUpdate = spots.instanceMatrix.needsUpdate = fins.instanceMatrix.needsUpdate = true;
    const h0 = path(-radius * 1.2, t), h1 = path(0.5, t);
    head.position.copy(h0); tng.copy(h0).sub(h1).normalize(); head.quaternion.setFromUnitVectors(zA, tng);
    jaw.rotation.x = 0.35 * mouth;
    lid.rotation.set(0, 0, -PI / 2 + (1 - eyeOpen) * 0.0); lid.scale.setScalar(1); lid.rotation.y = -PI * 0.5 * eyeOpen;
    if (lookAt) { const lp = eye.worldToLocal(lookAt.clone()); iris.lookAt(lookAt); }
    spotMat.color.setRGB(0.4, 1.6, 2.2).multiplyScalar(glow);
  }
  return { g, set, head, eye, socket, spotMat, skin, radius };
}

// additive light shafts from the surface
export function makeLightShafts(n = 10, len = 40, color = [0.3, 0.6, 0.8]) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4 + hash2(i, 1) * 1.6, 2 + hash2(i, 2) * 3, len, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(...color), transparent: true, opacity: 0.08 + hash2(i, 3) * 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.position.set((hash2(i, 4) - 0.5) * 50, -len / 2, (hash2(i, 5) - 0.5) * 50); m.rotation.set((hash2(i, 6) - 0.5) * 0.3, 0, (hash2(i, 7) - 0.5) * 0.3);
    g.add(tag(m, SET.ENERGY, true));
  }
  return g;
}
