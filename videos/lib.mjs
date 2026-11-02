// Shared recording helpers: headless Chrome at 1920×1080, CDP screencast with real frame timestamps,
// an on-screen cursor + click ripple, cinematic scrolling, and a scene clock synced to the voice-over timeline.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const ROOT = path.dirname(new URL(import.meta.url).pathname);
export const SITE = process.env.SITE || "https://strandlab-youcam.vercel.app";
export const FIX = path.resolve(ROOT, "../fixtures");
export const TL = JSON.parse(fs.readFileSync(path.join(ROOT, "script/timeline.json"), "utf8"));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const CURSOR_JS = `(() => {
  if (window.__cur) return;
  const mk = () => {
    if (!document.body || document.getElementById('__cur')) return;
    const c = document.createElement('div'); c.id='__cur';
    c.innerHTML = window.__touchMode ? '<div style="width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.5);border:2.5px solid rgba(31,42,42,.55);box-shadow:0 2px 10px rgba(0,0,0,.25)"></div>' : '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.3 3.9 7.4-2.9 1.5-3.9-7.4L4 19z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(c.style,{position:'fixed',left:'0',top:'0',zIndex:2147483647,pointerEvents:'none',transform:'translate(var(--x,-100px),var(--y,-100px))',transition:'transform .55s cubic-bezier(.4,.1,.2,1)',filter:'drop-shadow(0 2px 3px rgba(0,0,0,.35))'});
    document.body.appendChild(c);
    const st=document.createElement('style'); st.textContent='@keyframes __rip{from{transform:translate(-50%,-50%) scale(.2);opacity:.75}to{transform:translate(-50%,-50%) scale(1);opacity:0}}';
    document.head.appendChild(st);
    if (window.__curPos) { c.style.transition='none'; c.style.setProperty('--x',window.__curPos[0]+'px'); c.style.setProperty('--y',window.__curPos[1]+'px'); requestAnimationFrame(()=>c.style.transition='transform .55s cubic-bezier(.4,.1,.2,1)'); }
  };
  window.__cur = { mk,
    move(x,y,ms){ mk(); const c=document.getElementById('__cur'); if(ms!=null) c.style.transition='transform '+ms+'ms cubic-bezier(.4,.1,.2,1)'; c.style.setProperty('--x',x+'px'); c.style.setProperty('--y',y+'px'); window.__curPos=[x,y]; },
    ripple(x,y){ const r=document.createElement('div'); Object.assign(r.style,{position:'fixed',left:x+'px',top:y+'px',width:'64px',height:'64px',borderRadius:'50%',background:'rgba(31,122,108,.45)',zIndex:2147483646,pointerEvents:'none',animation:'__rip .6s ease-out forwards'}); document.body.appendChild(r); setTimeout(()=>r.remove(),700); },
    hide(){ const c=document.getElementById('__cur'); if(c) c.style.opacity='0'; } };
  document.addEventListener('DOMContentLoaded', mk); setInterval(() => { mk(); const c = document.getElementById('__cur'); if (c && document.body.lastElementChild !== c && [...document.body.children].some((e) => e.tagName === 'IFRAME' || (e.style && +e.style.zIndex > 1000 && e.id !== '__tick' && e.id !== '__cur' && !e.classList.contains('__call')))) document.body.appendChild(c); }, 200);
})();`;

export function scene(id) {
  const s = TL.scenes.find((x) => x.id === id);
  if (!s) throw new Error("no scene " + id);
  return s;
}

/** Launch Chrome. mobile: phone viewport (390×844 @3x). */
export async function launch({ mobile = false, camera = null, extraArgs = [] } = {}) {
  const args = ["--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none", "--autoplay-policy=no-user-gesture-required", ...extraArgs];
  if (camera) args.push("--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${camera}`);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args, defaultViewport: null, protocolTimeout: 240000 });
  const page = (await browser.pages())[0] || (await browser.newPage());
  if (mobile) {
    await page.setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36");
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => { window.__touchMode = true; });
  } else {
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 });
  }
  await page.evaluateOnNewDocument(CURSOR_JS);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  return { browser, page };
}

