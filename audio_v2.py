"""Cue-based procedural soundtrack (Ep 2+). No samples, no paid APIs.

    python3 audio.py episodes/ep02.json out.wav audio_meta.json

Cues come from two places:
  * episodes/epXX.json -> "sound": hand-placed cues (beds, creature calls, silence, glitch...)
  * audio_meta.json (written by render.mjs): footsteps, crystal chimes, pod puffs derived from the animation
"""
import json, sys, wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100


def main(ep_path, out_path, meta_path=None):
    ep = json.load(open(ep_path))
    meta = json.load(open(meta_path)) if meta_path else {}
    N = int(ep["duration"] * SR)
    t = np.arange(N) / SR
    rng = np.random.default_rng(11)
    L = np.zeros(N); R = np.zeros(N)
    bedL = np.zeros(N); bedR = np.zeros(N)          # beds get ducked by "silence"

    def lp(x, f): b, a = butter(2, min(f, SR / 2 - 100) / (SR / 2)); return lfilter(b, a, x)
    def hp(x, f): b, a = butter(2, f / (SR / 2), 'high'); return lfilter(b, a, x)
    def bp(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
    def seg(t0, t1): return (t >= t0) & (t < t1)
    def ramp(t0, t1, a=1.0, r=1.0): return np.clip((t - t0) / a, 0, 1) * np.clip((t1 - t) / r, 0, 1)
    def add(sig, t0, gain=1.0, pan=0.0, bed=False):
        i = int(t0 * SR)
        if i >= N or i < 0: return
        s = sig[: N - i] * gain
        tl, tr = (bedL, bedR) if bed else (L, R)
        tl[i:i + len(s)] += s * (1 - max(pan, 0)); tr[i:i + len(s)] += s * (1 + min(pan, 0))
    def tone(f, dur, decay=8.0, harm=(1,), amp=None):
        tt = np.arange(int(dur * SR)) / SR
        return sum((amp[k] if amp else 1 / (k + 1)) * np.sin(2 * np.pi * f * h * tt) for k, h in enumerate(harm)) * np.exp(-tt * decay)
    def noise(dur): return rng.standard_normal(int(dur * SR))
    def envd(n, a=0.01, d=6.0):
        tt = np.arange(n) / SR; return np.clip(tt / a, 0, 1) * np.exp(-tt * d)

    D_MAJ = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.26, 739.99, 880.0]
    PENTA = [587.33, 659.26, 739.99, 880.0, 987.77, 1174.66, 1318.51, 1479.98, 1760.0, 1975.53, 2349.32, 2637.0, 2959.96]

    silence = np.zeros(N)
    for c in ep.get("sound", []):
        if c["type"] == "silence": silence = np.maximum(silence, ramp(c["t0"], c["t1"], 0.4, 0.8))
    duck = 1 - 0.93 * silence

    for c in ep.get("sound", []):
        k = c["type"]; g = c.get("gain", 1.0)
        if k == "bed" and c["kind"] == "pad":           # warm wonder pad (D lydian-ish)
            e = ramp(c["t0"], c["t1"], 3.0, 2.5) * g
            pad = np.zeros(N)
            for f in (146.83, 220.0, 329.63, 415.3, 493.88):
                for det in (-0.7, 0.7):
                    pad += np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6)) + 0.25 * np.sin(2 * np.pi * 2 * (f + det) * t)
            pad *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t)
            bedL += pad * e; bedR += np.roll(pad, 700) * e
        elif k == "bed" and c["kind"] == "tension":      # low minor drone for the cliffhanger
            e = ramp(c["t0"], c["t1"], 1.5, 1.5) * g
            dr = np.sin(2 * np.pi * 55 * t) + 0.7 * np.sin(2 * np.pi * 65.4 * t) + 0.4 * np.sin(2 * np.pi * 82.4 * t + 1)
            L += dr * e; R += dr * e
        elif k == "wind":
            e = ramp(c["t0"], c["t1"], 2, 2) * g
            w = lp(rng.standard_normal(N), 700) * (0.55 + 0.45 * np.maximum(0, np.sin(2 * np.pi * t / 5.0)))
            gx = c.get("gust")
            if gx: w *= 1 + (gx[2] - 1) * ramp(gx[0], gx[1], 2, 2)
            bedL += w * e; bedR += np.roll(w, 900) * e
        elif k == "night":                              # alien insect chirps
            n = int((c["t1"] - c["t0"]) * 5)
            for i in range(n):
                tt = c["t0"] + rng.uniform(0, c["t1"] - c["t0"]); f = rng.uniform(2800, 5200)
                ch = np.concatenate([tone(f, 0.04, 60) for _ in range(rng.integers(2, 5))])
                add(ch, tt, g * rng.uniform(0.4, 1), pan=rng.uniform(-0.8, 0.8), bed=True)
        elif k == "eyes":                               # blink + curious "hm?"
            add(hp(noise(0.02), 3000) * envd(int(0.02 * SR), 0.001, 200), c["t"], 0.25 * g)
            f = np.linspace(500, 760, int(0.25 * SR)); ph = 2 * np.pi * np.cumsum(f) / SR
            add(np.sin(ph) * envd(len(ph), 0.02, 9) * 0.6, c["t"] + 0.15, 0.35 * g, pan=-0.2)
        elif k == "hud":
            for i, f in enumerate((1760, 2349, 2637, 3520)):
                add(tone(f, 0.08, 40), c["t"] + i * 0.11, 0.12 * g)
        elif k == "chitter":                            # skitterlings
            n = int(c["dur"] * 14)
            for i in range(n):
                tt = c["t"] + rng.uniform(0, c["dur"]); f = rng.uniform(1800, 3200)
                add(tone(f, 0.03, 90, (1, 1.5)), tt, g * rng.uniform(0.3, 1), pan=rng.uniform(-0.6, 0.6))
        elif k == "coo":                                # Pixel's stripes turn cyan
            f = np.concatenate([np.linspace(700, 1400, int(0.18 * SR)), np.linspace(1400, 1150, int(0.12 * SR))])
            add(np.sin(2 * np.pi * np.cumsum(f) / SR) * envd(len(f), 0.01, 4), c["t"], 0.3 * g)
            for i, f2 in enumerate((1174.66, 1479.98, 1760.0)): add(tone(f2, 1.2, 3, (1, 2.01)), c["t"] + 0.2 + i * 0.12, 0.08 * g)
        elif k == "flutter":                            # moth swarm
            m = seg(c["t0"], c["t1"])
            fl = bp(rng.standard_normal(N), 900, 3500) * (0.5 + 0.5 * np.sin(2 * np.pi * 26 * t)) * ramp(c["t0"], c["t1"], 2, 0.3)
            L[m] += fl[m] * g; R[m] += np.roll(fl, 400)[m] * g
        elif k == "under":                              # something under the lake
            n = int(5 * SR); tt = np.arange(n) / SR
            s = (np.sin(2 * np.pi * 38 * tt) + 0.5 * np.sin(2 * np.pi * 57 * tt)) * np.sin(np.pi * tt / 5) ** 2
            add(s + lp(noise(5), 120) * np.sin(np.pi * tt / 5) ** 2 * 2, c["t"], 0.5 * g)
        elif k == "whale":                              # driftback song: gliding, vibrato, echo
            dur = c["dur"]; n = int(dur * SR); tt = np.arange(n) / SR; p = c.get("pitch", 1.0)
            f = p * (110 + 70 * np.sin(np.pi * tt / dur) + 25 * np.sin(2 * np.pi * tt / dur * 1.5)) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * tt))
            ph = 2 * np.pi * np.cumsum(f) / SR
            s = (np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.2 * np.sin(3.01 * ph)) * np.sin(np.pi * tt / dur) ** 1.5
            for d, gg, pn in ((0, 1, -0.3), (0.35, 0.45, 0.4), (0.8, 0.25, -0.5)): add(s, c["t"] + d, 0.3 * g * gg, pan=pn)
        elif k == "heartbeat":
            hb = c["t0"]
            while hb < c["t1"]:
                add(tone(50, 0.25, 14, (1, 2)), hb, 0.6 * g); add(tone(46, 0.25, 16, (1, 2)), hb + 0.24, 0.45 * g)
                hb += 0.9 - 0.3 * (hb - c["t0"]) / max(1, c["t1"] - c["t0"])
        elif k == "rustle":                             # invisible thing pushing through grass, getting closer
            e = (np.clip((t - c["t0"]) / (c["t1"] - c["t0"]), 0, 1) ** 2) * seg(c["t0"], c["t1"] + 0.3)
            r = bp(rng.standard_normal(N), 1500, 6000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 3.2 * t))) * e
            L += r * g * 1.2; R += r * g * 0.6
        elif k == "scurry":
            n = int(c["dur"] * 60)
            for i in range(n): add(hp(noise(0.008), 2500) * envd(int(0.008 * SR), 0.0005, 400), c["t"] + rng.uniform(0, c["dur"]), g * 0.5, pan=rng.uniform(-0.2, 0.9))
        elif k == "glitch":
            for i in range(int((c["t1"] - c["t0"]) * 30)):
                tt = c["t0"] + rng.uniform(0, c["t1"] - c["t0"]); n = int(rng.uniform(0.005, 0.05) * SR)
                add(np.sign(np.sin(2 * np.pi * rng.uniform(200, 3000) * np.arange(n) / SR)) * 0.5, tt, g * rng.uniform(0.05, 0.2), pan=rng.uniform(-0.6, 0.6))
        elif k == "voice":                              # "YOU. ARE. FAR." as a formant-filtered machine voice
            for i, (f0, dur) in enumerate(((140, 0.42), (120, 0.42), (95, 0.7))):
                n = int(dur * SR); tt = np.arange(n) / SR
                buzz = np.sign(np.sin(2 * np.pi * f0 * tt)) * 0.6 + np.sin(2 * np.pi * f0 * 2 * tt) * 0.3
                v = bp(buzz, 300, 900) + 0.6 * bp(buzz, 1100, 2400)
                v *= np.clip(tt / 0.03, 0, 1) * np.clip((dur - tt) / 0.08, 0, 1) * (np.sin(2 * np.pi * 9 * tt) > -0.8)
                add(v, c["t"] + i * 0.62, 0.55 * g)
        elif k == "hit":
            n = int(3 * SR); tt = np.arange(n) / SR
            add((np.sin(2 * np.pi * 45 * tt) + 0.5 * np.sin(2 * np.pi * 90 * tt)) * np.exp(-tt * 1.4) + lp(noise(3), 200) * np.exp(-tt * 2) * 2, c["t"], 0.5 * g)

    # ---- cues derived from the animation ----
    for f in meta.get("foot", []):
        n = int(0.09 * SR)
        if f["water"]:
            add(bp(noise(0.25), 400, 2500) * envd(int(0.25 * SR), 0.003, 12), f["t"], 0.35)
            add(tone(rng.uniform(600, 900), 0.1, 30), f["t"] + 0.04, 0.08)
        else:
            add(bp(noise(0.09), 1200, 5000) * envd(n, 0.002, 30), f["t"], 0.09, pan=rng.uniform(-0.15, 0.15))
    for c in meta.get("chimes", []):                    # crystals ring a pentatonic melody
        f = PENTA[c["note"] % len(PENTA)] * (2 if c["note"] >= len(PENTA) else 1)
        bell = tone(f, 3.0, 1.3, (1, 2.76, 5.4, 8.93), amp=[1, 0.45, 0.25, 0.12])
        add(bell, c["t"], 0.16, pan=0.35); add(bell, c["t"] + 0.28, 0.06, pan=-0.4)
    for p in meta.get("puffs", []):                     # pods exhale spores
        n = int(0.7 * SR); tt = np.arange(n) / SR
        wh = bp(noise(0.7), 600, 4000) * np.sin(np.pi * np.clip(tt / 0.7, 0, 1)) ** 2
        add(wh, p["t"], 0.35 if p["face"] else 0.16, pan=-0.3 if p["face"] else rng.uniform(-0.5, 0.5))
        add(tone(260 if p["face"] else 330, 0.25, 14, (1, 2)), p["t"], 0.25 if p["face"] else 0.08)
        if p["face"]:
            f = np.linspace(900, 300, int(0.35 * SR)); add(np.sin(2 * np.pi * np.cumsum(f) / SR) * envd(len(f), 0.005, 6), p["t"] + 0.15, 0.18)

    # typewriter ticks for captions
    for c in ep["captions"]:
        for j, ch in enumerate(c["text"]):
            tt = c["t0"] + j / 30
            if ch.strip() and tt < c["t1"]:
                add(hp(noise(0.012), 2500) * envd(int(0.012 * SR), 0.0005, 400), tt, 0.08, pan=rng.uniform(-0.2, 0.2))

    L += bedL * duck; R += bedR * duck
    mix = np.stack([L, R], 1)
    mix = np.tanh(mix * 1.2)
    mix *= 0.89 / max(1e-6, np.abs(mix).max())
    mix *= np.clip((ep["duration"] - t) / 1.2, 0, 1)[:, None]
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    print('ok', out_path, f'{N / SR:.1f}s')


if __name__ == "__main__":
    main(*sys.argv[1:4])
