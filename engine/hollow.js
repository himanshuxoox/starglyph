// The Hollow (original design): skeletal machines of black bone-like metal, one red slit eye,
// sickle-shaped skull crest, exposed ribcage with a red core, long three-claw arms,
// digitigrade legs, segmented spiked tail.
//   makeHollow('scout')  -> single hero villain (cloak / de-cloak dissolve)
//   makeHollowArmy(n)    -> n soldiers, one InstancedMesh per body part (cheap to draw)
//   poseHollow(rig, {...}) works for both
import * as THREE from 'three';
import { SET, tag, hash2 } from './ascii.js';

// ---------------------------------------------------------------------------
// cloak: dissolve in blocky world-space cells (reads as glyphs "filling in"), fresnel ghost
// ---------------------------------------------------------------------------
export function cloakable(mat, U, edge = [2.2, 0.25, 0.3]) {
  mat.transparent = true;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCW; uniform float uReveal; uniform float uGhost; uniform float uTime;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float cn = fract(sin(dot(floor(vCW * 7.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float rv = uReveal * 1.3 - 0.15;
        float on = step(cn, rv), edge = on - step(cn, rv - 0.14);
        vec3 cnN = normalize(cross(dFdx(vCW), dFdy(vCW)));
        float fr = pow(1.0 - abs(dot(cnN, normalize(cameraPosition - vCW))), 2.0);
        vec3 ghost = vec3(0.35, 0.5, 1.5) * fr * uGhost * (0.65 + 0.35 * sin(uTime * 9.0 + vCW.y * 7.0));
        gl_FragColor.rgb = mix(ghost, gl_FragColor.rgb + edge * vec3(${edge.map(v => v.toFixed(2)).join(', ')}), on);
        gl_FragColor.a = mix(min(1.0, fr * uGhost * 1.2), 1.0, on);`);
  };
  return mat;
}

const boneMat = () => new THREE.MeshStandardMaterial({ color: 0x8c8a9c, roughness: 0.3, metalness: 0.45, emissive: 0x0c0a12, flatShading: true });
const redMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.16, 0.2), fog: false });

// ---------------------------------------------------------------------------
// builder. P = proportions
// ---------------------------------------------------------------------------
const SCOUT = { pelvisH: 1.5, spine: 0.25, nSpine: 4, thick: 1.45, arm: [0.78, 0.82], leg: [0.78, 0.72, 0.42], tail: 10, tailLen: 0.15, crest: 1.0, plates: 0, claw: 0.36 };
const SOLDIER = { pelvisH: 1.05, spine: 0.21, nSpine: 3, thick: 1.9, arm: [0.55, 0.6], leg: [0.52, 0.5, 0.3], tail: 4, tailLen: 0.13, crest: 0.45, plates: 1, claw: 0.26 };

function build(P, bone, red) {
  const add = (parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(...s); m.castShadow = true; parent.add(m); return m;
  };
  const T = P.thick;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const pelvis = new THREE.Group(); pelvis.position.y = P.pelvisH; body.add(pelvis);
  add(pelvis, new THREE.SphereGeometry(0.15 * T, 8, 6), bone, 0, 0, 0, 0, 0, 0, [1.25, 0.6, 0.9]);
  add(pelvis, new THREE.ConeGeometry(0.06 * T, 0.25, 5), bone, 0.12 * T, -0.05, 0, 0, 0, -2.3);
  add(pelvis, new THREE.ConeGeometry(0.06 * T, 0.25, 5), bone, -0.12 * T, -0.05, 0, 0, 0, 2.3);

  // spine chain
  const spine = []; let parent = pelvis;
  for (let i = 0; i < P.nSpine; i++) {
    const s = new THREE.Group(); s.position.y = i === 0 ? 0.06 : P.spine; parent.add(s);
    add(s, new THREE.CylinderGeometry(0.045 * T, 0.055 * T, P.spine * 0.9, 6), bone, 0, P.spine / 2, 0);
    add(s, new THREE.SphereGeometry(0.06 * T, 6, 4), bone, 0, P.spine * 0.95, 0, 0, 0, 0, [1.3, 0.5, 1.1]);
    add(s, new THREE.ConeGeometry(0.035 * T, 0.16 + 0.04 * i, 4), bone, 0, P.spine * 0.6, -0.08 * T, -2.4);
    if (P.plates) add(s, new THREE.BoxGeometry(0.34 * T, 0.05, P.spine * 1.1), bone, 0, P.spine * 0.6, -0.1 * T, 0.25, 0, 0);
    spine.push(s); parent = s;
  }
  // chest / ribcage + red core
  const chest = new THREE.Group(); chest.position.y = P.spine; parent.add(chest);
  for (let k = 0; k < 5; k++) {
    const r = (0.2 - Math.abs(k - 1.5) * 0.025) * T;
    add(chest, new THREE.TorusGeometry(r, 0.018 * T, 4, 14, Math.PI * 1.55), bone, 0, -0.05 - k * 0.075, 0.03, Math.PI / 2, 0, Math.PI * 0.72 + Math.PI, [1, 0.8, 1]);
  }
  add(chest, new THREE.BoxGeometry(0.035 * T, 0.38, 0.03), bone, 0, -0.18, 0.2 * T);   // sternum
  const core = add(chest, new THREE.SphereGeometry(0.075 * T, 8, 6), red, 0, -0.2, 0.02);
  // shoulder blades
  add(chest, new THREE.BoxGeometry(0.2 * T, 0.22, 0.03), bone, 0.12 * T, -0.06, -0.12 * T, 0.3, 0.4, 0);
  add(chest, new THREE.BoxGeometry(0.2 * T, 0.22, 0.03), bone, -0.12 * T, -0.06, -0.12 * T, 0.3, -0.4, 0);

  // neck + head (long sickle skull, slit eye)
  const neck = new THREE.Group(); neck.position.set(0, 0.02, 0.05); chest.add(neck);
  add(neck, new THREE.CylinderGeometry(0.035 * T, 0.045 * T, 0.2, 5), bone, 0, 0.1, 0);
  const head = new THREE.Group(); head.position.y = 0.2; neck.add(head);
  add(head, new THREE.SphereGeometry(0.13, 8, 6), bone, 0, 0.02, 0.06, 0, 0, 0, [0.85 * Math.sqrt(T), 0.8, 1.7]);       // skull
  add(head, new THREE.ConeGeometry(0.08, 0.32, 5), bone, 0, -0.04, 0.26, Math.PI / 2 + 0.25, 0, 0, [0.9, 1, 0.6]);       // snout blade
  add(head, new THREE.BoxGeometry(0.09, 0.03, 0.22), bone, 0, -0.1, 0.14, -0.15);                                        // jaw
  const crest = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.08, 0.2), new THREE.Vector3(0, 0.2, 0.0), new THREE.Vector3(0, 0.26, -0.28), new THREE.Vector3(0, 0.16, -0.55)].map(v => v.multiplyScalar(P.crest)));
  add(head, new THREE.TubeGeometry(crest, 10, 0.035, 4), bone, 0, 0, 0, 0, 0, 0, [1.4, 1, 1]);
  add(head, new THREE.ConeGeometry(0.035, 0.18 * P.crest, 4), bone, 0, 0.16 * P.crest, -0.6 * P.crest, -2.2);
  const eye = add(head, new THREE.BoxGeometry(0.022, 0.1, 0.03), red, 0, 0.02, 0.27, -0.5);       // red slit
  const eye2 = add(head, new THREE.SphereGeometry(0.03 * Math.sqrt(T), 6, 4), red, 0, 0.0, 0.25, 0, 0, 0, [0.8, 1.4, 0.8]);

  // arms (shoulder -> elbow -> wrist with 3 long claws)
  const arm = s => {
    const sh = new THREE.Group(); sh.position.set(s * 0.22 * T, -0.06, 0.02); chest.add(sh);
    add(sh, new THREE.SphereGeometry(0.07 * T, 6, 5), bone, 0, 0, 0);
    add(sh, new THREE.CylinderGeometry(0.035 * T, 0.045 * T, P.arm[0], 5), bone, 0, -P.arm[0] / 2, 0);
    add(sh, new THREE.BoxGeometry(0.1 * T, 0.28, 0.08 * T), bone, s * 0.03, -0.12, 0, 0, 0, s * 0.15);           // armour plate
    const el = new THREE.Group(); el.position.y = -P.arm[0]; sh.add(el);
    add(el, new THREE.SphereGeometry(0.045 * T, 5, 4), bone);
    add(el, new THREE.CylinderGeometry(0.028 * T, 0.04 * T, P.arm[1], 5), bone, 0, -P.arm[1] / 2, 0);
    add(el, new THREE.ConeGeometry(0.03 * T, 0.34, 4), bone, 0, -0.15, -0.06 * T, Math.PI - 0.35);               // elbow blade
    add(el, new THREE.BoxGeometry(0.07 * T, P.arm[1] * 0.55, 0.06 * T), bone, 0, -P.arm[1] * 0.45, 0.01);        // forearm guard
    const wr = new THREE.Group(); wr.position.y = -P.arm[1]; el.add(wr);
    add(wr, new THREE.BoxGeometry(0.1 * T, 0.08, 0.06), bone, 0, -0.03, 0);
    const claws = [];
    for (const [cx, cz] of [[-0.045, 0.02], [0.0, 0.035], [0.045, 0.02]]) {
      const c = new THREE.Group(); c.position.set(cx * T, -0.06, cz); wr.add(c);
      add(c, new THREE.ConeGeometry(0.016 * T, P.claw, 4), bone, 0, -P.claw / 2, 0, Math.PI);
      c.rotation.x = 0.35; claws.push(c);
    }
    return { sh, el, wr, claws };
  };
  // digitigrade legs
  const leg = s => {
    const hip = new THREE.Group(); hip.position.set(s * 0.13 * T, -0.02, 0); pelvis.add(hip);
    add(hip, new THREE.CylinderGeometry(0.04 * T, 0.055 * T, P.leg[0], 5), bone, 0, -P.leg[0] / 2, 0);
    add(hip, new THREE.BoxGeometry(0.11 * T, P.leg[0] * 0.6, 0.09 * T), bone, s * 0.02, -P.leg[0] * 0.4, 0.03, 0.1, 0, 0);       // thigh plate
    const knee = new THREE.Group(); knee.position.y = -P.leg[0]; hip.add(knee);
    add(knee, new THREE.SphereGeometry(0.05 * T, 5, 4), bone);
    add(knee, new THREE.ConeGeometry(0.03, 0.18, 4), bone, 0, 0.02, 0.06, 0.6);                                  // knee spike
    add(knee, new THREE.CylinderGeometry(0.03 * T, 0.04 * T, P.leg[1], 5), bone, 0, -P.leg[1] / 2, 0);
    const ankle = new THREE.Group(); ankle.position.y = -P.leg[1]; knee.add(ankle);
    add(ankle, new THREE.CylinderGeometry(0.025 * T, 0.03 * T, P.leg[2], 5), bone, 0, -P.leg[2] / 2, 0);
    const foot = new THREE.Group(); foot.position.y = -P.leg[2]; ankle.add(foot);
    for (const cx of [-0.05, 0.0, 0.05]) add(foot, new THREE.ConeGeometry(0.018 * T, 0.2, 4), bone, cx * T, 0, 0.09, Math.PI / 2, 0, 0);
    add(foot, new THREE.ConeGeometry(0.016 * T, 0.12, 4), bone, 0, 0, -0.06, -Math.PI / 2, 0, 0);
    return { hip, knee, ankle, foot };
  };
  // tail
  const tail = []; parent = pelvis;
  for (let i = 0; i < P.tail; i++) {
    const g = new THREE.Group(); g.position.set(0, i === 0 ? 0 : 0, i === 0 ? -0.12 : -P.tailLen); parent.add(g);
    const w = 1 - i / (P.tail + 2);
    add(g, new THREE.CylinderGeometry(0.03 * w * T, 0.04 * w * T, P.tailLen, 5), bone, 0, 0, -P.tailLen / 2, Math.PI / 2);
    add(g, new THREE.ConeGeometry(0.025 * w * T, 0.11 * w, 4), bone, 0, 0.05, -P.tailLen / 2, -0.4);
    tail.push(g); parent = g;
  }
  if (P.tail) add(parent, new THREE.ConeGeometry(0.03 * T, 0.32, 4), bone, 0, 0, -0.22, -Math.PI / 2);

  const rig = { root, body, pelvis, spine, chest, neck, head, core, eye, eye2, crest, armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1), tail, P };
  tag(root, SET.METAL);
  root.traverse(o => { if (o.isMesh && o.material === red) o.userData.set = SET.ENERGY; });
  return rig;
}

// ---------------------------------------------------------------------------
// pose. crawl 0 = standing tall, 1 = on all fours. walk 0..1, phase radians.
// rise 0..1 (soldiers clawing up out of the ground), reach -> right arm strike, look (head yaw)
// ---------------------------------------------------------------------------
export function poseHollow(r, { crawl = 0, walk = 0, phase = 0, t = 0, rise = 1, reach = 0, look = 0, lookUp = 0, twitch = 0, sprawl = 0 } = {}) {
  const P = r.P, s = Math.sin(phase), c = Math.cos(phase), sR = -s;
  const lift = x => Math.max(0, x);
  const breathe = Math.sin(t * 2.1) * 0.03;
  const bob = 0.05 * Math.abs(Math.cos(phase)) * walk;
  // body height: stand -> crawl -> rising from the ground
  r.pelvis.position.y = P.pelvisH * (1 - 0.38 * crawl) - bob + (rise - 1) * P.pelvisH * 1.4;
  const spineP = 0.18 + 1.25 * crawl + 0.5 * (1 - rise) - 0.15 * sprawl;
  r.spine.forEach((g, i) => g.rotation.set(spineP / r.spine.length + (i === 0 ? 0 : breathe * 0.4), 0.08 * s * walk, 0.04 * Math.sin(t * 1.7 + i) * twitch));
  // head stays level-ish and hunts
  r.neck.rotation.set(-spineP * 0.65 - lookUp * 0.6 + 0.12, look * 0.6, 0);
  r.head.rotation.set(-spineP * 0.25 - lookUp * 0.4 + 0.08 * Math.sin(t * 13) * twitch, look * 0.5, Math.sin(t * 7.3) * 0.06 * twitch);
  // arms: standing -> hang with claws forward; crawl -> forelegs
  const armFwd = -spineP;
  const gait = (o, ph, side) => {
    const sw = Math.sin(ph), lf = lift(Math.cos(ph));
    o.sh.rotation.set(armFwd + 0.15 - (0.55 * sw * walk) * crawl - 0.35 * crawl + (1 - crawl) * (0.25 + 0.05 * sw * walk) - 0.9 * (1 - rise) * Math.max(0, Math.sin(t * 5 + side)), 0, side * (0.18 + 0.12 * (1 - crawl)));
    o.el.rotation.set(-0.35 - 0.6 * crawl * (0.6 + 0.6 * lf * walk) - 0.6 * (1 - crawl), 0, 0);
    o.wr.rotation.set(0.25 + 0.6 * crawl, 0, 0);
    o.claws.forEach((k, i) => { k.rotation.x = 0.35 + 0.25 * crawl + 0.2 * Math.sin(t * 3 + i + side) * twitch; });
  };
  gait(r.armL, phase + Math.PI, 1); gait(r.armR, phase, -1);
  if (reach > 0) {
    const w = Math.min(1, reach), o = r.armR;
    o.sh.rotation.x += (-2.2 - spineP * 0.3 - o.sh.rotation.x) * w; o.el.rotation.x += (-0.25 - o.el.rotation.x) * w;
  }
  // digitigrade legs: hip forward, knee back, ankle forward
  const leg = (o, ph, side) => {
    const sw = Math.sin(ph), lf = lift(Math.cos(ph));
    const crouch = 0.25 + 0.45 * crawl + 0.9 * (1 - rise);
    o.hip.rotation.set(-0.35 * crouch - 0.55 * sw * walk + 0.3 * sprawl, 0, side * (0.06 + 0.1 * crawl));
    o.knee.rotation.set(0.9 * crouch + 0.7 * lf * walk + 0.25, 0, 0);
    o.ankle.rotation.set(-0.75 * crouch - 0.35 * lf * walk - 0.35, 0, 0);
    o.foot.rotation.set(0.2 * crouch - 0.2 * lf * walk + 0.1, 0, 0);
  };
  leg(r.legL, phase, 1); leg(r.legR, phase + Math.PI, -1);
  // tail sways (counter to the gait) and lifts when crawling
  r.tail.forEach((g, i) => g.rotation.set(0.07 + 0.05 * crawl + 0.04 * Math.sin(t * 1.3 + i * 0.6), 0.12 * Math.sin(t * 1.6 - i * 0.5 + phase * 0.5) * (0.4 + walk), 0));
}

// ---------------------------------------------------------------------------
export function makeHollow(kind = 'scout') {
  const U = { uReveal: { value: 1 }, uGhost: { value: 0 }, uTime: { value: 0 } };
  const bone = cloakable(boneMat(), U), red = cloakable(redMat(), U);
  const rig = build(kind === 'scout' ? SCOUT : SOLDIER, bone, red);
  rig.U = U; rig.bone = bone; rig.red = red;
  rig.setCloak = (reveal, ghost, t) => {
    U.uReveal.value = reveal; U.uGhost.value = ghost; U.uTime.value = t;
    const hidden = reveal < 0.01 && ghost < 0.01;
    rig.root.visible = !hidden;
    // half-revealed: keep it in the ID pass so the cloaked shape shimmers as METAL glyphs
    rig.root.traverse(o => { if (o.isMesh) o.userData.noId = reveal < 0.08; });
  };
  return rig;
}

// ---------------------------------------------------------------------------
// Army: pose a single template rig per soldier and copy part matrices into InstancedMeshes
// ---------------------------------------------------------------------------
export function makeHollowArmy(n) {
  const bone = boneMat(), red = redMat();
  const tpl = build(SOLDIER, bone, red);
  const parts = [];
  tpl.root.traverse(o => { if (o.isMesh) parts.push(o); });
  const group = new THREE.Group();
  const inst = parts.map(p => {
    const im = new THREE.InstancedMesh(p.geometry, p.material, n);
    im.frustumCulled = false; im.castShadow = false;
    if (p.material === red) { im.userData.set = SET.ENERGY; for (let i = 0; i < n; i++) im.setColorAt(i, new THREE.Color(1, 1, 1)); }
    else im.userData.set = SET.METAL;
    group.add(im); return im;
  });
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), col = new THREE.Color();
  // S: array of { on, x, y, z, rotY, scale, pose:{...}, eye: 0..1, tilt:[rx,rz] }
  function set(S) {
    for (let i = 0; i < n; i++) {
      const s = S[i];
      if (!s || !s.on) { for (const im of inst) im.setMatrixAt(i, zero); continue; }
      tpl.root.position.set(s.x, s.y, s.z); tpl.root.rotation.set(s.rx || 0, s.rotY, s.rz || 0, 'YXZ'); tpl.root.scale.setScalar(s.scale || 1);
      poseHollow(tpl, s.pose);
      tpl.root.updateMatrixWorld(true);
      parts.forEach((p, k) => {
        inst[k].setMatrixAt(i, p.matrixWorld);
        if (p.material === red) inst[k].setColorAt(i, col.setScalar(s.eye ?? 1));
      });
    }
    for (const im of inst) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }
  return { group, set, n, parts: inst };
}
