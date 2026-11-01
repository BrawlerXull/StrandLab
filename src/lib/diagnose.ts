// Runs the YouCam hair detectors with an auto-framing retry ladder and records a trace of every call.
// Failed tasks (bad framing) do not consume units, so retrying with a different crop is free.
// Split into three independent parts so the browser can run them as parallel requests
// (each gets its own serverless time budget) and show live progress.
import "server-only";
import { cropAround, pad, topCrop } from "./frame";
import { familyOf, lengthBand, TYPE_MAPPINGS } from "./rules";
import type { FaceBox, Measured, Part, PartResult, Shot, TraceEntry } from "./types";
import { hairDensity, hairFrizz, hairLength, hairType, YouCamError } from "./youcam";

export type Photos = Partial<Record<Shot, { buf: Buffer; box: FaceBox | null }>>;

const HINTS: Record<string, string> = {
  error_face_position_too_small: "Move closer — your face should fill about two-thirds of the frame width.",
  error_face_position_out_of_boundary: "Step back a little so your whole head and hair fit in the frame.",
  error_face_angle_invalid: "Angle not recognised. Front: look straight ahead. Sides: turn ~45°. Tip-forward: lower your chin so the parting shows, face still visible.",
  error_no_face: "No face found. Keep your face visible (even in the tipped-forward shot).",
  error_pose: "Hold still and keep your head upright.",
  error_mismatch_image_size: "The three angle photos must come from the same camera — retake them together.",
};
const hint = (code: string) => HINTS[code] || "YouCam could not read this photo. Try brighter, even light.";
const codeOf = (e: unknown) => (e instanceof YouCamError ? e.code : "unknown");

/** Runs one YouCam attempt and records it in the trace entry. */
async function attempt<T>(entry: TraceEntry, variant: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    const v = await fn();
    entry.attempts.push({ variant, outcome: "success", ms: Date.now() - t0 });
    return v;
  } catch (e) {
    entry.attempts.push({ variant, outcome: codeOf(e), ms: Date.now() - t0 });
    throw e;
  }
}

const newEntry = (api: string, detector: string, input: string): TraceEntry => ({ api, detector, input, attempts: [] });

const HEAD_FRACS = [0.45, 0.52, 0.6, 0.68, 0.76];

/** Walk crops: tighter on "too small", looser on "out of boundary". */
async function ladder<T>(entry: TraceEntry, make: (frac: number) => Promise<T>, start = 2): Promise<{ value: T; frac: number }> {
  let i = start;
  const tried = new Set<number>();
  let last: unknown;
  while (i >= 0 && i < HEAD_FRACS.length && !tried.has(i)) {
    tried.add(i);
    try {
      const f = HEAD_FRACS[i];
      return { value: await attempt(entry, `head crop, face ≈ ${Math.round(f * 100)}% of width`, () => make(f)), frac: f };
    } catch (e) {
      last = e;
      const c = codeOf(e);
      if (c === "error_face_position_too_small") i++;
      else if (c === "error_face_position_out_of_boundary") i--;
      else break;
    }
  }
  throw last;
}

/** Curl pattern + frizz from the front/right/left set (they share the same framing). */
async function curl(ph: Photos): Promise<PartResult> {
  const out: PartResult = { issues: [], framing: {}, trace: [] };
  if (!ph.front || !ph.right || !ph.left) throw new Error("Front, right and left photos are required");
  const heads = (frac: number) => Promise.all(([ph.front!, ph.right!, ph.left!]).map((p) => cropAround(p.buf, p.box, frac, "head"))) as Promise<[Buffer, Buffer, Buffer]>;
  const te = newEntry("Hair Type Detection", "Curl pattern", "front + right + left");
  const fe = newEntry("Hair Frizziness Detection", "Frizz", "front + right + left");
  out.trace.push(te, fe);
  // Run both detectors concurrently (sequential runs can exceed a 60 s serverless budget on cold YouCam workers).
  const [t, fz] = await Promise.allSettled([
    ladder(te, async (f) => hairType(...(await heads(f)))),
    ladder(fe, async (f) => hairFrizz(...(await heads(f)))),
  ]);
  if (t.status === "fulfilled") {
    out.framing.type = `3-angle set cropped to face ≈ ${Math.round(t.value.frac * 100)}% width`;
    const idx = Math.max(0, TYPE_MAPPINGS.indexOf(t.value.value.mapping.toLowerCase()));
    out.type = { mapping: t.value.value.mapping, term: t.value.value.term, index: idx, family: familyOf(idx) };
  } else {
    out.issues.push({ detector: "Curl pattern", code: codeOf(t.reason), hint: hint(codeOf(t.reason)) });
  }
  if (fz.status === "fulfilled") {
    out.framing.frizz = `same 3-angle set, face ≈ ${Math.round(fz.value.frac * 100)}%`;
    out.frizz = { level: Number(fz.value.value.mapping), term: fz.value.value.term };
  } else {
    out.issues.push({ detector: "Frizz", code: codeOf(fz.reason), hint: hint(codeOf(fz.reason)) });
  }
  return out;
}

