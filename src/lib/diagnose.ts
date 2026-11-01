// Runs the four YouCam hair detectors in parallel with an auto-framing retry ladder.
// Failed tasks (bad framing) do not consume units, so retrying with a different crop is free.
import "server-only";
import { cropAround, pad, topCrop } from "./frame";
import { familyOf, lengthBand, TYPE_MAPPINGS } from "./rules";
import type { FaceBox, Measured, Shot } from "./types";
import { hairDensity, hairFrizz, hairLength, hairType, YouCamError } from "./youcam";

export type Photos = Record<Shot, { buf: Buffer; box: FaceBox | null }>;

const HINTS: Record<string, string> = {
  error_face_position_too_small: "Move closer — your face should fill about two-thirds of the frame width.",
  error_face_position_out_of_boundary: "Step back a little so your whole head and hair fit in the frame.",
  error_face_angle_invalid: "Angle not recognised. Front: look straight ahead. Sides: turn ~45°. Crown: tip your head forward so the parting shows.",
  error_no_face: "No face found. Keep your face visible (even in the tilted shot).",
  error_pose: "Hold still and keep your head upright.",
};
const hint = (code: string) => HINTS[code] || "YouCam could not read this photo. Try brighter, even light.";
const codeOf = (e: unknown) => (e instanceof YouCamError ? e.code : "unknown");

/** Try fn on successive framings; move tighter on "too small" and looser on "out of boundary". */
async function ladder<T>(fracs: number[], make: (frac: number) => Promise<T>, start = Math.floor(fracs.length / 2)): Promise<{ value: T; frac: number }> {
  let i = start;
  const tried = new Set<number>();
  let last: unknown;
  while (i >= 0 && i < fracs.length && !tried.has(i)) {
    tried.add(i);
    try {
      return { value: await make(fracs[i]), frac: fracs[i] };
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

const HEAD_FRACS = [0.45, 0.52, 0.6, 0.68, 0.76];

export async function diagnose(ph: Photos): Promise<Measured> {
  const issues: Measured["issues"] = [];
  const framing: Measured["framing"] = {};

  const heads = async (frac: number) =>
    Promise.all((["front", "right", "left"] as Shot[]).map((s) => cropAround(ph[s].buf, ph[s].box, frac, "head")));

  // Type and frizz share the 3-angle set. Find the framing that works with type, then reuse it for frizz.
  const typeAndFrizz = (async () => {
    try {
      const t = await ladder(HEAD_FRACS, async (f) => hairType(...((await heads(f)) as [Buffer, Buffer, Buffer])));
      framing.type = `3-angle set cropped to face ≈ ${Math.round(t.frac * 100)}% width`;
      const fz = await ladder(HEAD_FRACS, async (f) => hairFrizz(...((await heads(f)) as [Buffer, Buffer, Buffer])), HEAD_FRACS.indexOf(t.frac)).catch((e) => {
        issues.push({ detector: "Frizz", code: codeOf(e), hint: hint(codeOf(e)) });
        return null;
      });
      if (fz) framing.frizz = `same 3-angle set, face ≈ ${Math.round(fz.frac * 100)}%`;
      return { type: t.value, frizz: fz?.value ?? null };
    } catch (e) {
      issues.push({ detector: "Curl pattern + frizz", code: codeOf(e), hint: hint(codeOf(e)) });
      return { type: null, frizz: null };
    }
  })();

  // Length wants the hair over the chest — try the uncropped front first, then bust crops.
  const length = (async () => {
    const steps: [string, () => Promise<Buffer>][] = [
      ["uncropped front photo", async () => ph.front.buf],
      ["bust crop, face ≈ 40%", () => cropAround(ph.front.buf, ph.front.box, 0.4, "bust")],
      ["bust crop, face ≈ 50%", () => cropAround(ph.front.buf, ph.front.box, 0.5, "bust")],
    ];
    let last: unknown;
    for (const [label, mk] of steps) {
      try {
        const r = await hairLength(await mk());
        framing.length = label;
        return r;
      } catch (e) {
        last = e;
        if (!/face_position/.test(codeOf(e))) break;
      }
    }
    issues.push({ detector: "Length", code: codeOf(last), hint: hint(codeOf(last)) });
    return null;
  })();

  // Density reads the parting/crown from a head-tipped-forward photo with the face still visible.
  // The detector is sensitive to framing; failed attempts are free, so walk a ladder of variants.
  const density = (async () => {
    const steps: [string, () => Promise<Buffer>][] = [
      ["head-tipped photo, uncropped", async () => ph.tilt.buf],
      ["head-tipped photo, padded", () => pad(ph.tilt.buf, 0.25)],
      ["head-tipped photo, top 70%", () => topCrop(ph.tilt.buf, 0.7)],
      ["head-tipped photo, face crop", () => cropAround(ph.tilt.buf, ph.tilt.box, 0.45, "bust")],
      ["side photo (fallback)", async () => ph.right.buf],
    ];
    let last: unknown;
    for (const [label, mk] of steps) {
      try {
        const r = await hairDensity(await mk());
        framing.density = label;
        return r;
      } catch (e) {
        last = e;
        if (!/face_(angle|position)/.test(codeOf(e))) break;
      }
    }
    issues.push({ detector: "Density", code: codeOf(last), hint: hint(codeOf(last)) });
    return null;
  })();

  const [tf, len, den] = await Promise.all([typeAndFrizz, length, density]);
  const idx = tf.type ? Math.max(0, TYPE_MAPPINGS.indexOf(tf.type.mapping.toLowerCase())) : -1;
  return {
    type: tf.type ? { mapping: tf.type.mapping, term: tf.type.term, index: idx, family: familyOf(idx) } : null,
    frizz: tf.frizz ? { level: Number(tf.frizz.mapping), term: tf.frizz.term } : null,
    density: den ? { value: parseFloat(den.mapping), term: den.term } : null,
    length: len ? { term: len.term, band: lengthBand(len.term) } : null,
    issues,
    framing,
  };
}