/** Restore a saved app state (sessionStorage + localStorage) before any page script runs. */
export async function restoreState(page, file = path.join(ROOT, "work/state.json")) {
  const st = JSON.parse(fs.readFileSync(file, "utf8"));
  await page.evaluateOnNewDocument((st) => {
    if (location.origin !== "https://strandlab-youcam.vercel.app" || sessionStorage.getItem("__restored")) return;
    for (const [k, v] of Object.entries(st.session || {})) sessionStorage.setItem(k, v);
    for (const [k, v] of Object.entries(st.local || {})) localStorage.setItem(k, v);
    sessionStorage.setItem("__restored", "1");
  }, st);
}

export async function saveState(page, file = path.join(ROOT, "work/state.json")) {
  const st = await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } }));
  delete st.session.__restored;
  fs.writeFileSync(file, JSON.stringify(st));
}

/** Screencast recorder. Frames keep their real timestamps → exact timing when encoded. */
export class Recorder {
  constructor(page, id) {
    this.page = page;
    this.id = id;
    this.dir = path.join(ROOT, "frames", id);
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(this.dir, { recursive: true });
    this.frames = [];
    this.speed = [];
    this.shift = 0;
  }
  /** Time-compress wall-clock [from,to] (scene seconds, before shift) into outLen seconds; later at() calls shift accordingly. */
  compress(from, to, outLen) {
    if (to - from <= outLen) return;
    this.speed.push({ from, to, factor: (to - from) / outLen });
    this.shift += to - from - outLen;
  }
  async start() {
    const vp = this.page.viewport();
    this.client = await this.page.createCDPSession();
    this.client.on("Page.screencastFrame", async (f) => {
      const n = this.frames.length;
      const file = path.join(this.dir, String(n).padStart(6, "0") + ".jpg");
      fs.writeFileSync(file, Buffer.from(f.data, "base64"));
      this.frames.push({ file, t: f.metadata.timestamp });
      this.client.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await this.client.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: Math.round(vp.width * vp.deviceScaleFactor), maxHeight: Math.round(vp.height * vp.deviceScaleFactor), everyNthFrame: 1 });
    // A tiny always-on animation forces a steady stream of frames even when the page is still.
    await this.page.evaluate(() => {
      if (document.getElementById("__tick")) return;
      const d = document.createElement("div"); d.id = "__tick";
      Object.assign(d.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", opacity: "0.01", zIndex: 2147483647, pointerEvents: "none" });
      document.body.appendChild(d);
      let i = 0; setInterval(() => (d.style.background = i++ % 2 ? "#000" : "#fff"), 33);
    }).catch(() => {});
    await sleep(300);
    this.t0 = Date.now();
    this.ts0 = null;
  }
  /** Mark the scene clock origin (t = 0 of the voice-over for this scene). */
  mark() {
    this.markWall = Date.now();
    this.markIndex = this.frames.length;
  }
  now() {
    return (Date.now() - this.markWall) / 1000;
  }
  async at(sec) {
    const wait = (sec + this.shift) * 1000 - (Date.now() - this.markWall);
    if (wait > 0) await sleep(wait);
  }
  async stop() {
    await this.client.send("Page.stopScreencast").catch(() => {});
    await sleep(200);
  }
  /**
   * Encode frames after mark() into clips/<id>.mp4 at exactly `duration` seconds (CFR 30).
   * `speed` segments: [{from, to, factor}] in wall-clock seconds after mark → time-compressed (for waits).
   */
  encode(duration, { speed = this.speed } = {}) {
    const fr = this.frames;
    const markTs = this.tsAtWall(this.markWall);
    let list = fr.filter((f) => f.t >= markTs - 0.05);
    if (!list.length) list = fr.slice(-1);
    // Map wall time → output time with optional speed-ups.
    const map = (t) => {
      let out = 0, cur = 0;
      const segs = [...speed].sort((a, b) => a.from - b.from);
      for (const s of segs) {
        if (t <= s.from) break;
        out += s.from - cur;
        const end = Math.min(t, s.to);
        out += (end - s.from) / s.factor;
        cur = s.to;
        if (t <= s.to) return out;
      }
      return out + (t - cur);
    };
    const pts = list.map((f) => ({ file: f.file, o: Math.max(0, map(f.t - markTs)) }));
    let txt = "ffconcat version 1.0\n";
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].o >= duration) break;
      const next = i + 1 < pts.length ? Math.min(pts[i + 1].o, duration) : duration;
      const d = Math.max(0.001, next - pts[i].o);
      txt += `file '${pts[i].file}'\nduration ${d.toFixed(4)}\n`;
      if (i === pts.length - 1 || pts[i + 1].o >= duration) { txt += `file '${pts[i].file}'\n`; break; }
    }
    const lst = path.join(this.dir, "list.txt");
    fs.writeFileSync(lst, txt);
    const out = path.join(ROOT, "clips", this.id + ".mp4");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const vp = this.page.viewport();
    const W = Math.round(vp.width * vp.deviceScaleFactor), H = Math.round(vp.height * vp.deviceScaleFactor);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
      "-vf", `scale=${W}:${H}:flags=lanczos,fps=30,format=yuv420p`, "-t", duration.toFixed(3),
      "-c:v", "libx264", "-preset", "medium", "-crf", "16", out]);
    const real = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim();
    console.log(`encoded ${this.id}: ${pts.length} frames → ${real}s (target ${duration}s)`);
    return out;
  }
  tsAtWall(wall) {
    // Screencast timestamps are seconds (epoch). Use them directly against wall clock.
    return wall / 1000;
  }
}

