"use client";
import { useEffect, useRef, useState } from "react";
import { faceBox, fileToImage, toJpeg } from "@/lib/client";
import type { FaceBox, Shot } from "@/lib/types";
import { SHOTS } from "@/lib/types";

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
    <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <button onClick={onBack} className="text-sm text-muted hover:text-ink">← Back</button>
      <p className="eyebrow mt-6">Step 1 of 3 · Photos</p>
      <h2 className="h2 mt-2">Four quick shots, so the AI sees all of your hair</h2>
      <p className="mt-2 max-w-2xl text-muted">
        YouCam&apos;s hair detectors read curl pattern and frizz from three angles, density from your parting, and length from the front. Loose hair, even light,
        no hat. We auto-frame each photo for you.
      </p>

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
                  <button onClick={() => setPhoto(s, null)} className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs" aria-label="Remove photo">✕</button>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <div>
                  <p className="font-medium">{GUIDE[s].title}</p>
                  <p className="receipt">{GUIDE[s].detector}</p>
                </div>
                <div className="mt-auto flex gap-2">
                  <button className="btn-ghost !px-3 !py-1.5 flex-1" onClick={() => setCamFor(s)}>Camera</button>
                  <button className="btn-ghost !px-3 !py-1.5 flex-1" onClick={() => { setUploadFor(s); fileRef.current?.click(); }}>Upload</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={!ready} onClick={onDone}>Analyse my hair →</button>
        <p className="text-sm text-muted">{SHOTS.filter((s) => photos[s]).length}/4 photos · tip: select all four files at once to fill the slots in order</p>
      </div>

      {camFor && <CameraModal shot={camFor} onClose={() => setCamFor(null)} onShot={async (b) => { const s = camFor; setCamFor(null); await accept(s, b); const next = SHOTS.find((x) => x !== s && !photos[x]); if (next) setCamFor(next); }} />}
    </section>
  );
}

function CameraModal({ shot, onClose, onShot }: { shot: Shot; onClose: () => void; onShot: (b: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1706 } }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setErr("Camera unavailable — use Upload instead."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  function snap() {
    setCount(3);
    let n = 3;
    const id = setInterval(async () => {
      n -= 1;
      if (n > 0) return setCount(n);
      clearInterval(id);
      setCount(null);
      if (video.current) onShot(await toJpeg(video.current, 1280, true));
    }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black">
          <video ref={video} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover -scale-x-100" />
          {/* Framing guide: face oval ≈ 60% width */}
          <svg viewBox="0 0 300 400" className="absolute inset-0 h-full w-full pointer-events-none">
            <ellipse cx="150" cy="190" rx="90" ry="118" fill="none" stroke="white" strokeOpacity=".8" strokeWidth="2" strokeDasharray="6 6" />
          </svg>
          <p className="absolute top-3 inset-x-3 text-center text-white text-sm bg-black/40 rounded-full px-3 py-1">{GUIDE[shot].title}: {GUIDE[shot].tip}</p>
          {count !== null && <div className="absolute inset-0 flex items-center justify-center text-white text-7xl font-serif">{count}</div>}
          {err && <p className="absolute inset-0 flex items-center justify-center text-white p-6 text-center">{err}</p>}
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={snap} disabled={!!err || count !== null}>Take photo (3s)</button>
        </div>
      </div>
    </div>
  );
}
