"use client";
import { useEffect, useRef, useState } from "react";
import { detectLive, faceBox, fileToImage, getVideoDetector, toJpeg, type LiveFace } from "@/lib/client";
import type { FaceBox, Shot } from "@/lib/types";
import { SHOTS } from "@/lib/types";
import { FlowNav } from "./Shell";

export type CapturedPhoto = { blob: Blob; url: string; box: FaceBox | null };

const GUIDE: Record<Shot, { title: string; tip: string; detector: string }> = {
  front: { title: "Front", tip: "Look straight ahead, hair down over your shoulders.", detector: "Curl pattern · Frizz · Length" },
  right: { title: "Turn right", tip: "Turn your head ~45° so the camera sees one side of your hair.", detector: "Curl pattern · Frizz" },
  left: { title: "Turn left", tip: "Same, other side ~45°.", detector: "Curl pattern · Frizz" },
  tilt: { title: "Tip forward", tip: "Tip your head down ~30° so your parting shows — keep your face visible.", detector: "Density" },
};

function Silhouette({ shot }: { shot: Shot }) {
  // Simple line icon of a head in each pose.
  const rot = shot === "right" ? -28 : shot === "left" ? 28 : 0;
  return (
    <svg viewBox="0 0 80 80" className="h-14 w-14 text-teal" aria-hidden>
      <g transform={`rotate(${shot === "tilt" ? 0 : 0} 40 40)`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M16 46c-4-20 8-34 24-34s28 14 24 34" opacity=".45" />
        <ellipse cx={40 + rot * 0.18} cy={shot === "tilt" ? 46 : 42} rx="13" ry={shot === "tilt" ? 13 : 16} />
        {shot === "tilt" && <path d="M28 34c6-6 18-6 24 0M40 28v8" />}
        {shot !== "tilt" && <path d={`M${34 + rot * 0.3} 40h.01M${46 + rot * 0.3} 40h.01`} strokeWidth="3" />}
        <path d="M22 72c4-8 10-11 18-11s14 3 18 11" opacity=".6" />
      </g>
    </svg>
  );
}

export default function Capture({ photos, setPhoto, onDone, onBack }: {
  photos: Partial<Record<Shot, CapturedPhoto>>;
  setPhoto: (s: Shot, p: CapturedPhoto | null) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [camFor, setCamFor] = useState<Shot | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<Shot | null>(null);
  const ready = SHOTS.every((s) => photos[s]);

  async function accept(shot: Shot, blob: Blob) {
    const img = await fileToImage(blob);
    const jpeg = await toJpeg(img);
    const im2 = await fileToImage(jpeg);
    const box = await faceBox(im2);
    setPhoto(shot, { blob: jpeg, url: im2.src, box });
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    // Multiple files: fill empty slots in order. Single file: the chosen slot.
    const list = Array.from(files);
    if (list.length > 1) {
      const order = SHOTS.filter((s) => !photos[s] || s === uploadFor);
      for (let i = 0; i < Math.min(list.length, order.length); i++) await accept(order[i], list[i]);
    } else if (uploadFor) await accept(uploadFor, list[0]);
  }

  return (
    <>
    <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-8">
      <h1 className="h2">Take four quick photos</h1>
      <p className="mt-2 max-w-2xl text-ink/75">
        This lets the AI see all of your hair: curl pattern and frizz from three angles, density from your parting, length from the front.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Photo tips">
        <li className="chip">💡 Even, bright light</li>
        <li className="chip">Hair loose, not tied up</li>
        <li className="chip">No hat or headband</li>
        <li className="chip">We auto-frame each photo</li>
        <li className="chip">📸 Camera talks you through it &amp; shoots hands-free</li>
      </ul>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SHOTS.map((s) => {
          const p = photos[s];
          return (
            <div key={s} className="card overflow-hidden flex flex-col">
              <div className="relative aspect-[3/4] bg-shell flex items-center justify-center">
                {p ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={`${s} photo`} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <Silhouette shot={s} />
                    <p className="text-xs text-muted">{GUIDE[s].tip}</p>
                  </div>
                )}
                {p && (
                  <span className={`absolute left-2 top-2 chip ${p.box ? "text-teal" : "text-amber"}`}>
                    {p.box ? "✓ face found" : "framing: auto-centre"}
                  </span>
                )}
                {p && (
                  <button onClick={() => setPhoto(s, null)} className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs" aria-label={`Remove ${GUIDE[s].title} photo`}>✕</button>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <div>
                  <p className="font-medium">{GUIDE[s].title}</p>
                  <p className="receipt">{GUIDE[s].detector}</p>
                </div>
                <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button className="btn-ghost !px-2 !py-1.5" onClick={() => setCamFor(s)} aria-label={`Take ${GUIDE[s].title} photo with camera`}>Camera</button>
                  <button className="btn-ghost !px-2 !py-1.5" onClick={() => { setUploadFor(s); fileRef.current?.click(); }} aria-label={`Upload ${GUIDE[s].title} photo`}>Upload</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />

      <p className="mt-4 text-sm text-muted">Uploading from your gallery? Select all four files at once and they fill the slots in order.</p>
      <p className="mt-2 text-sm text-muted">
        Can&apos;t or don&apos;t want to take photos (no camera, privacy, head covering)?{" "}
        <a href="/quick" className="text-teal underline font-medium">Use the no-photo check</a> — a self-reported plan from 4 questions.
      </p>

      {camFor && <CameraModal shot={camFor} onClose={() => setCamFor(null)} onShot={async (b) => { const s = camFor; setCamFor(null); await accept(s, b); const next = SHOTS.find((x) => x !== s && !photos[x]); if (next) setCamFor(next); }} />}
    </section>
    <FlowNav back={onBack} backLabel="Home" next={onDone} nextDisabled={!ready} nextLabel={ready ? "Analyse my hair →" : `${SHOTS.filter((s) => photos[s]).length} of 4 photos`} hint={ready ? "All set — analysis runs while you answer 4 questions." : "Add all four photos to continue."} />
    </>
  );
}

// ---------- Guided camera: live pose checks, spoken prompts, hands-free auto-capture ----------

type Verdict = { ok: boolean; say: string; tone: "good" | "fix" | "wait" };

/** Head-down calibration: the front shot records the neutral nose-below-eyes ratio. */
let neutralPitch: number | null = null;

function pose(f: LiveFace) {
  const [re, le, nose] = f.kp;
  if (!re || !le || !nose) return null;
  const eyeMid = { x: (re.x + le.x) / 2, y: (re.y + le.y) / 2 };
  const eyeDist = Math.hypot(re.x - le.x, re.y - le.y) || 0.001;
  return {
    yaw: (nose.x - eyeMid.x) / eyeDist, // 0 = facing camera; |yaw| > ~0.3 ≈ 35–45° turn
    pitch: (nose.y - eyeMid.y) / eyeDist, // smaller = head tipped down
  };
}

function judge(shot: Shot, f: LiveFace | null, dark: boolean): Verdict {
  if (dark) return { ok: false, say: "It's a bit dark. Face a window or a lamp.", tone: "fix" };
  if (!f) return { ok: false, say: shot === "tilt" ? "Tip your head forward, but keep your face in view." : "I can't see your face yet. Look at the screen.", tone: "wait" };
  const cx = f.box.x + f.box.w / 2,
    cy = f.box.y + f.box.h / 2;
  if (f.box.w < 0.22) return { ok: false, say: "Move a little closer.", tone: "fix" };
  if (f.box.w > 0.6) return { ok: false, say: "Move back a little so all your hair fits.", tone: "fix" };
  // Camera faces the user, so the camera's left is the user's right.
  if (cx < 0.33) return { ok: false, say: "Move a little to your left.", tone: "fix" };
  if (cx > 0.67) return { ok: false, say: "Move a little to your right.", tone: "fix" };
  if (cy < 0.22) return { ok: false, say: "Lower the camera slightly.", tone: "fix" };
  if (cy > 0.68) return { ok: false, say: "Raise the camera slightly.", tone: "fix" };
  const p = pose(f);
  if (!p) return { ok: true, say: "Hold still…", tone: "good" };
  if (shot === "front") {
    if (Math.abs(p.yaw) > 0.18) return { ok: false, say: "Look straight at the camera.", tone: "fix" };
  } else if (shot === "right" || shot === "left") {
    if (Math.abs(p.yaw) < 0.28) return { ok: false, say: `Turn your head to your ${shot}, about halfway.`, tone: "fix" };
    if (Math.abs(p.yaw) > 0.9) return { ok: false, say: "Turn back a little — keep one eye visible.", tone: "fix" };
  } else if (shot === "tilt") {
    const target = neutralPitch ? neutralPitch * 0.72 : 0.42;
    if (p.pitch > target) return { ok: false, say: "Tip your head further forward so your parting shows.", tone: "fix" };
  }
  return { ok: true, say: "Perfect — hold still.", tone: "good" };
}

function CameraModal({ shot, onClose, onShot }: { shot: Shot; onClose: () => void; onShot: (b: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [voice, setVoice] = useState(true);
  const [v, setV] = useState<Verdict>({ ok: false, say: "Starting the camera…", tone: "wait" });
  const [hold, setHold] = useState(0); // 0..1 progress of the steady-pose timer
  const autoRef = useRef(auto);
  const voiceRef = useRef(voice);
  const taken = useRef(false);
  autoRef.current = auto;
  voiceRef.current = voice;

  const say = useRef((t: string) => {
    if (!voiceRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  });

  async function capture() {
    if (taken.current || !video.current) return;
    taken.current = true;
    const f = video.current;
    // Remember the neutral head pitch from the front shot to judge the tip-forward shot.
    if (shot === "front" && lastFace.current) {
      const p = pose(lastFace.current);
      if (p) neutralPitch = p.pitch;
    }
    say.current("Got it.");
    onShot(await toJpeg(f, 1280, true));
  }
  const lastFace = useRef<LiveFace | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1706 } }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setErr("Camera unavailable — use Upload instead."));

    // Live guidance loop (~8 fps).
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let last = 0,
      goodSince = 0,
      lastSaid = "",
      lastSaidAt = 0,
      darkCheckAt = 0,
      dark = false;
    getVideoDetector().then((det) => {
      say.current(`${GUIDE[shot].title}. ${GUIDE[shot].tip}`);
      lastSaidAt = performance.now();
      const tick = (t: number) => {
        if (stopped) return;
        raf = requestAnimationFrame(tick);
        const el = video.current;
        if (!el || el.readyState < 2 || t - last < 120 || taken.current) return;
        last = t;
        if (t - darkCheckAt > 1000 && ctx) {
          darkCheckAt = t;
          ctx.drawImage(el, 0, 0, 24, 24);
          const d = ctx.getImageData(0, 0, 24, 24).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
          dark = sum / (d.length / 4) < 55;
        }
        const face = det ? detectLive(det, el, t) : null;
        lastFace.current = face;
        const verdict = det ? judge(shot, face, dark) : { ok: false, say: "Auto-guide unavailable — tap Take photo.", tone: "wait" as const };
        setV(verdict);
        // Speak changes, but not more than every ~2.5 s, and never repeat the same line back-to-back quickly.
        if (verdict.say !== lastSaid && t - lastSaidAt > 2500) {
          lastSaid = verdict.say;
          lastSaidAt = t;
          say.current(verdict.say);
        }
        if (verdict.ok && autoRef.current) {
          if (!goodSince) goodSince = t;
          const pr = Math.min(1, (t - goodSince) / 1200);
          setHold(pr);
          if (pr >= 1) capture();
        } else {
          goodSince = 0;
          setHold(0);
        }
      };
      raf = requestAnimationFrame(tick);
    });

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      stream?.getTracks().forEach((t) => t.stop());
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snap() {
    setCount(3);
    let n = 3;
    const id = setInterval(async () => {
      n -= 1;
      if (n > 0) return setCount(n);
      clearInterval(id);
      setCount(null);
      capture();
    }, 800);
  }

  const ring = v.tone === "good" ? "#3FA796" : v.tone === "fix" ? "#E0A040" : "#FFFFFF";
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Camera: ${GUIDE[shot].title}`}>
      <div className="w-full max-w-md">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black">
          <video ref={video} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover -scale-x-100" />
          {/* Framing guide changes colour with the live check; fills as the steady-pose timer runs */}
          <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
            <ellipse cx="150" cy="190" rx="90" ry="118" fill="none" stroke={ring} strokeOpacity=".9" strokeWidth={v.tone === "good" ? 4 : 2} strokeDasharray={v.tone === "good" ? undefined : "6 6"} />
            {hold > 0 && <ellipse cx="150" cy="190" rx="98" ry="126" fill="none" stroke="#3FA796" strokeWidth="6" strokeLinecap="round" pathLength={100} strokeDasharray={`${hold * 100} 100`} transform="rotate(-90 150 190)" />}
          </svg>
          <p className="absolute top-3 inset-x-3 text-center text-white text-sm bg-black/50 rounded-full px-3 py-1">{GUIDE[shot].title}: {GUIDE[shot].tip}</p>
          <p
            role="status"
            aria-live="polite"
            className={`absolute bottom-3 inset-x-3 text-center text-base font-semibold rounded-2xl px-4 py-2 ${v.tone === "good" ? "bg-[#3FA796] text-white" : v.tone === "fix" ? "bg-amber-soft text-ink" : "bg-black/60 text-white"}`}
          >
            {v.say}
          </p>
          {count !== null && <div className="absolute inset-0 flex items-center justify-center text-white text-7xl font-serif">{count}</div>}
          {err && <p className="absolute inset-0 flex items-center justify-center bg-black/70 text-white p-6 text-center">{err}</p>}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
          <button onClick={() => setAuto(!auto)} aria-pressed={auto} className={`rounded-full border px-3 py-1.5 ${auto ? "border-white bg-white text-ink" : "border-white/40 text-white"}`}>
            Auto-capture {auto ? "on" : "off"}
          </button>
          <button
            onClick={() => {
              if (voice && "speechSynthesis" in window) window.speechSynthesis.cancel();
              setVoice(!voice);
            }}
            aria-pressed={voice}
            className={`rounded-full border px-3 py-1.5 ${voice ? "border-white bg-white text-ink" : "border-white/40 text-white"}`}
          >
            Voice guide {voice ? "on" : "off"}
          </button>
        </div>
        <div className="mt-3 flex justify-center gap-3">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={snap} disabled={!!err || count !== null}>Take photo now (3s)</button>
        </div>
        <p className="mt-2 text-center text-xs text-white/70">{auto ? "Hold the pose — the photo takes itself when the oval turns green." : "Tap Take photo when you're ready."}</p>
      </div>
    </div>
  );
}