// ---------- interaction helpers ----------
async function boxOf(page, target) {
  const el = typeof target === "string" ? await findEl(page, target) : target;
  if (!el) throw new Error("not found: " + target);
  await el.evaluate((e) => e.scrollIntoView({ block: "nearest", inline: "nearest" }));
  const b = await el.boundingBox();
  if (!b) throw new Error("no box: " + target);
  return { el, x: b.x + b.width / 2, y: b.y + b.height / 2, b };
}

/** Find by CSS selector, or "text=..." (button/link/label containing text), or "aria=...". */
export async function findEl(page, q, { timeout = 3000 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const h = await page.evaluateHandle((q) => {
      const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
      const norm = (x) => x.replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
      if (q.startsWith("text=")) {
        const t = norm(q.slice(5));
        const els = [...document.querySelectorAll("button,a,label,[role=tab],[role=button],summary")].filter(vis);
        const hit = els.find((e) => norm(e.textContent) === t) || els.find((e) => norm(e.textContent).includes(t));
        if (hit) return hit;
        const all = [...document.querySelectorAll("body *:not(script):not(style)")].filter((e) => e.id !== "__cur" && vis(e));
        const any = all.filter((e) => norm(e.textContent).startsWith(t));
        const inc = any.length ? any : all.filter((e) => norm(e.textContent).includes(t));
        return inc.sort((a, b) => a.textContent.length - b.textContent.length)[0] || null;
      }
      if (q.startsWith("aria=")) return [...document.querySelectorAll(`[aria-label="${q.slice(5)}"]`)].find(vis) || null;
      return [...document.querySelectorAll(q)].find(vis) || null;
    }, q);
    const el = h.asElement();
    if (el) return el;
    await sleep(150);
  }
  return null;
}

export async function moveTo(page, target, ms = 600) {
  const { x, y, el } = await boxOf(page, target);
  await page.evaluate((x, y, ms) => window.__cur && window.__cur.move(x, y, ms), x, y, ms);
  await sleep(ms + 60);
  return { x, y, el };
}

export async function click(page, target, { ms = 600, pause = 120 } = {}) {
  const { x, y, el } = await moveTo(page, target, ms);
  await page.evaluate((x, y) => window.__cur && window.__cur.ripple(x, y), x, y);
  await sleep(pause);
  await el.evaluate((e) => { if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) e.focus(); e.click(); });
  return el;
}

