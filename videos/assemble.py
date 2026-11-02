#!/usr/bin/env python3
"""Assemble the final demo: scene clips + voice-over + subtitles + ducked music → out/StrandLab_demo.mp4

Every scene is frame-locked (round(duration × 30) frames) and its voice-over is padded to exactly the
same length, so picture, voice and subtitles share one clock (captions.mjs uses the same offsets).
"""
import json, subprocess, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TL = json.loads((ROOT / "script/timeline.json").read_text())
FPS, SR = 30, 48000
TMP = ROOT / "work/assemble"
TMP.mkdir(parents=True, exist_ok=True)
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)


def run(*a):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, a)], check=True)


# 1) Frame-locked video segments and narration
lst, pcm, total_frames = [], b"", 0
for sc in TL["scenes"]:
    n = round(sc["duration"] * FPS)
    total_frames += n
    seg = TMP / f"{sc['id']}.mp4"
    run("-i", ROOT / "clips" / f"{sc['id']}.mp4", "-vf", f"fps={FPS},scale=1920:1080:flags=lanczos,setsar=1,tpad=stop_mode=clone:stop_duration=1,format=yuv420p",
        "-frames:v", n, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "14", seg)
    lst.append(f"file '{seg}'")
    with wave.open(str(ROOT / "audio" / f"{sc['id']}.wav")) as w:
        data = w.readframes(w.getnframes())
    want = n * (SR // FPS) * 2  # samples × 2 bytes (mono s16)
    pcm += data[:want].ljust(want, b"\x00")
(TMP / "list.txt").write_text("\n".join(lst) + "\n")
run("-f", "concat", "-safe", "0", "-i", TMP / "list.txt", "-c", "copy", TMP / "video.mp4")
with wave.open(str(TMP / "voice.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
total = total_frames / FPS
print(f"video {total:.2f}s ({total_frames} frames)")

# 2) Final mix: subtitles on top, fade in/out, music ducked under the voice, loudness-normalised for YouTube
fc = (
    f"[0:v][1:v]overlay=0:0:format=auto,fade=t=in:st=0:d=0.5,fade=t=out:st={total - 0.8:.3f}:d=0.8,format=yuv420p[v];"
    "[2:a]aformat=channel_layouts=stereo,asplit=2[vo][sc];"
    f"[3:a]atrim=0:{total:.3f},volume=0.17[mu];"
    "[mu][sc]sidechaincompress=threshold=0.02:ratio=8:attack=10:release=500:makeup=1[md];"
    "[vo][md]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]"
)
out = OUT / "StrandLab_demo.mp4"
run("-i", TMP / "video.mp4", "-i", ROOT / "captions/track.mov", "-i", TMP / "voice.wav", "-i", ROOT / "audio/music.wav",
    "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", FPS,
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out)
# Clean version without burned-in subtitles (upload with the .srt as YouTube captions if preferred)
run("-i", TMP / "video.mp4", "-i", TMP / "voice.wav", "-i", ROOT / "audio/music.wav",
    "-filter_complex", fc.replace("[0:v][1:v]overlay=0:0:format=auto,", "[0:v]").replace("[2:a]", "[1:a]").replace("[3:a]", "[2:a]"),
    "-map", "[v]", "-map", "[a]", "-t", f"{total:.3f}",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", FPS,
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", OUT / "StrandLab_demo_no_subtitles.mp4")
(OUT / "StrandLab_demo.srt").write_bytes((ROOT / "captions/strandlab.srt").read_bytes())
print("wrote", out)