/** Length wants the hair over the chest — uncropped front first, then bust crops. */
async function length(ph: Photos): Promise<PartResult> {
  const out: PartResult = { issues: [], framing: {}, trace: [] };
  if (!ph.front) throw new Error("Front photo is required");
  const front = ph.front;
  const e = newEntry("Hair Length Detection", "Length", "front");
  out.trace.push(e);
  const steps: [string, () => Promise<Buffer>][] = [
    ["uncropped front photo", async () => front.buf],
    ["bust crop, face ≈ 40%", () => cropAround(front.buf, front.box, 0.4, "bust")],
    ["bust crop, face ≈ 50%", () => cropAround(front.buf, front.box, 0.5, "bust")],
  ];
  let last: unknown;
  for (const [label, mk] of steps) {
    try {
      const r = await attempt(e, label, async () => hairLength(await mk()));
      out.framing.length = label;
      out.length = { term: r.term, band: lengthBand(r.term) };
      return out;
    } catch (err) {
      last = err;
      if (!/face_position/.test(codeOf(err))) break;
    }
  }
  out.issues.push({ detector: "Length", code: codeOf(last), hint: hint(codeOf(last)) });
  return out;
}

/** Density reads the parting from a tipped-forward photo; sensitive to framing, so walk variants. */
async function density(ph: Photos): Promise<PartResult> {
  const out: PartResult = { issues: [], framing: {}, trace: [] };
  if (!ph.tilt) throw new Error("Tipped-forward photo is required");
  const tilt = ph.tilt;
  const e = newEntry("Hair Density Detection", "Density", ph.right ? "tipped-forward (side as fallback)" : "tipped-forward");
  out.trace.push(e);
  const steps: [string, () => Promise<Buffer>][] = [
    ["tipped-forward photo, uncropped", async () => tilt.buf],
    ["tipped-forward photo, padded", () => pad(tilt.buf, 0.25)],
    ["tipped-forward photo, top 70%", () => topCrop(tilt.buf, 0.7)],
    ["tipped-forward photo, face crop", () => cropAround(tilt.buf, tilt.box, 0.45, "bust")],
  ];
  if (ph.right) steps.push(["side photo (fallback)", async () => ph.right!.buf]);
  let last: unknown;
  for (const [label, mk] of steps) {
    try {
      const r = await attempt(e, label, async () => hairDensity(await mk()));
      out.framing.density = label;
      out.density = { value: parseFloat(r.mapping), term: r.term };
      return out;
    } catch (err) {
      last = err;
      if (!/face_(angle|position)/.test(codeOf(err))) break;
    }
  }
  out.issues.push({ detector: "Density", code: codeOf(last), hint: hint(codeOf(last)) });
  return out;
}

export const PARTS: Record<Part, { run: (ph: Photos) => Promise<PartResult>; shots: Shot[] }> = {
  curl: { run: curl, shots: ["front", "right", "left"] },
  length: { run: length, shots: ["front"] },
  density: { run: density, shots: ["tilt", "right"] },
};

export function merge(parts: PartResult[]): Measured {
  const m: Measured = { type: null, frizz: null, density: null, length: null, issues: [], framing: {}, trace: [] };
  for (const p of parts) {
    if (p.type) m.type = p.type;
    if (p.frizz) m.frizz = p.frizz;
    if (p.density) m.density = p.density;
    if (p.length) m.length = p.length;
    m.issues.push(...p.issues);
    Object.assign(m.framing, p.framing);
    m.trace!.push(...p.trace);
  }
  return m;
}

/** All parts at once (used by the sample builder). */
export async function diagnose(ph: Photos): Promise<Measured> {
  return merge(await Promise.all(Object.values(PARTS).map((p) => p.run(ph))));
}
