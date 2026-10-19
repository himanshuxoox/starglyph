"""Procedural soundtrack for an episode (zero-cost, no samples). Usage: python3 audio.py episodes/ep01.json out.wav"""
import json, sys, wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
ep = json.load(open(sys.argv[1]))
E = ep["events"]
N = int(ep["duration"] * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def lp(x, f): b, a = butter(2, f / (SR / 2)); return lfilter(b, a, x)
def hp(x, f): b, a = butter(2, f / (SR / 2), 'high'); return lfilter(b, a, x)
def env(t0, t1, a=0.05, r=0.3):
    e = np.clip((t - t0) / a, 0, 1) * np.clip((t1 - t) / r, 0, 1); return e
def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    L[i:i + len(s)] += s * (1 - max(pan, 0)); R[i:i + len(s)] += s * (1 + min(pan, 0))
def tone(f, dur, decay=8.0, harm=(1,)):
    tt = np.arange(int(dur * SR)) / SR
    return sum(np.sin(2 * np.pi * f * h * tt) / (k + 1) for k, h in enumerate(harm)) * np.exp(-tt * decay)

moon_end, ring_start = E["flash_start"], E["world_switch"]

# --- moon drone ---
drone = (np.sin(2*np.pi*55*t) + 0.6*np.sin(2*np.pi*82.4*t + 1) + 0.25*np.sin(2*np.pi*110.3*t)) * (0.7 + 0.3*np.sin(2*np.pi*0.13*t))
hum = lp(rng.standard_normal(N), 300) * 0.9
mg = env(0, moon_end + 0.3, a=1.5, r=0.4) * (0.10 + 0.05 * np.clip((t - 14) / 10, 0, 1))
L += (drone + hum) * mg; R += (drone * 0.97 + np.roll(hum, 300)) * mg

# --- signal beeps (get louder as he gets closer) ---
k = 0.0
while k < E["beep_until"]:
    g = 0.10 + 0.22 * k / E["beep_until"]
    add(tone(1320, 0.12, 30, (1, 2)), k + 0.2, g, pan=-0.2); add(tone(990, 0.18, 22, (1, 2)), k + 0.28, g, pan=-0.2)
    add(tone(1320, 0.12, 30) * 0.4, k + 0.45, g * 0.5, pan=0.3)  # echo
    k += E["beep_every"]

# --- landing thud ---
add(lp(rng.standard_normal(int(0.6*SR)), 120) * np.exp(-np.arange(int(0.6*SR))/SR*7) * 3 + tone(45, 0.6, 6), 4.6, 0.5)

# --- typewriter ticks ---
for c in ep["captions"]:
    for j, ch in enumerate(c["text"]):
        tt = c["t0"] + j / 30
        if ch.strip() and tt < c["t1"]:
            add(hp(rng.standard_normal(int(0.012*SR)), 2500) * np.exp(-np.arange(int(0.012*SR))/SR*400), tt, 0.10, pan=rng.uniform(-.2, .2))

# --- heartbeat build-up ---
hb = 17.2
while hb < E["touch"] - 0.3:
    add(tone(52, 0.25, 14, (1, 2)), hb, 0.55); add(tone(48, 0.25, 16, (1, 2)), hb + 0.22, 0.4)
    hb += 0.95 - 0.25 * (hb - 17.2) / 8

# --- touch ding + activation sweep + rumble ---
add(tone(2093, 2.5, 1.6, (1, 2.01, 3.0)) + tone(1568, 2.5, 1.8), E["touch"], 0.22)
a0, a1 = E["touch"], E["flash_start"] + 0.5
seg = (t >= a0) & (t < a1); ts = t[seg] - a0; D = a1 - a0
f = 70 * (12 ** (ts / D)); ph = 2*np.pi*np.cumsum(f)/SR
saw = 2 * ((ph / (2*np.pi)) % 1) - 1
sweep = lp(saw, 2500) * (ts / D) ** 1.5 * 0.35
rumble = lp(rng.standard_normal(seg.sum()), 90) * (ts / D) ** 1.2 * 2.2
L[seg] += sweep + rumble; R[seg] += sweep * 0.9 + rumble

# --- flash: noise burst + sub drop ---
fl = int(2.2*SR); tf = np.arange(fl)/SR
burst = rng.standard_normal(fl) * np.exp(-tf*2.2) * 0.5 + np.sin(2*np.pi*np.cumsum(60*np.exp(-tf*1.2))/SR) * np.exp(-tf*1.5) * 0.9
add(burst, E["flash_start"] + 0.6, 0.8)

# --- glitch crackles during SIGNAL LOST ---
g0, g1 = E["big_text"]
for _ in range(70):
    tt = rng.uniform(g0, g1)
    n = int(rng.uniform(0.005, 0.04)*SR)
    add(np.sign(np.sin(2*np.pi*rng.uniform(200, 3000)*np.arange(n)/SR)) * 0.5, tt, rng.uniform(0.05, 0.18), pan=rng.uniform(-.6, .6))

# --- ring world pad (A minor add9) + shimmer ---
pad = np.zeros(N)
for fr in (110, 164.8, 246.9, 261.6, 329.6):
    for det in (-0.6, 0.6):
        pad += np.sin(2*np.pi*(fr + det)*t + rng.uniform(0, 6)) + 0.3*np.sin(2*np.pi*2*(fr + det)*t)
pg = env(ring_start + 0.8, ep["duration"], a=3.0, r=2.5) * 0.045
L += pad * pg; R += np.roll(pad, 600) * pg
for i, fr in enumerate((1318.5, 987.8, 1174.7, 1568, 1318.5, 1760, 1568, 1318.5)):
    add(tone(fr, 1.8, 2.2), ring_start + 2.5 + i * 1.1, 0.06, pan=(-1)**i * 0.5)
add(tone(55, 3, 1.2, (1, 2, 3)) + lp(rng.standard_normal(3*SR), 200) * np.exp(-np.arange(3*SR)/SR*1.5), E["cta"][0], 0.35)

# --- master ---
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.1)
mix *= 0.89 / np.abs(mix).max()
fade = np.clip((ep["duration"] - t) / 1.2, 0, 1)[:, None]; mix *= fade
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', sys.argv[2], f'{N/SR:.1f}s')
