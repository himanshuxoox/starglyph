// ASCII render engine: scene -> colour pass + glyph-set ID pass -> glyph post-process.
// Every mesh carries userData.set (glyph set index). userData.noId hides it from the ID pass.
import * as THREE from 'three';

// Each row = 16 glyphs from empty to dense. Row index = glyph set.
export const GLYPH_SETS = [
  ' .,:;+*xoXO0#%&@',   // 0 generic / props
  ' .`\',:;*+xo%#&@$',  // 1 regolith / rock
  ' .:+|/\\[]{}=#ΞΣ@',  // 2 hull / alien metal / crystal
  ' .\'`*+xX*+oO0#@&',  // 3 sky (procedural stars)
  ' .:-01lI10O0$#@&',   // 4 energy / glow
  ' .:+=*o#%&@@QMW8',   // 5 astronaut suit
  ' .,:;ox%#@&$8BWM',   // 6 planets / ring
  ' .,\'`/\\|/\\|/\\|lI',  // 7 alien grass
];
export const SET = { PROP: 0, ROCK: 1, METAL: 2, SKY: 3, ENERGY: 4, SUIT: 5, PLANET: 6, GRASS: 7 };

export function tag(obj, set, noId = false) {
  obj.traverse(o => { if (o.isMesh) { o.userData.set = set; o.userData.noId = noId; } });
  return obj;
}

