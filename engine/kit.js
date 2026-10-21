// Shared episode kit (Ep 4+): loading the episode JSON, the stage, terrain, HUD (captions, ECHO, visor,
// CTA), post-fx, and the window.renderAt contract used by render.mjs. Episodes only write their world,
// actors and timeline.
import * as THREE from 'three';
import { AsciiEngine, SET, tag, smooth, hash2, fbm, captionAt } from './ascii.js';

export const PI = Math.PI;
export const Q = (a, b, x) => smooth(a, b, x);
export const pulse = (t, t0, k = 3) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);
export const glow = (r, g, b, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), fog: false, ...o });
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1, ...o });
export const P2 = (x, z) => ({ x, z });
export const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const faceTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
export const lerpAng = (a, b, k) => { const d = ((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return a + d * k; };
export const ease = k => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
export function canvasTex(w, h, draw, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function loadEpisode(def) {
  const id = new URLSearchParams(location.search).get('ep') || def;
  const res = await fetch(`./episodes/ep${id}.json`);
  if (!res.ok) throw new Error(`episodes/ep${id}.json not found (HTTP ${res.status}) - is the episodes/ folder committed?`);
  const EP = await res.json();
  await Promise.all([
    document.fonts.load('800 40px "JetBrains Mono"'), document.fonts.load('600 30px "JetBrains Mono"'),
    document.fonts.load('500 22px "Saira Condensed"'), document.fonts.load('700 50px "Saira Condensed"'),
  ]);
  return EP;
}

export function makeStage({ fog = [0x30297a, 70, 700], sceneScale = 0.75, idScale = 0.5, fov = 58, far = 6000 } = {}) {
  const engine = new AsciiEngine(document.getElementById('c'), { sceneScale, idScale });
  const scene = new THREE.Scene();
  if (fog) scene.fog = new THREE.Fog(...fog);
  const camera = new THREE.PerspectiveCamera(fov, 720 / 1280, 0.05, far);
  const world = new THREE.Group(); scene.add(world);
  return { engine, scene, camera, world };
}

// vertex-coloured heightfield. H(x,z) height, col(x,z,c) -> sets c (THREE.Color)
export function makeTerrain({ H, size = 1600, seg = 260, center = [0, 0], col, set = SET.GRASS, mat = {} }) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-PI / 2); geo.translate(center[0], 0, center[1]);
  const p = geo.attributes.position, cols = [], c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, H(x, z)); col(x, z, c); cols.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, ...mat }));
  m.receiveShadow = true; return tag(m, set);
}

// simple instanced scatter of a geometry over an area (rocks, debris, shards)
export function scatter({ geo, mat, n, place, set = SET.ROCK, castShadow = false }) {
  const im = new THREE.InstancedMesh(geo, mat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const r = place(i); if (!r) { im.setMatrixAt(i, m4.makeScale(0, 0, 0)); continue; }
    p.set(r.x, r.y, r.z); e.set(r.rx || 0, r.ry || 0, r.rz || 0); q.setFromEuler(e);
    s.set(r.sx ?? r.s ?? 1, r.sy ?? r.s ?? 1, r.sz ?? r.s ?? 1); im.setMatrixAt(i, m4.compose(p, q, s));
  }
  im.castShadow = castShadow; im.receiveShadow = true; return tag(im, set);
}

