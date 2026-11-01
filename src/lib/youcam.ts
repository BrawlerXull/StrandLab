// Server-only YouCam API client (v2, API-key bearer auth).
/* eslint-disable @typescript-eslint/no-explicit-any -- YouCam responses are loosely typed JSON */
// Every AI feature is: upload file(s) -> start task -> poll until success/error.
import "server-only";

const BASE = process.env.YOUCAM_BASE_URL || "https://yce-api-01.makeupar.com";

function key() {
  const k = process.env.YOUCAM_API_KEY;
  if (!k) throw new Error("YOUCAM_API_KEY is not set");
  return k;
}

/** A task-level failure from YouCam, carrying its machine-readable code (e.g. error_face_position_too_small). */
export class YouCamError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`YouCam ${path} returned non-JSON (${res.status})`);
  }
  if (!res.ok) {
    throw new YouCamError(json.error_code || `http_${res.status}`, `YouCam ${path} failed (${res.status}): ${json.error || text.slice(0, 200)}`);
  }
  return json as T;
}

/** Upload raw JPEG bytes for a feature and return the file_id. */
export async function uploadFile(feature: string, bytes: Buffer): Promise<string> {
  const r = await call("POST", `/s2s/v2.0/file/${feature}`, {
    files: [{ content_type: "image/jpeg", file_name: "upload.jpg", file_size: bytes.length }],
  });
  const f = r.data.files[0];
  const up = f.requests[0];
  const put = await fetch(up.url, { method: up.method, headers: up.headers, body: new Uint8Array(bytes) });
  if (!put.ok) throw new Error(`Upload to storage failed (${put.status})`);
  return f.file_id as string;
}

/** Start a task and poll until it finishes. Polling must continue or YouCam times the task out (units still spent). */
export async function runTask(feature: string, body: Record<string, unknown>, timeoutMs = 50_000): Promise<any> {
  const start = await call("POST", `/s2s/v2.0/task/${feature}`, body);
  const taskId = start.data.task_id as string;
  const t0 = Date.now();
  let wait = 1000;
  while (Date.now() - t0 < timeoutMs) {
    await new Promise((r) => setTimeout(r, wait));
    wait = Math.min(wait + 300, 2200);
    const d = (await call("GET", `/s2s/v2.0/task/${feature}/${taskId}`)).data;
    if (d.task_status === "success") return d.results;
    if (d.task_status === "error") throw new YouCamError(d.error || "unknown", d.error_message || d.error || "YouCam task failed");
  }
  throw new YouCamError("timeout", `YouCam ${feature} timed out`);
}

/** Download a (2-hour signed) result URL into a data URL so the browser never depends on expiring links. */
export async function toDataUrl(url: string): Promise<string> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Download failed (${r.status})`);
  const ct = r.headers.get("content-type") || "image/jpeg";
  return `data:${ct};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
}

// ---------- Hair diagnostics ----------

export async function hairType(front: Buffer, right: Buffer, left: Buffer) {
  const f = "hair-type-detection";
  const ids = await Promise.all([front, right, left].map((b) => uploadFile(f, b)));
  const r = await runTask(f, { src_file_ids: ids });
  return r.hair_type as { mapping: string; term: string };
}

export async function hairFrizz(front: Buffer, right: Buffer, left: Buffer) {
  const f = "hair-frizziness-detection";
  const ids = await Promise.all([front, right, left].map((b) => uploadFile(f, b)));
  const r = await runTask(f, { src_file_ids: ids });
  return r.hair_frizziness as { mapping: number; term: string };
}

export async function hairDensity(img: Buffer) {
  const f = "hair-density-detection";
  const r = await runTask(f, { src_file_id: await uploadFile(f, img) });
  return r.hair_density as { mapping: string; term: string };
}

export async function hairLength(img: Buffer) {
  const f = "hair-length-detection";
  const r = await runTask(f, { src_file_id: await uploadFile(f, img) });
  return r.hair_length as { term: string };
}

// ---------- Hair VTO (template based) ----------

export type VtoFeature = "hair-vol" | "hair-curl";

export async function hairVto(feature: VtoFeature, img: Buffer, templateId: string) {
  const r = await runTask(feature, { src_file_id: await uploadFile(feature, img), template_id: templateId });
  return r.url as string;
}
