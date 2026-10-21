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

        # ---------------- Ep 3 (action) ----------------
        elif k == "pulse":                              # driving action bed: bass ostinato + kick + hats
            bpm = c.get("bpm", 132); beat = 60 / bpm; e = ramp(c["t0"], c["t1"], c.get("a", 1.0), c.get("r", 1.0)) * g
            bass = np.zeros(N); notes = c.get("notes", [55.0, 55.0, 65.41, 49.0])
            tb = c["t0"]; i = 0
            while tb < c["t1"]:
                f = notes[(i // 4) % len(notes)]; n = int(beat / 2 * SR); tt = np.arange(n) / SR
                saw = 2 * ((f * tt) % 1) - 1
                env = np.exp(-tt * 18); note = (lp(saw, 1400) * env + lp(saw, 450) * (1 - env)) * np.exp(-tt * 5)   # filter 'pluck'
                j = int(tb * SR); m = min(n, N - j)
                if m > 0: bass[j:j + m] += note[:m]
                if i % 2 == 0: add(tone(52, 0.35, 11, (1, 1.5)) + lp(noise(0.35), 150) * envd(int(0.35 * SR), 0.001, 25), tb, 0.55 * g / max(g, 1e-6) * float(e[min(N - 1, int(tb * SR))]))
                add(hp(noise(0.03), 6000) * envd(int(0.03 * SR), 0.0005, 120), tb + beat / 4, 0.12 * float(e[min(N - 1, int(tb * SR))]) / max(g, 1e-6) * g, pan=0.3)
                tb += beat / 2; i += 1
            L += bass * e * 0.6; R += bass * e * 0.6
        elif k == "stinger":                            # something appears: reverse swell -> hit -> shimmer
            n = int(1.6 * SR); tt = np.arange(n) / SR
            sw = bp(noise(1.6), 300, 5000) * (tt / 1.6) ** 3
            add(sw, c["t"] - 1.6, 0.5 * g)
            add((np.sin(2 * np.pi * 41 * tt) + 0.6 * np.sin(2 * np.pi * 61.7 * tt)) * np.exp(-tt * 2.2), c["t"], 0.9 * g)
            for f in (1661, 2217, 2960): add(tone(f, 1.5, 2.5, (1, 1.003)), c["t"], 0.05 * g, pan=rng.uniform(-0.5, 0.5))
        elif k == "creak":                              # bone-metal servos and clicks
            for i in range(int((c["t1"] - c["t0"]) * c.get("rate", 9))):
                tt = c["t0"] + rng.uniform(0, c["t1"] - c["t0"]); f = rng.uniform(180, 900)
                add(tone(f, 0.12, 30, (1, 2.37, 3.9), amp=[1, 0.5, 0.3]) + np.pad(hp(noise(0.01), 3000) * envd(int(0.01 * SR), 0.0003, 500) * 0.5, (0, int(0.12 * SR) - int(0.01 * SR))), tt, g * rng.uniform(0.3, 1), pan=c.get("pan", 0) + rng.uniform(-0.3, 0.3))
        elif k == "screech":                            # the scout screams
            dur = c.get("dur", 1.4); n = int(dur * SR); tt = np.arange(n) / SR
            f = 900 + 700 * np.sin(np.pi * tt / dur) + 60 * np.sin(2 * np.pi * 31 * tt)
            ph = 2 * np.pi * np.cumsum(f) / SR
            v = (np.sign(np.sin(ph)) * 0.4 + bp(noise(dur), 1500, 5000) * 0.8) * np.sin(np.pi * tt / dur) ** 0.6
            v = bp(v, 600, 6000)
            add(v, c["t"], 0.35 * g, pan=c.get("pan", 0.2)); add(v, c["t"] + 0.18, 0.12 * g, pan=-0.4)
        elif k == "rumble":                             # the ground splits
            e = ramp(c["t0"], c["t1"], 0.6, 2.0) * g
            r = lp(rng.standard_normal(N), 90) * 6 + lp(rng.standard_normal(N), 400) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 1.3 * t)))
            L += r * e; R += np.roll(r, 300) * e
        elif k == "thruster":
            e = ramp(c["t0"], c["t1"], 0.25, 0.3) * g
            th = bp(rng.standard_normal(N), 200, 3000) + lp(rng.standard_normal(N), 120) * 3
            L += th * e; R += np.roll(th, 200) * e
        elif k == "boom":                               # the slam: sub drop, blast, debris tail
            n = int(4 * SR); tt = np.arange(n) / SR
            f = 70 * np.exp(-tt * 0.8) + 28; sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 0.9)
            blast = lp(noise(4), 1800) * np.exp(-tt * 3.5) * 2.2 + bp(noise(4), 2000, 8000) * np.exp(-tt * 6)
            add(sub * 1.4 + blast, c["t"], 0.8 * g); add(blast * 0.4, c["t"] + 0.12, 0.3 * g, pan=0.6); add(blast * 0.3, c["t"] + 0.25, 0.25 * g, pan=-0.6)
        elif k == "breath":                             # heavy breathing inside the helmet
            tb = c["t0"]; rate = c.get("rate", 0.8)
            while tb < c["t1"]:
                for dt, d, gg in ((0, rate * 0.4, 1.0), (rate * 0.45, rate * 0.5, 0.7)):
                    n = int(d * SR); tt = np.arange(n) / SR
                    add(bp(noise(d), 500, 2500) * np.sin(np.pi * tt / d) ** 2, tb + dt, 0.22 * g * gg)
                tb += rate
        elif k == "signal":                             # the skull's red signal
            tb = c["t0"]
            while tb < c["t1"]:
                for i, f in enumerate((1318.5, 987.8, 739.99)): add(tone(f, 0.18, 14, (1, 3.01), amp=[1, 0.3]), tb + i * 0.13, 0.1 * g, pan=-0.2)
                tb += c.get("every", 1.6)
            e = ramp(c["t0"], c["t1"], 2, 1) * g; hum = np.sin(2 * np.pi * 110 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t))
            L += hum * e * 0.08; R += hum * e * 0.08
        elif k == "armada":                             # deep horns as the red lights appear
            e = ramp(c["t0"], c["t1"], 3, 1.5) * g
            hn = np.zeros(N)
            for f in (36.7, 55.0, 73.4, 77.8):
                hn += np.sin(2 * np.pi * f * t + 2 * np.sin(2 * np.pi * 0.3 * t)) + 0.4 * np.sin(2 * np.pi * f * 3.01 * t)
            hn = lp(hn, 600)
            L += hn * e; R += np.roll(hn, 900) * e
        elif k == "water":                              # water draining in a spiral
            e = ramp(c["t0"], c["t1"], 1.0, 1.5) * g
            w = bp(rng.standard_normal(N), 250, 2200) * (0.5 + 0.5 * np.sin(2 * np.pi * (1.5 + 2 * np.clip((t - c["t0"]) / max(1e-3, c["t1"] - c["t0"]), 0, 1)) * t))
            w += lp(rng.standard_normal(N), 160) * 2
            L += w * e; R += np.roll(w, 500) * e
        elif k == "swell":                              # wonder: a rising airy chord + sparkles
            dur = c.get("dur", 5.0); n = int(dur * SR); tt = np.arange(n) / SR; p = c.get("pitch", 1.0)
            env = np.clip(tt / (dur * 0.6), 0, 1) ** 1.5 * np.clip((dur - tt) / (dur * 0.35), 0, 1)
            ch = sum(np.sin(2 * np.pi * f * p * tt + i) + 0.3 * np.sin(4 * np.pi * f * p * tt) for i, f in enumerate((220.0, 277.18, 329.63, 440.0, 554.37)))
            add(ch * env * 0.25, c["t"], g, pan=-0.2); add(np.roll(ch, 600) * env * 0.25, c["t"], g, pan=0.3)
            for i in range(int(dur * 6)): add(tone(rng.choice(PENTA) * p, 0.6, 6, (1, 2.01)), c["t"] + rng.uniform(0.2, dur), 0.04 * g, pan=rng.uniform(-0.7, 0.7))
        elif k == "glasswind":                          # wind singing through glass: slow gliding sine tones
            e = ramp(c["t0"], c["t1"], 2, 2) * g
            sg = np.zeros(N)
            for i, f in enumerate((587.33, 739.99, 880.0, 1174.66)):
                sg += np.sin(2 * np.pi * f * t * (1 + 0.004 * np.sin(2 * np.pi * (0.07 + i * 0.03) * t)) + i) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.05 + 0.02 * i) * t + i * 1.7)) ** 2
            L += sg * e * 0.05; R += np.roll(sg, 1300) * e * 0.05
        elif k == "shards":                             # glass storm: hiss + endless tiny tinkles
            e = ramp(c["t0"], c["t1"], 1.5, 2.5) * g
            hs = hp(rng.standard_normal(N), 2500) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 0.7 * t)))
            L += hs * e * 0.25; R += np.roll(hs, 700) * e * 0.25
            for i in range(int((c["t1"] - c["t0"]) * 40)):
                add(tone(rng.uniform(3000, 9000), 0.05, 70, (1, 2.4)), c["t0"] + rng.uniform(0, c["t1"] - c["t0"]), 0.06 * g, pan=rng.uniform(-0.9, 0.9))
        elif k == "sea":                                # open-ocean swell + wash
            e = ramp(c["t0"], c["t1"], 1.5, 0.3) * g
            sw = lp(rng.standard_normal(N), 500) * (0.4 + 0.6 * np.sin(2 * np.pi * 0.11 * t) ** 2) + bp(rng.standard_normal(N), 800, 3000) * 0.25 * np.maximum(0, np.sin(2 * np.pi * 0.11 * t - 0.6)) ** 4
            L += sw * e; R += np.roll(sw, 1500) * e
        elif k == "splash":
            n = int(1.6 * SR); tt = np.arange(n) / SR
            add(bp(noise(1.6), 300, 5000) * np.exp(-tt * 4) * 1.5 + lp(noise(1.6), 200) * np.exp(-tt * 3) * 2, c["t"], 0.6 * g)
            for i in range(30): add(tone(rng.uniform(400, 1400), 0.06, 40), c["t"] + 0.2 + rng.uniform(0, 1.2), 0.04 * g, pan=rng.uniform(-0.6, 0.6))
        elif k == "under_amb":                          # muffled deep-water drone + bubbles + creaks
            e = ramp(c["t0"], c["t1"], 1.0, 1.0) * g
            dr = lp(rng.standard_normal(N), 140) * 3 + np.sin(2 * np.pi * 41 * t) * 0.3 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t))
            L += dr * e; R += np.roll(dr, 2000) * e
            for i in range(int((c["t1"] - c["t0"]) * 3)):
                tb = c["t0"] + rng.uniform(0, c["t1"] - c["t0"])
                for j in range(rng.integers(2, 6)):
                    f = rng.uniform(300, 900); n = int(0.05 * SR); x = np.arange(n) / SR
                    add(np.sin(2 * np.pi * np.cumsum(f * (1 + 2 * x)) / SR) * np.exp(-x * 60), tb + j * 0.06, 0.05 * g, pan=rng.uniform(-0.5, 0.5))
        elif k == "knight":                             # the Vaelor knight speaks: deep, breathy, tonal syllables
            tb = c["t"]; end = c["t"] + c.get("dur", 3.0)
            while tb < end:
                dur = rng.uniform(0.18, 0.4); n = int(dur * SR); x = np.arange(n) / SR; f0 = rng.choice([62.0, 69.0, 73.0, 82.0])
                glide = f0 * (1 + 0.15 * np.sin(np.pi * x / dur))
                ph = 2 * np.pi * np.cumsum(glide) / SR
                v = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph) + 0.4 * bp(noise(dur), 200, 1200)
                v = bp(v, 90, 900) * np.sin(np.pi * x / dur) ** 0.7
                add(v, tb, 0.6 * g, pan=-0.1); add(v, tb + 0.12, 0.2 * g, pan=0.4)
                tb += dur + rng.uniform(0.05, 0.2)
        elif k == "glass_crack":                        # visor cracking
            for i in range(18): add(np.pad(hp(noise(0.02), 2500) * envd(int(0.02 * SR), 0.0003, 250), (0, int(0.12 * SR))) + tone(rng.uniform(2000, 7000), 0.14, 30, (1, 2.7)), c["t"] + i * rng.uniform(0.005, 0.03), 0.25 * g, pan=rng.uniform(-0.3, 0.6))
        elif k == "alarm":                              # suit alarm: two-tone pulses
            tb = c["t0"]
            while tb < c["t1"]:
                add(tone(1046.5, 0.18, 6, (1, 3.01), amp=[1, 0.2]), tb, 0.12 * g); add(tone(784.0, 0.18, 6, (1, 3.01), amp=[1, 0.2]), tb + 0.22, 0.12 * g); tb += 1.05
        elif k == "hiss":                               # air leaking from the suit
            e = ramp(c["t0"], c["t1"], 0.2, 1.0) * g
            hs = hp(rng.standard_normal(N), 4000) * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t))
            L += hs * e * 0.12; R += hs * e * 0.08
        elif k == "voicenote":                          # a child's 6 s voice note through a cracked helmet speaker
            tb = c["t"] + 0.4
            for f0, dur in ((330, 0.18), (300, 0.3), (0, 0.25), (360, 0.22), (320, 0.45)):
                if f0:
                    n = int(dur * SR); x = np.arange(n) / SR
                    gl = f0 * (1 + 0.08 * np.sin(np.pi * x / dur) - 0.1 * x / dur)
                    ph = 2 * np.pi * np.cumsum(gl) / SR
                    v = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)
                    v = bp(v, 400, 3200) * np.sin(np.pi * x / dur) ** 0.6
                    add(v, tb, 0.35 * g)
                tb += dur + 0.06
            n = int(6.2 * SR); x = np.arange(n) / SR
            add(bp(noise(6.2), 1000, 5000) * 0.05 * (np.abs(np.sin(2 * np.pi * 0.7 * x)) > 0.98), c["t"], g)
            add(hp(noise(6.2), 3000) * 0.015, c["t"], g)
        elif k == "hive":                               # inside the hive: organic drone, slow breathing, drips
            e = ramp(c["t0"], c["t1"], 1.0, 1.0) * g
            br = 0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * t)
            dr = (np.sin(2 * np.pi * 36 * t) + 0.6 * np.sin(2 * np.pi * 54.3 * t)) * (0.4 + 0.6 * br) * 0.25 + lp(rng.standard_normal(N), 220) * br * 1.5
            L += dr * e; R += np.roll(dr, 900) * e
            for i in range(int((c["t1"] - c["t0"]) * 1.2)): add(tone(rng.uniform(900, 1600), 0.15, 25, (1, 2.3)), c["t0"] + rng.uniform(0, c["t1"] - c["t0"]), 0.05 * g, pan=rng.uniform(-0.8, 0.8))
        elif k == "echo_voice":                         # ECHO's lines: cold, low, formant-filtered machine voice
            for line in ep.get("echo", []):
                words = [w for w in line["text"].replace("\n", " ").split(" ") if w]
                tb = line["t0"] + 0.15
                for w in words:
                    syl = max(1, sum(ch in "AEIOUY" for ch in w.upper())) if len(w) > 1 else 1
                    for si in range(syl):
                        dur = 0.2 if len(w) <= 2 else 0.26; n = int(dur * SR); tt = np.arange(n) / SR
                        f0 = 88 + 10 * ((sum(map(ord, w)) + si) % 3)
                        buzz = np.sign(np.sin(2 * np.pi * f0 * tt)) * 0.6 + np.sin(2 * np.pi * f0 * 2 * tt) * 0.3
                        fm = 450 + 250 * ((si + len(w)) % 3)
                        v = bp(buzz, fm * 0.6, fm * 1.4) + 0.6 * bp(buzz, 1300, 2600) + 0.15 * np.sin(2 * np.pi * 2093 * tt)
                        v *= np.clip(tt / 0.02, 0, 1) * np.clip((dur - tt) / 0.05, 0, 1)
                        add(v, tb, 0.5 * g); add(v, tb + 0.09, 0.15 * g, pan=0.5)
                        tb += dur + 0.03
                    tb += 0.12

    # ---- cues derived from the animation ----
    for f in meta.get("foot", []):
        n = int(0.09 * SR)
        if f["water"]:
            add(bp(noise(0.25), 400, 2500) * envd(int(0.25 * SR), 0.003, 12), f["t"], 0.35)
            add(tone(rng.uniform(600, 900), 0.1, 30), f["t"] + 0.04, 0.08)
        elif f.get("run"):
            add(bp(noise(0.11), 300, 3000) * envd(int(0.11 * SR), 0.002, 26), f["t"], 0.17, pan=rng.uniform(-0.15, 0.15))
            add(tone(70, 0.08, 40), f["t"], 0.12)
        else:
            add(bp(noise(0.09), 1200, 5000) * envd(n, 0.002, 30), f["t"], 0.09, pan=rng.uniform(-0.15, 0.15))
    for tt in meta.get("pods", []):                     # drop pod: falling whistle, then a water impact
        n = int(2.0 * SR); x = np.arange(n) / SR
        wh = np.sin(2 * np.pi * np.cumsum(2200 - 900 * x) / SR) * np.clip(x / 1.6, 0, 1) ** 2 * 0.25 + bp(noise(2.0), 1500, 6000) * np.clip(x / 2, 0, 1) ** 3 * 0.4
        add(wh, tt - 2.0, 0.25, pan=rng.uniform(-0.7, 0.7))
        n = int(1.2 * SR); x = np.arange(n) / SR
        add(lp(noise(1.2), 600) * np.exp(-x * 4) * 2 + np.sin(2 * np.pi * 50 * x) * np.exp(-x * 5), tt, 0.35, pan=rng.uniform(-0.7, 0.7))
    for tt in meta.get("shots", []):                    # carbine: crack + plasma zap
        n = int(0.25 * SR); x = np.arange(n) / SR
        zap = np.sin(2 * np.pi * np.cumsum(2400 * np.exp(-x * 30) + 300) / SR) * np.exp(-x * 22)
        add(hp(noise(0.25), 800) * np.exp(-x * 45) * 1.5 + zap * 0.6 + np.sin(2 * np.pi * 80 * x) * np.exp(-x * 25), tt, 0.32, pan=rng.uniform(-0.1, 0.1))
    for tt in meta.get("hits", []):                     # a Hollow shatters into glyph dust
        for i in range(14): add(np.pad(hp(noise(0.03), 3000) * envd(int(0.03 * SR), 0.0005, 160) * 0.8, (0, int(0.06 * SR) - int(0.03 * SR))) + tone(rng.uniform(2500, 6000), 0.06, 50), tt + rng.uniform(0, 0.35), 0.16, pan=rng.uniform(-0.5, 0.5))
        add(lp(noise(0.4), 400) * envd(int(0.4 * SR), 0.002, 8), tt, 0.3)
    for tt in meta.get("blows", [])[::3]:
        for i in range(5): add(np.pad(hp(noise(0.02), 3000) * envd(int(0.02 * SR), 0.0005, 200), (0, int(0.05 * SR) - int(0.02 * SR))) + tone(rng.uniform(2000, 5000), 0.05, 60), tt + rng.uniform(0, 0.25), 0.07, pan=rng.uniform(-0.8, 0.8))
    for tt in meta.get("rises", []):                    # soil breaking as each one claws up
        add(lp(noise(0.5), 700) * envd(int(0.5 * SR), 0.01, 7), tt, 0.1, pan=rng.uniform(-0.8, 0.8))
        add(tone(rng.uniform(200, 500), 0.1, 35, (1, 2.37)), tt + 0.5, 0.05, pan=rng.uniform(-0.8, 0.8))
    for i, tt in enumerate(meta.get("crystals", [])):   # crystals ring as he (and it) runs past
        f = PENTA[(i * 3) % len(PENTA)]
        add(tone(f, 2.0, 1.8, (1, 2.76, 5.4), amp=[1, 0.4, 0.2]), tt, 0.09, pan=rng.uniform(-0.5, 0.5))
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