// HUD: captions, ECHO lines (EP.echo), timed visor text, CTA, optional big centre card (EP.cards)
const GLYPHS = 'ΞΣΔΛΠΦΨΩ⌬⟁⟟⊗⊕⋔⌖⍜⍟';
export function makeHud(EP, { visor = [], echoColor = '#7ff7ff' } = {}) {
  const $ = id => document.getElementById(id);
  $('tag').textContent = EP.series; $('title').textContent = EP.title;
  $('glitch').style.whiteSpace = 'pre'; $('glitch').style.lineHeight = '1.15'; $('glitch').style.color = echoColor;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cards = EP.cards || [];
  return function hud(t) {
    const c = captionAt(EP.captions, t, 30);
    const cur = c && (c.typing || Math.floor(t * 2.6) % 2 === 0) ? '<span id="cur"></span>' : '';
    $('cap').innerHTML = c ? esc(c.text) + cur : ''; $('cap').style.opacity = c ? c.fade : 0;
    const v = visor.find(x => t > x[0] && t < x[1]);
    if (v) { const n = Math.floor((t - v[0]) * 45); $('visor').textContent = v[2].slice(0, Math.max(0, n)); $('visor').style.opacity = (1 - Q(v[1] - 0.5, v[1], t)) * (Math.sin(t * 50) > -0.9 ? 1 : 0.6); }
    else $('visor').style.opacity = 0;
    const e = (EP.echo || []).find(x => t >= x.t0 && t < x.t1), gl = $('glitch');
    if (e) {
      const k = Q(e.t0 + 0.05, e.t0 + 0.7, t), j = Math.floor(t * 20);
      let s = '';
      for (let i = 0; i < e.text.length; i++) { const ch = e.text[i]; s += (i / e.text.length) < k || ch === ' ' || ch === '\n' ? ch : GLYPHS[Math.floor(hash2(i, j) * GLYPHS.length)]; }
      gl.textContent = s; gl.style.opacity = (1 - Q(e.t1 - 0.3, e.t1, t)) * (hash2(j, 3) > 0.08 ? 1 : 0.3);
      const dx = (hash2(j, 1) - 0.5) * 8 * (1 - k * 0.8);
      gl.style.color = e.color || echoColor;
      gl.style.transform = `translateX(${dx}px)`; gl.style.textShadow = `${dx}px 0 #ff2a6d, ${-dx}px 0 #19f0ff, 0 0 18px ${e.color || '#0ff'}, 0 0 4px #000`;
    } else gl.style.opacity = 0;
    const big = cards.find(x => t >= x.t0 && t < x.t1);
    $('big').style.opacity = big ? Q(big.t0, big.t0 + 0.4, t) * (1 - Q(big.t1 - 0.4, big.t1, t)) : 0;
    if (big) { $('big').textContent = big.text; $('big').style.fontSize = (big.size || 96) + 'px'; $('big').style.color = big.color || '#fff'; $('big').style.textShadow = `0 0 24px ${big.color || '#7ff7ff'}, 0 3px 8px #000`; }
    const cta = EP.events && EP.events.cta;
    $('cta').style.opacity = cta ? Q(cta[0], cta[0] + 0.3, t) : 0; $('cta').textContent = EP.cta || '';
    $('tag').style.opacity = 0.85; $('title').style.opacity = 1;
  };
}

// glitch the ASCII when ECHO speaks; flash list [[t0, amount, decay]]
export function postFx(engine, EP, t, { exposure = 2.8, flashes = [], glitch = 0 } = {}) {
  const u = engine.u; u.time.value = t; u.exposure.value = exposure;
  u.flash.value = flashes.reduce((s, [t0, a, k]) => s + a * pulse(t, t0, k ?? 5), 0);
  const eg = (EP.echo || []).find(e => t >= e.t0 && t < e.t1);
  u.glitch.value = Math.max(glitch, eg ? (t - eg.t0 < 0.5 ? 0.25 : 0.03) : 0);
}

export function run({ EP, engine, scene, camera, update, hud, dbg = {}, clear = null }) {
  const black = new THREE.Color(0, 0, 0);
  window.renderAt = t => { update(t); engine.render(scene, camera, clear ? clear(t) || black : black); hud(t); };
  window.EP = EP; window.__dbg = { engine, scene, camera, ...dbg };
  window.renderAt(0);
  window.READY = true;
}

// keep the camera above ground, aim it
export function aim(camera, pos, look, H, fov = 58, minH = 0.15) {
  camera.position.copy(pos);
  if (H) camera.position.y = Math.max(camera.position.y, H(pos.x, pos.z) + minH);
  camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(look);
}

// footsteps for audio from a devState(t) function with {walk, run, phase}
export function footsteps(devState, dur, extra = () => ({})) {
  const F = []; let prev = null;
  for (let t = 0; t < dur; t += 1 / 240) {
    const S = devState(t); if ((S.walk || 0) < 0.35 || S.air > 0.3) { prev = null; continue; }
    const k = Math.floor(S.phase / PI); if (prev !== null && k !== prev) F.push({ t: +t.toFixed(3), water: false, run: (S.run || 0) > 0.5, ...extra(S) }); prev = k;
  }
  return F;
}
export { THREE, SET, tag, smooth, hash2, fbm };
