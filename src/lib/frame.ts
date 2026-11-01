// Auto-framing. YouCam's hair detectors reject photos where the face is too small / too large
// (they want the face at ~50–80% of the image width with the top of the hair visible).
// The browser sends each photo plus a face box (MediaPipe); here we crop around it at a given face fraction.
import "server-only";
import sharp from "sharp";
import type { FaceBox } from "./types";

const FALLBACK_BOX: FaceBox = { x: 0.35, y: 0.22, w: 0.3, h: 0.3 };

export async function normalize(buf: Buffer, maxW = 1280): Promise<Buffer> {
  return sharp(buf).rotate().resize({ width: maxW, withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
}

/**
 * Crop so the face takes `faceFrac` of the output width.
 * mode "head": 3:4 portrait from just above the hair (type / frizz).
 * mode "bust": keeps everything below the face down to the chest (length — hair has to fall over the chest).
 */
export async function cropAround(buf: Buffer, box: FaceBox | null | undefined, faceFrac: number, mode: "head" | "bust" = "head") {
  const img = sharp(buf);
  const { width: W = 0, height: H = 0 } = await img.metadata();
  const b = box && box.w > 0.02 ? box : FALLBACK_BOX;
  const fw = b.w * W;
  const cx = (b.x + b.w / 2) * W;
  let cw = Math.min(W, fw / faceFrac);
  let top = Math.max(0, b.y * H - 0.95 * fw);
  let ch = mode === "head" ? (cw * 4) / 3 : Math.min(H - top, cw * 1.7);
  if (ch > H - top) {
    // Not enough room below: slide up first, then shrink.
    top = Math.max(0, H - ch);
    ch = Math.min(ch, H - top);
    if (mode === "head") cw = Math.min(cw, (ch * 3) / 4);
  }
  const left = Math.round(Math.min(Math.max(0, cx - cw / 2), W - cw));
  const out = await sharp(buf)
    .extract({ left, top: Math.round(top), width: Math.round(cw), height: Math.round(ch) })
    // The 3-angle detectors reject sets whose images differ in size (error_mismatch_image_size).
    .resize(mode === "head" ? { width: 768, height: 1024, fit: "cover", position: "top" } : { width: 900 })
    .jpeg({ quality: 90 })
    .toBuffer();
  return out;
}

/** Add neutral margins (sides + top) so the face is smaller in frame. */
export async function pad(buf: Buffer, frac: number) {
  const { width: W = 0, height: H = 0 } = await sharp(buf).metadata();
  const x = Math.round((W * frac) / 2);
  const y = Math.round(H * frac * 0.6);
  return sharp(buf).extend({ left: x, right: x, top: y, bottom: 0, background: { r: 222, g: 224, b: 226 } }).jpeg({ quality: 90 }).toBuffer();
}

/** Keep the top part of the image (drops shoulders / chest). */
export async function topCrop(buf: Buffer, frac: number) {
  const { width: W = 0, height: H = 0 } = await sharp(buf).metadata();
  return sharp(buf).extract({ left: 0, top: 0, width: W, height: Math.round(H * frac) }).jpeg({ quality: 90 }).toBuffer();
}