export async function typeInto(page, target, text, { delay = 70 } = {}) {
  const el = await click(page, target);
  await el.focus();
  await page.keyboard.type(text, { delay });
  return el;
}

/** Smooth eased scroll (window or a selector) to an absolute y, or element top with offset. */
export async function scrollTo(page, to, ms = 1200, offset = 90) {
  await page.evaluate(async (to, ms, offset) => {
    let y = to;
    if (typeof to === "string") {
      const vis = (e) => e.getBoundingClientRect().height > 0;
      let el = null;
      if (to.startsWith("text=")) {
        const t = to.slice(5).toLowerCase();
        const all = [...document.querySelectorAll("h1,h2,h3,h4,p,span,div,button,a,li")].filter(vis);
        el = all.filter((e) => e.textContent.trim().toLowerCase().startsWith(t)).sort((a, b) => a.textContent.length - b.textContent.length)[0];
      } else el = document.querySelector(to);
      if (!el) return;
      y = el.getBoundingClientRect().top + scrollY - offset;
    }
    y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
    const y0 = scrollY, t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    document.documentElement.style.scrollBehavior = "auto";
    await new Promise((res) => {
      const step = (now) => { const p = Math.min(1, (now - t0) / ms); scrollTo(0, y0 + (y - y0) * ease(p)); p < 1 ? requestAnimationFrame(step) : res(); };
      requestAnimationFrame(step);
    });
  }, to, ms, offset);
}

export async function hideCursor(page) {
  await page.evaluate(() => window.__cur && window.__cur.hide());
}

export async function parkCursor(page, x = 1300, y = 760) {
  await page.evaluate((x, y) => window.__cur && window.__cur.move(x, y, 0), x, y);
}

/** Inject an animated overlay (callout / lower-third) into the page. pos: CSS for position. */
export async function callout(page, id, html, pos, extra = "") {
  await page.evaluate((id, html, pos, extra) => {
    document.getElementById(id)?.remove();
    if (!document.getElementById("__callcss")) {
      const st = document.createElement("style"); st.id = "__callcss";
      st.textContent = `.__call{position:fixed;z-index:2147483600;font-family:Inter,system-ui,sans-serif;opacity:0;transform:translateY(10px) scale(.98);transition:opacity .45s,transform .55s cubic-bezier(.2,.8,.2,1);pointer-events:none}
      .__call.on{opacity:1;transform:none}
      .__card{background:#1F2A2A;color:#F6F3EE;border-radius:18px;padding:16px 18px;box-shadow:0 18px 50px rgba(0,0,0,.28)}
      .__eb{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#E0A33A;font-weight:600}
      .__chip{display:flex;align-items:center;gap:10px;margin-top:10px;padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.07);font-size:15px;font-weight:500;opacity:0;transform:translateX(-8px);transition:all .4s cubic-bezier(.2,.8,.2,1)}
      .__chip.on{opacity:1;transform:none}
      .__dot{width:9px;height:9px;border-radius:50%;background:#9FD3C7;box-shadow:0 0 0 4px rgba(159,211,199,.18)}
      .__code{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12.5px;line-height:1.55;color:#CFE7E1;white-space:pre;margin-top:8px}`;
      document.head.appendChild(st);
    }
    const d = document.createElement("div"); d.id = id; d.className = "__call"; d.style.cssText = pos + ";" + extra; d.innerHTML = html;
    document.body.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("on")));
  }, id, html, pos, extra);
}
export async function calloutStep(page, sel) {
  await page.evaluate((sel) => document.querySelector(sel)?.classList.add("on"), sel);
}
export async function calloutOff(page, id) {
  await page.evaluate((id) => { const d = document.getElementById(id); if (d) { d.classList.remove("on"); setTimeout(() => d.remove(), 600); } }, id);
}

/** Hover-only: never stalls the timeline if the target is missing. */
export async function hover(page, target, ms = 550) {
  try {
    const el = typeof target === "string" ? await findEl(page, target, { timeout: 800 }) : target;
    if (el) return await moveTo(page, el, ms);
  } catch {}
  console.log("  (hover miss)", typeof target === "string" ? target : "[el]");
}
