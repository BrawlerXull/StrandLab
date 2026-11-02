#!/usr/bin/env python3
"""Original background music, synthesised from scratch (no samples, no copyrighted material).

A warm pad (I–vi–IV–V in D major) with a soft plucked arpeggio and a gentle pulse, ~96 BPM.
usage: python3 videos/music.py <seconds>   →  videos/audio/music.wav (48 kHz stereo)
"""
import sys, wave
import numpy as np
from pathlib import Path

SR = 48000
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 170.0
BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT
n = int(DUR * SR)
t = np.arange(n) / SR
rng = np.random.default_rng(7)

def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

# D major: D – Bm – G – A   (MIDI roots and voicings)
CHORDS = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]]
ARP = [[62, 66, 69, 74], [59, 62, 66, 71], [55, 59, 62, 67], [57, 61, 64, 69]]

L = np.zeros(n); R = np.zeros(n)

# Pad: detuned soft-saw (few harmonics), slow crossfade between chords
def soft_saw(f, tt, ph):
    return sum(np.sin(2 * np.pi * f * k * tt + ph * k) / k ** 1.6 for k in range(1, 6))

bars = int(np.ceil(DUR / BAR)) + 1
for b in range(bars):
    c = CHORDS[b % 4]
    s0 = b * BAR - 0.6
    s1 = (b + 1) * BAR + 0.6
    i0, i1 = max(0, int(s0 * SR)), min(n, int(s1 * SR))
    if i0 >= n:
        break
    tt = t[i0:i1]
    env = np.clip((tt - s0) / 0.9, 0, 1) * np.clip((s1 - tt) / 0.9, 0, 1)
    for j, m in enumerate(c):
        f = hz(m)
        for det, pan in ((-0.07, 0.35), (0.07, 0.65)):
            v = soft_saw(f * 2 ** (det / 12), tt, rng.uniform(0, 6.28)) * env * (0.05 if j else 0.07)
            L[i0:i1] += v * (1 - pan); R[i0:i1] += v * pan

# Gentle low-pass on the pad (FFT, zero phase)
def lp_fft(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))
L = lp_fft(L, 1400); R = lp_fft(R, 1400)

# Plucked arpeggio: eighth notes, exponential decay, ping-pong pan
step = BEAT / 2
k = 0
tt0 = 0.0
while tt0 < DUR:
    bar = int(tt0 // BAR)
    notes = ARP[bar % 4]
    m = notes[[0, 1, 2, 3, 2, 1, 2, 3][k % 8]]
    i0 = int(tt0 * SR); i1 = min(n, i0 + int(1.2 * SR))
    tt = np.arange(i1 - i0) / SR
    f = hz(m)
    v = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) + 0.12 * np.sin(2 * np.pi * 3 * f * tt)) * np.exp(-tt * 5.5) * (1 - np.exp(-tt * 300))
    amp = 0.045 * (1.0 if k % 2 == 0 else 0.75)
    pan = 0.3 if k % 2 == 0 else 0.7
    L[i0:i1] += v * amp * (1 - pan); R[i0:i1] += v * amp * pan
    k += 1; tt0 += step

# Soft pulse: muted kick-like thump on beats 1 and 3, very low
b = 0.0
while b < DUR:
    i0 = int(b * SR); i1 = min(n, i0 + int(0.35 * SR)); tt = np.arange(i1 - i0) / SR
    f = 70 * np.exp(-tt * 18) + 45
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 12) * 0.10
    L[i0:i1] += v; R[i0:i1] += v
    b += 2 * BEAT

# Simple stereo reverb-ish tail (a few feedback delays)
for d, g in ((0.031, 0.35), (0.053, 0.3), (0.079, 0.25), (0.113, 0.2)):
    s = int(d * SR)
    L[s:] += g * R[:-s] * 0.6; R[s:] += g * L[:-s] * 0.6

# Intro / outro fades
fade_in, fade_out = 2.0, 3.5
env = np.clip(t / fade_in, 0, 1) * np.clip((DUR - t) / fade_out, 0, 1)
L *= env; R *= env
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.8, R / peak * 0.8

out = Path(__file__).resolve().parent / "audio/music.wav"
pcm = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(str(out), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("music", out, f"{DUR:.1f}s")
