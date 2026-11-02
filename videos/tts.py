#!/usr/bin/env python3
"""Generate the voice-over one sentence at a time with Sarvam (bulbul) and build a sentence-level timeline.

Per-sentence synthesis gives exact start/end times for every subtitle and lets the screen recorder
fire on-screen actions at the moment each sentence is spoken.

usage: SARVAM_API_KEY=... python3 videos/tts.py [--force]
out:   videos/audio/<scene>_<n>.wav, videos/audio/<scene>.wav, videos/script/timeline.json
"""
import base64, json, os, subprocess, sys, urllib.request, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NAR = json.loads((ROOT / "script/narration.json").read_text())
AUD = ROOT / "audio"
AUD.mkdir(exist_ok=True)
KEY = os.environ.get("SARVAM_API_KEY") or sys.exit("set SARVAM_API_KEY")
FORCE = "--force" in sys.argv
SR = 48000


def tts(text: str, out: Path):
    v = NAR["voice"]
    body = {"text": text, "language_code": v["language_code"], "model": v["model"], "speaker": v["speaker"], "pace": v["pace"], "speech_sample_rate": SR}
    req = urllib.request.Request("https://api.sarvam.ai/text-to-speech", data=json.dumps(body).encode(),
                                 headers={"api-subscription-key": KEY, "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    raw = out.with_suffix(".raw.wav")
    raw.write_bytes(base64.b64decode(d["audios"][0]))
    # Trim leading/trailing silence so subtitle timings match the actual speech.
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,"
                    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse",
                    "-ar", str(SR), "-ac", "1", str(out)], check=True)
    raw.unlink()


def dur(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def silence(sec: float) -> bytes:
    return b"\x00\x00" * int(round(sec * SR))


timeline, t = [], 0.0
for sc in NAR["scenes"]:
    frames = silence(sc["lead"])
    lines, local = [], sc["lead"]
    for i, ln in enumerate(sc["lines"]):
        p = AUD / f"{sc['id']}_{i}.wav"
        if FORCE or not p.exists():
            print("tts", p.name, "…", flush=True)
            tts(ln["say"], p)
        d = dur(p)
        with wave.open(str(p)) as w:
            frames += w.readframes(w.getnframes())
        lines.append({"cap": ln["cap"], "start": round(local, 3), "end": round(local + d, 3)})
        local += d
        if i < len(sc["lines"]) - 1:
            frames += silence(NAR["gap"])
            local += NAR["gap"]
    frames += silence(sc["tail"])
    local += sc["tail"]
    with wave.open(str(AUD / f"{sc['id']}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(frames)
    timeline.append({"id": sc["id"], "start": round(t, 3), "duration": round(local, 3), "lines": lines})
    t += local

(ROOT / "script/timeline.json").write_text(json.dumps({"total": round(t, 3), "scenes": timeline}, indent=1))
for s in timeline:
    print(f"{s['id']:12s} {s['start']:6.1f}s  +{s['duration']:5.1f}s")
print(f"TOTAL {t:.1f}s")
