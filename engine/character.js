// Commander Dev Rao: human astronaut in a light armoured EVA suit (original design).
// Soft fabric suit with armour only on chest/shoulders/forearms/shins, open glass visor with a
// visible face, compact life-support pack, carbine slung on the back.
// Rig: pelvis/spine/neck, shoulder+elbow, hip+knee. poseHero() gives a natural human gait.
import * as THREE from 'three';
import { SET, tag } from './ascii.js';

export function makeHero() {
  const fabric = new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.9, metalness: 0.0 });
  const fabricDark = new THREE.MeshStandardMaterial({ color: 0x4a505c, roughness: 0.85 });
  const armour = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.4, metalness: 0.1 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6, emissive: 0x3a1000 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc08055, roughness: 0.65, emissive: 0x2a1408 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.18, depthWrite: false });
  const cyan = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.6, 1.8), fog: false });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2d3038, roughness: 0.6, metalness: 0.4 });

  const add = (geo, mat, x, y, z, parent, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = mat !== glass; parent.add(m); return m;
  };
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 12);
  const sph = r => new THREE.SphereGeometry(r, 20, 14);

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);          // pelvis: bob / sway / crouch
  const pelvis = new THREE.Group(); pelvis.position.y = 0.98; body.add(pelvis);
  add(cap(0.12, 0.12), fabric, 0, 0, 0, pelvis).rotation.z = Math.PI / 2;
  add(new THREE.TorusGeometry(0.15, 0.025, 6, 20), fabricDark, 0, 0.06, 0, pelvis, 1, 1, 0.75).rotation.x = Math.PI / 2; // belt

  // ---- spine / torso (lathe profile: waist -> ribcage -> shoulders) ----
  const torso = new THREE.Group(); torso.position.y = 0.06; pelvis.add(torso);
  const prof = [[0.12, 0], [0.135, 0.08], [0.13, 0.18], [0.155, 0.3], [0.18, 0.42], [0.185, 0.5], [0.15, 0.57], [0.07, 0.61], [0.05, 0.63]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const chestMesh = add(new THREE.LatheGeometry(prof, 20), fabric, 0, 0, 0, torso, 1.15, 1, 0.72);
  // chest armour plate + collar ring
  add(new THREE.SphereGeometry(0.2, 20, 12, -Math.PI / 2.6, Math.PI / 1.3, Math.PI * 0.25, Math.PI * 0.32), armour, 0, 0.36, 0.0, torso, 1.12, 1.05, 0.8);
  add(new THREE.TorusGeometry(0.1, 0.025, 6, 18), armour, 0, 0.6, 0, torso, 1.1, 1, 0.9).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.06, 0.03, 0.01), orange, 0.08, 0.44, 0.15, torso);          // mission patch
  add(new THREE.BoxGeometry(0.012, 0.16, 0.01), cyan, -0.07, 0.36, 0.152, torso);          // status light strip
  // life-support pack (compact, rounded) + slung carbine
  add(cap(0.11, 0.2), armour, 0, 0.36, -0.2, torso, 1.25, 1, 0.75);
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 10), fabricDark, 0.1, 0.36, -0.27, torso);
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.26, 10), fabricDark, -0.1, 0.36, -0.27, torso);
  const gun = new THREE.Group(); gun.position.set(0, 0.34, -0.32); gun.rotation.set(0, 0, 0.9); torso.add(gun);
  add(new THREE.BoxGeometry(0.07, 0.62, 0.09), gunMat, 0, 0, 0, gun);
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 8), gunMat, 0, 0.42, 0, gun);
  add(new THREE.BoxGeometry(0.02, 0.3, 0.02), cyan, 0.04, 0.02, 0.03, gun);

  // ---- neck / head / helmet ----
  const neck = new THREE.Group(); neck.position.set(0, 0.62, 0.0); torso.add(neck);
  add(new THREE.CylinderGeometry(0.05, 0.055, 0.08, 12), skin, 0, 0.03, 0, neck);
  const head = new THREE.Group(); head.position.set(0, 0.15, 0.0); head.scale.setScalar(1.12); neck.add(head);
  add(sph(0.095), skin, 0, 0, 0.01, head, 0.9, 1.1, 1.0);                                    // face/skull
  add(new THREE.SphereGeometry(0.1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 0.015, -0.005, head, 0.95, 1.05, 1.02); // hair
  add(sph(0.012), hair, 0.032, 0.015, 0.088, head); add(sph(0.012), hair, -0.032, 0.015, 0.088, head);   // eyes
  add(new THREE.BoxGeometry(0.06, 0.012, 0.01), hair, 0, 0.042, 0.088, head);                // brow
  add(sph(0.016), skin, 0, -0.012, 0.1, head);                                              // nose
  add(new THREE.BoxGeometry(0.035, 0.008, 0.01), new THREE.MeshStandardMaterial({ color: 0x6a3a2a }), 0, -0.05, 0.088, head); // mouth
  // helmet: shell covers back/top, clear bubble visor in front, cyan rim
  const FRONT = Math.PI / 2; // SphereGeometry phi where the surface faces +z
  add(new THREE.SphereGeometry(0.17, 28, 18, FRONT + 0.85, Math.PI * 2 - 1.7), armour, 0, 0.005, 0, head, 1, 1.05, 1);   // shell (open at the face)
  add(new THREE.SphereGeometry(0.168, 24, 16, FRONT - 0.9, 1.8, 0.0, Math.PI * 0.8), glass, 0, 0.005, 0, head, 1, 1.05, 1); // bubble visor
  const headLight = new THREE.SpotLight(0xdff4ff, 0, 30, 0.42, 0.6, 1.2); headLight.position.set(0.12, 0.1, 0.1);
  const hlTarget = new THREE.Object3D(); hlTarget.position.set(0, -0.8, 4); head.add(headLight, hlTarget); headLight.target = hlTarget;
  add(new THREE.BoxGeometry(0.03, 0.04, 0.05), cyan, 0.15, 0.08, 0.06, head);              // lamp

  // ---- limbs ----
  const limb = (s, isArm) => {
    const shoulder = new THREE.Group(), joint = new THREE.Group();
    if (isArm) {
      shoulder.position.set(s * 0.22, 0.52, 0); torso.add(shoulder);
      add(sph(0.068), fabric, 0, 0, 0, shoulder);                                           // deltoid
      add(new THREE.SphereGeometry(0.085, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), armour, s * 0.01, 0.01, 0, shoulder, 1.05, 1, 1.1); // pad
      add(cap(0.052, 0.2), fabric, 0, -0.15, 0, shoulder);                                  // upper arm
      add(new THREE.CylinderGeometry(0.056, 0.056, 0.035, 12), orange, 0, -0.1, 0, shoulder); // arm band
      joint.position.y = -0.29; shoulder.add(joint);
      add(cap(0.047, 0.18), fabric, 0, -0.13, 0, joint);                                    // forearm
      add(cap(0.05, 0.1), armour, 0, -0.15, 0.008, joint, 1, 1, 1.05);                       // bracer
      add(cap(0.04, 0.05), fabricDark, 0, -0.29, 0.01, joint, 0.85, 1, 1.15);               // glove
      add(cap(0.014, 0.03), fabricDark, -s * 0.03, -0.27, 0.035, joint).rotation.x = 0.6;    // thumb
    } else {
      shoulder.position.set(s * 0.1, 0, 0); pelvis.add(shoulder);
      add(cap(0.082, 0.3), fabric, 0, -0.21, 0, shoulder);                                  // thigh
      add(new THREE.BoxGeometry(0.02, 0.18, 0.012), orange, s * 0.07, -0.2, 0.06, shoulder).rotation.y = s * 0.6;
      joint.position.y = -0.44; shoulder.add(joint);
      add(sph(0.062), armour, 0, 0, 0.03, joint, 1, 1, 0.9);                                // knee pad
      add(cap(0.066, 0.28), fabric, 0, -0.2, 0, joint);                                     // shin
      add(cap(0.07, 0.16), armour, 0, -0.2, 0.025, joint, 1, 1, 0.9);                       // shin guard
      add(cap(0.065, 0.16), fabricDark, 0, -0.44, 0.05, joint).rotation.x = Math.PI / 2;   // boot
    }
    return { shoulder, joint };
  };
  const armL = limb(1, true), armR = limb(-1, true), legL = limb(1, false), legR = limb(-1, false);

  tag(root, SET.SUIT);
  root.traverse(o => { if (o.isMesh && o.material === cyan) o.userData.set = SET.ENERGY; if (o.isMesh && o.material === glass) o.userData.noId = true; });

  return { root, body, pelvis, torso, chest: chestMesh, neck, head, armL, armR, legL, legR, gun, headLight, cyanMat: cyan, height: 1.86 };
}

