// Subtitles from the sentence-level timeline: splits each sentence into readable chunks (timed by
// character share of the sentence's real audio duration), renders each chunk as a transparent PNG in
// the brand font, writes captions/strandlab.srt, and builds a transparent caption track (captions/track.mov).
// Timing uses the same frame-rounded scene offsets as assemble.py, so subtitles stay in sync.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, "script/timeline.json"), "utf8"));
const FPS = 30;
const OUT = path.join(ROOT, "captions");
fs.rmSync(path.join(OUT, "png"), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "png"), { recursive: true });
const PHONE = new Set(["s10_pwa", "s11_access"]); // captions sit under the text column, clear of the phone
const MAX = 58;

function chunks(text) {
  const URL_RE = /strandlab-youcam\.vercel\.app/g;
  if (URL_RE.test(text)) return chunksRaw(text.replace(URL_RE, "§URL§")).map((c) => c.replace("§URL§", "strandlab-youcam.vercel.app"));
  return chunksRaw(text);
}
function chunksRaw(text) {
  if (text.length <= MAX) return [text];
  // pieces: sentences, then clauses, then words — each ≤ MAX
  const pieces = [];
  for (const sen of text.match(/[^.?!]+[.?!]+["”]?\s*|[^.?!]+$/g) || [text]) {
    if (sen.trim().length <= MAX) { pieces.push({ t: sen.trim(), end: /[.?!]["”]?$/.test(sen.trim()) }); continue; }
    for (const cl of sen.match(/[^,;:]+[,;:]?\s*/g) || [sen]) {
      let c = cl.trim();
      while (c.length > MAX) {
        const w = c.split(" "); let a = "";
        while (w.length && (a + " " + w[0]).trim().length <= MAX) a = (a + " " + w.shift()).trim();
        pieces.push({ t: a, end: false }); c = w.join(" ");
      }
      if (c) pieces.push({ t: c, end: /[.?!]["”]?$/.test(c) });
    }
  }
  const out = [];
  let cur = null;
  for (const p of pieces) {
    if (cur && (cur.t + " " + p.t).length <= MAX && !(cur.end && cur.t.length >= 26)) cur = { t: cur.t + " " + p.t, end: p.end };
    else { if (cur) out.push(cur.t); cur = { ...p }; }
  }
  if (cur) out.push(cur.t);
  return out;
}


// Pauses (≥70 ms of near-silence) inside a sentence's own audio, in seconds from its start.
function pauses(file) {
  const b = fs.readFileSync(file);
  let off = 12, data = null, sr = 48000;
  while (off < b.length) { const id = b.toString("ascii", off, off + 4), sz = b.readUInt32LE(off + 4); if (id === "fmt ") sr = b.readUInt32LE(off + 12); if (id === "data") { data = b.subarray(off + 8, off + 8 + sz); break; } off += 8 + sz; }
  const hop = Math.round(sr * 0.01), n = Math.floor(data.length / 2 / hop), quiet = [];
  for (let i = 0; i < n; i++) { let e = 0; for (let j = 0; j < hop; j++) { const v = data.readInt16LE((i * hop + j) * 2); e += v * v; } quiet.push(Math.sqrt(e / hop) < 350); }
  const out = []; let st = -1;
  quiet.forEach((q, i) => { if (q && st < 0) st = i; if ((!q || i === n - 1) && st >= 0) { if (i - st >= 7) out.push((st + i) / 2 / 100); st = -1; } });
  return out;
}

const cues = [];
let off = 0;
for (const sc of TL.scenes) {
  const frames = Math.round(sc.duration * FPS);
  sc.lines.forEach((ln, li) => {
    const cs = chunks(ln.cap);
    const total = cs.reduce((a, c) => a + c.length, 0);
    const dur = ln.end - ln.start;
    const ps = pauses(path.join(ROOT, "audio", `${sc.id}_${li}.wav`));
    // boundaries: character-proportional estimate, snapped to the nearest real pause (±0.7 s)
    const bounds = [0];
    let acc = 0;
    for (let i = 0; i < cs.length - 1; i++) {
      acc += cs[i].length;
      const est = (dur * acc) / total;
      const near = ps.filter((p) => Math.abs(p - est) < 0.7 && p > bounds[bounds.length - 1] + 0.3).sort((a, b) => Math.abs(a - est) - Math.abs(b - est))[0];
      bounds.push(near ?? est);
    }
    bounds.push(dur);
    cs.forEach((c, i) => cues.push({ text: c, start: off + ln.start + bounds[i], end: off + ln.start + bounds[i + 1] + (i === cs.length - 1 ? 0.18 : 0), phone: PHONE.has(sc.id) }));
  });
  off += frames / FPS;
}
// avoid overlaps
for (let i = 0; i + 1 < cues.length; i++) cues[i].end = Math.min(cues[i].end, cues[i + 1].start - 0.02);

const fmt = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(r).padStart(3, "0")}`;
};
fs.writeFileSync(path.join(OUT, "strandlab.srt"), cues.map((c, i) => `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`).join("\n"));

// Render PNGs (1920×1080, transparent) in Chrome with the brand font.
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600&display=block" rel="stylesheet">
<style>html,body{margin:0;width:1920px;height:1080px;background:transparent;overflow:hidden}
#c{position:absolute;bottom:54px;transform:translateX(-50%);width:max-content;max-width:1480px;box-sizing:border-box;text-align:center;font:600 40px/1.32 Inter,system-ui,sans-serif;color:#fff;
background:rgba(16,24,24,.80);padding:12px 26px 14px;border-radius:16px;letter-spacing:-.005em;box-shadow:0 6px 24px rgba(0,0,0,.25)}
#c.phone{max-width:1000px}</style></head><body><div id="c"></div></body></html>`, { waitUntil: "networkidle0" });
await page.evaluate(async () => { await document.fonts.load('600 40px Inter'); document.getElementById('c').textContent = 'Warm up Inter'; await document.fonts.ready; });
await sleep(300);
const blank = path.join(OUT, "png", "blank.png");
await page.evaluate(() => (document.getElementById("c").style.display = "none"));
await page.screenshot({ path: blank, omitBackground: true });
await page.evaluate(() => (document.getElementById("c").style.display = ""));
for (let i = 0; i < cues.length; i++) {
  await page.evaluate((t, phone) => {
    const c = document.getElementById("c");
    c.textContent = t;
    c.className = phone ? "phone" : "";
    c.style.left = phone ? "640px" : "960px";
  }, cues[i].text, cues[i].phone);
  cues[i].png = path.join(OUT, "png", `c${String(i).padStart(3, "0")}.png`);
  await page.screenshot({ path: cues[i].png, omitBackground: true });
}
await browser.close();

// Transparent caption track via the concat demuxer (blank PNG between cues).
const total = off;
let list = "ffconcat version 1.0\n", t = 0;
for (const c of cues) {
  if (c.start > t + 0.001) { list += `file '${blank}'\nduration ${(c.start - t).toFixed(3)}\n`; t = c.start; }
  list += `file '${c.png}'\nduration ${(c.end - c.start).toFixed(3)}\n`; t = c.end;
}
list += `file '${blank}'\nduration ${Math.max(0.04, total - t).toFixed(3)}\nfile '${blank}'\n`;
fs.writeFileSync(path.join(OUT, "list.txt"), list);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", path.join(OUT, "list.txt"),
  "-vf", `fps=${FPS},format=rgba`, "-t", total.toFixed(3), "-c:v", "qtrle", path.join(OUT, "track.mov")]);
console.log(`${cues.length} captions, track ${total.toFixed(2)}s → captions/track.mov, captions/strandlab.srt`);