function buildAtlas() {
  const GW = 24, GH = 40;
  const cv = document.createElement('canvas');
  cv.width = GW * 16; cv.height = GH * 8;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 30px "JetBrains Mono"';
  GLYPH_SETS.forEach((row, r) => {
    [...row].forEach((ch, i) => g.fillText(ch, i * GW + GW / 2, r * GH + GH / 2 + 2));
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

const POST_FRAG = /* glsl */`
uniform sampler2D tColor; uniform sampler2D tId; uniform sampler2D tAtlas;
uniform vec2 res; uniform vec2 cell; uniform float time; uniform float flash; uniform float glitch;
uniform float exposure; uniform vec3 bg;
varying vec2 vUv;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 px = vUv*res;
  vec2 ci = floor(px/cell);
  vec2 cuv = fract(px/cell);
  vec2 cs = cell/res;
  vec2 sci = ci;
  if (glitch > 0.0) {
    float band = h21(vec2(floor(ci.y/4.0), floor(time*18.0)));
    if (band < glitch*0.7) sci.x += floor((h21(vec2(ci.y, floor(time*18.0)))-0.5)*50.0*glitch);
  }
  vec2 base = sci*cs;
  vec3 c = texture2D(tColor, base+cs*vec2(.25,.25)).rgb + texture2D(tColor, base+cs*vec2(.75,.25)).rgb
         + texture2D(tColor, base+cs*vec2(.25,.75)).rgb + texture2D(tColor, base+cs*vec2(.75,.75)).rgb;
  c *= 0.25;
  c = 1.0 - exp(-c*exposure);
  c = pow(c, vec3(1.0/2.2));
  float l0 = dot(c, vec3(.299,.587,.114));
  c = mix(vec3(l0), c, 1.35);
  c = mix(c*vec3(.72,.82,1.3), c, smoothstep(0.0, .55, l0));
  c = max(c, 0.0);
  c = mix(c, vec3(1.0), flash);
  float set = floor(texture2D(tId, base+cs*.5).r*8.0);
  float lum = dot(c, vec3(.299,.587,.114));
  float l = set == 3.0 ? lum : clamp((lum - .06)*1.3, 0.0, 1.0);
  if (set == 1.0 || set == 7.0) l *= .72 + .56*h21(sci*1.93+7.7);
  if (set == 3.0 && l < 0.14) {
    float s = h21(sci*1.37);
    if (s > 0.972) {
      float tw = .55+.45*sin(time*2.5 + s*300.0);
      float b = (.35 + .5*fract(s*91.0))*tw;
      l = max(l, b); c = max(c, vec3(.78,.84,1.0)*b);
    }
  }
  float gi = floor(clamp(l,0.0,.999)*16.0);
  if (set != 3.0 && set != 4.0 && gi > 0.0) { float d = h21(sci*.731+3.1); gi = clamp(gi + (d < .25 ? -1.0 : (d > .75 ? 1.0 : 0.0)), 1.0, 15.0); }
  if (set == 4.0 && gi > 0.0) gi = clamp(gi + floor((h21(sci+floor(time*14.0))-.5)*4.0), 1.0, 15.0);
  if (glitch > 0.0 && h21(sci+floor(time*24.0)) < glitch*.12) gi = 15.0 - gi;
  vec2 auv = vec2((gi + cuv.x)/16.0, 1.0 - (set + 1.0 - cuv.y)/8.0);
  float m = texture2D(tAtlas, auv).r;
  float mx = max(max(c.r,c.g),c.b);
  vec3 hue = c/max(mx,1e-4);
  vec3 col = hue*(.30 + 1.0*pow(mx,.85));
  vec3 o = bg + c*.2 + col*m;
  vec2 q = vUv-.5; o *= 1.0 - dot(q,q)*.7;
  gl_FragColor = vec4(o,1.0);
}`;

export class AsciiEngine {
  constructor(canvas, { width = 720, height = 1280, cell = [6, 10], sceneScale = 1.0 } = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const sw = Math.round(width * sceneScale), sh = Math.round(height * sceneScale);
    this.rtColor = new THREE.WebGLRenderTarget(sw, sh, { type: THREE.HalfFloatType });
    this.rtId = new THREE.WebGLRenderTarget(sw, sh, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.idMats = [...Array(8)].map((_, i) => new THREE.MeshBasicMaterial({
      color: new THREE.Color().setRGB((i + 0.5) / 8, 0, 0, THREE.LinearSRGBColorSpace) }));
    this.postMat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.rtColor.texture }, tId: { value: this.rtId.texture }, tAtlas: { value: buildAtlas() },
        res: { value: new THREE.Vector2(width, height) }, cell: { value: new THREE.Vector2(...cell) },
        time: { value: 0 }, flash: { value: 0 }, glitch: { value: 0 }, exposure: { value: 1.6 },
        bg: { value: new THREE.Color(0.027, 0.031, 0.062) },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.skyIdColor = new THREE.Color().setRGB((SET.SKY + 0.5) / 8, 0, 0, THREE.LinearSRGBColorSpace);
  }

  get u() { return this.postMat.uniforms; }

  render(scene, camera, clearColor = new THREE.Color(0, 0, 0)) {
    const r = this.renderer;
    // ID pass
    const swapped = [];
    scene.traverseVisible(o => {
      if (!o.isMesh) return;
      swapped.push([o, o.material, o.visible]);
      if (o.userData.noId) o.visible = false;
      else o.material = this.idMats[o.userData.set ?? 0];
    });
    const bgSave = scene.background; scene.background = null;
    r.shadowMap.autoUpdate = false;
    r.setRenderTarget(this.rtId); r.setClearColor(this.skyIdColor, 1); r.clear(); r.render(scene, camera);
    for (const [o, m, v] of swapped) { o.material = m; o.visible = v; }
    scene.background = bgSave;
    // colour pass
    r.shadowMap.autoUpdate = true;
    r.setRenderTarget(this.rtColor); r.setClearColor(clearColor, 1); r.clear(); r.render(scene, camera);
    // glyph pass
    r.setRenderTarget(null); r.render(this.postScene, this.postCam);
  }
}

// ---------- small helpers shared by episodes ----------
export const clamp01 = x => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export function hash2(i, j) { const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return h - Math.floor(h); }
export function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z, oct = 4) { let s = 0, a = 0.5, f = 1; for (let k = 0; k < oct; k++) { s += a * vnoise(x * f, z * f); a *= 0.5; f *= 2.03; } return s; }

// Typewriter caption state for time t from a caption list [{t0,t1,text}]
export function captionAt(caps, t, cps = 30) {
  for (const c of caps) if (t >= c.t0 && t < c.t1) {
    const n = Math.max(0, Math.floor((t - c.t0) * cps));
    const fade = 1 - smooth(c.t1 - 0.25, c.t1, t);
    return { text: c.text.slice(0, n), typing: n < c.text.length, fade };
  }
  return null;
}