// Natural human pose. walk 0..1, phase radians, t seconds (idle breathing), reach 0..1 right hand forward,
// crouch 0..1 (kneeling on right knee), lookUp -1..1
export function poseHero(h, { walk = 0, phase = 0, reach = 0, crouch = 0, lookUp = 0 } = {}, t = 0) {
  const s = Math.sin(phase), c = Math.cos(phase);
  const sR = Math.sin(phase + Math.PI), cR = Math.cos(phase + Math.PI);
  const kneeSwing = x => Math.max(0, x) ** 1.4;
  const idle = 1 - walk;
  const breath = Math.sin(t * 1.7);

  // legs: thigh forward = negative x. knee bends while the leg swings forward.
  h.legL.shoulder.rotation.set(-0.45 * s * walk - crouch * 1.45, 0, 0.03);
  h.legR.shoulder.rotation.set(-0.45 * sR * walk - crouch * 0.25, 0, -0.03);
  h.legL.joint.rotation.x = (0.06 + 1.0 * kneeSwing(c)) * walk + crouch * 1.55 + idle * 0.04;
  h.legR.joint.rotation.x = (0.06 + 1.0 * kneeSwing(cR)) * walk + crouch * 2.05 + idle * 0.04;

  // pelvis: bob (highest when legs pass), side sway, slight rotation; crouch drop
  h.body.position.set(0.025 * s * walk, (0.035 * Math.cos(2 * phase) - 0.02) * walk - crouch * 0.42 + idle * breath * 0.004, 0);
  h.pelvis.rotation.set(0, -0.08 * s * walk, 0.03 * s * walk);
  // torso counter-twist, forward lean when walking, breathing
  h.torso.rotation.set(0.07 * walk + crouch * 0.38, 0.14 * s * walk, -0.03 * s * walk);
  h.chest.scale.set(1.15 * (1 + breath * 0.012 * idle), 1, 0.72 * (1 + breath * 0.02 * idle));

  // arms swing opposite to legs, elbows soften on the back-swing
  const armSwingL = 0.42 * sR * walk, armSwingR = 0.42 * s * walk;
  h.armL.shoulder.rotation.set(armSwingL + crouch * -0.6, 0, 0.1 + idle * 0.04);
  h.armL.joint.rotation.set(-0.18 - 0.35 * Math.max(0, -armSwingL / 0.42) * walk - crouch * 0.7, 0, 0);
  h.armR.shoulder.rotation.set(armSwingR * (1 - reach) - reach * 1.35 + crouch * -0.15, 0, -0.1 - idle * 0.04 + reach * 0.12);
  h.armR.joint.rotation.set((-0.18 - 0.35 * Math.max(0, -armSwingR / 0.42) * walk) * (1 - reach) - reach * 0.12, 0, 0);

  // head stays level (counters torso), looks around
  h.neck.rotation.set(-0.06 * walk - lookUp * 0.5 - crouch * 0.15, -0.1 * s * walk, 0);
  h.head.rotation.set(-lookUp * 0.25, Math.sin(t * 0.4) * 0.08 * idle, 0);
}
