"use client";
// Browser helpers: image resize, MediaPipe face box (for server-side auto-framing), Open-Meteo dew point.
import type { Climate, FaceBox } from "./types";
import { dewBand } from "./rules";

export async function fileToImage(src: Blob | string): Promise<HTMLImageElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  return img;
}

/** Downscale to max 1280px wide JPEG. */
export async function toJpeg(img: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, maxW = 1280, mirror = false): Promise<Blob> {
  const w0 = img instanceof HTMLVideoElement ? img.videoWidth : img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const h0 = img instanceof HTMLVideoElement ? img.videoHeight : img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const s = Math.min(1, maxW / w0);
  const c = document.createElement("canvas");
  c.width = Math.round(w0 * s);
  c.height = Math.round(h0 * s);
  const ctx = c.getContext("2d")!;
  if (mirror) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

// ---- MediaPipe face detector (lazy, from CDN wasm) ----
type Detector = { detect: (img: HTMLImageElement) => { detections: { boundingBox?: { originX: number; originY: number; width: number; height: number } }[] } };
let detectorP: Promise<Detector | null> | null = null;

function getDetector() {
  if (!detectorP)
    detectorP = (async () => {
      try {
        const v = await import("@mediapipe/tasks-vision");
        const fileset = await v.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        return (await v.FaceDetector.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.4,
        })) as unknown as Detector;
      } catch (e) {
        console.warn("Face detector unavailable, server will use a centred fallback crop", e);
        return null;
      }
    })();
  return detectorP;
}

// ---- Live (VIDEO-mode) detector for the guided camera ----
export type LiveFace = { box: { x: number; y: number; w: number; h: number }; kp: { x: number; y: number }[] };
type VideoDetector = {
  detectForVideo: (v: HTMLVideoElement, ts: number) => { detections: { boundingBox?: { originX: number; originY: number; width: number; height: number }; keypoints?: { x: number; y: number }[] }[] };
};
let videoP: Promise<VideoDetector | null> | null = null;

export function getVideoDetector() {
  if (!videoP)
    videoP = (async () => {
      try {
        const v = await import("@mediapipe/tasks-vision");
        const fileset = await v.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        return (await v.FaceDetector.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.35,
        })) as unknown as VideoDetector;
      } catch {
        return null;
      }
    })();
  return videoP;
}

/** Largest face in the current video frame, normalised to 0..1 (unmirrored camera coordinates). */
export function detectLive(d: VideoDetector, v: HTMLVideoElement, ts: number): LiveFace | null {
  try {
    const W = v.videoWidth,
      H = v.videoHeight;
    if (!W || !H) return null;
    const r = d.detectForVideo(v, ts).detections.filter((x) => x.boundingBox);
    const b = r.sort((a, c) => c.boundingBox!.width * c.boundingBox!.height - a.boundingBox!.width * a.boundingBox!.height)[0];
    if (!b) return null;
    const bb = b.boundingBox!;
    return { box: { x: bb.originX / W, y: bb.originY / H, w: bb.width / W, h: bb.height / H }, kp: (b.keypoints || []).map((k) => ({ x: k.x, y: k.y })) };
  } catch {
    return null;
  }
}

export async function faceBox(img: HTMLImageElement): Promise<FaceBox | null> {
  const d = await getDetector();
  if (!d) return null;
  try {
    const r = d.detect(img).detections;
    const b = r.map((x) => x.boundingBox!).filter(Boolean).sort((a, c) => c.width * c.height - a.width * a.height)[0];
    if (!b) return null;
    const W = img.naturalWidth,
      H = img.naturalHeight;
    return { x: b.originX / W, y: b.originY / H, w: b.width / W, h: b.height / H };
  } catch {
    return null;
  }
}

// ---- Climate (Open-Meteo: free, no key, CORS-enabled) ----
export async function climateFor(lat: number, lon: number, place: string): Promise<Climate> {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=dew_point_2m,relative_humidity_2m&hourly=dew_point_2m&forecast_days=4&timezone=auto`;
  const j = await (await fetch(u)).json();
  const dp = Number(j.current.dew_point_2m);
  const hourly: number[] = (j.hourly?.dew_point_2m || []).filter((x: number | null) => x !== null);
  // Group hourly dew point into days; the daily peak drives the routine (humidity peaks in the afternoon).
  const byDay = new Map<string, number[]>();
  (j.hourly?.time || []).forEach((t: string, i: number) => {
    const v = j.hourly.dew_point_2m[i];
    if (v === null || v === undefined) return;
    const d = t.slice(0, 10);
    byDay.set(d, [...(byDay.get(d) || []), v]);
  });
  const days = Array.from(byDay.entries()).slice(0, 4).map(([date, vals]) => {
    const dewMax = Math.max(...vals);
    return { date, dewMax, dewMin: Math.min(...vals), band: dewBand(dewMax) };
  });
  return {
    days,
    place,
    dewPointC: dp,
    humidity: Number(j.current.relative_humidity_2m),
    dewMax3d: hourly.length ? Math.max(...hourly) : dp,
    dewMin3d: hourly.length ? Math.min(...hourly) : dp,
    band: dewBand(dp),
  };
}

export async function geocode(q: string): Promise<{ lat: number; lon: number; place: string } | null> {
  const j = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`)).json();
  const r = j.results?.[0];
  return r ? { lat: r.latitude, lon: r.longitude, place: [r.name, r.country_code].filter(Boolean).join(", ") } : null;
}

export async function reverseName(lat: number, lon: number): Promise<string> {
  try {
    const j = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)).json();
    return [j.city || j.locality, j.countryCode].filter(Boolean).join(", ") || "Your location";
  } catch {
    return "Your location";
  }
}
