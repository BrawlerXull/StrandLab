// Scene drivers. Each records one clip in clips/<id>.mp4, exactly as long as its voice-over.
// usage: node scenes.mjs s01_hook s05_results ...   (no args = all)
import { launch, scene, Recorder, SITE, FIX, ROOT, sleep, click, moveTo, scrollTo, findEl, restoreState, saveState, hover, parkCursor, hideCursor, typeInto, callout, calloutStep, calloutOff } from "./lib.mjs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const S = {};
const L = (sc) => sc.lines.map((l) => l.start);

async function card(id, file) {
  const sc = scene(id);
  const { browser, page } = await launch();
  await page.goto("file://" + path.join(ROOT, "cards", file), { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await sleep(500);
  const rec = new Recorder(page, id);
  await rec.start();
  rec.mark();
  await page.evaluate((L) => window.go(L), L(sc));
  await rec.at(sc.duration + 0.2);
  await rec.stop();
  rec.encode(sc.duration);
  await browser.close();
}
S.s01_hook = () => card("s01_hook", "hook.html");
S.s12_close = () => card("s12_close", "close.html");

// ---------- s02: home page ----------
S.s02_intro = async () => {
  const sc = scene("s02_intro"), [l0] = L(sc);
  const { browser, page } = await launch();
  await page.goto(SITE + "/", { waitUntil: "networkidle2" });
  await page.evaluate(() => document.fonts.ready); await sleep(800);
  await parkCursor(page, 900, 560);
  const rec = new Recorder(page, "s02_intro"); await rec.start(); rec.mark();
  await rec.at(l0 + 1.4); await moveTo(page, "text=Start free scan", 900);
  await rec.at(l0 + 3.2); await scrollTo(page, 330, 3200);
  await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration); await browser.close();
};

// ---------- s03 → s05: the real scan, one continuous session ----------
S.s03_scan = async () => {
  const { browser, page } = await launch({ camera: path.join(ROOT, "work/cam.y4m") });
  // s03 — four photos + guided camera + auto-framing
  {
    const sc = scene("s03_scan"), [l0, l1, l2] = L(sc);
    await page.goto(SITE + "/scan", { waitUntil: "networkidle2" });
    await page.evaluate(() => document.fonts.ready); await sleep(800);
    await parkCursor(page, 640, 650);
    const rec = new Recorder(page, "s03_scan"); await rec.start(); rec.mark();
    const tiles = ["Front", "Turn right", "Turn left", "Tip forward"];
    for (let i = 0; i < 4; i++) { await rec.at(l0 + 0.5 + i * 1.15); await moveTo(page, `text=${tiles[i]}`, 550).catch(() => {}); }
    await rec.at(l1 + 0.1); await click(page, "aria=Take Front photo with camera", { ms: 500 });
    await rec.at(l2 - 0.3); await click(page, "text=Cancel", { ms: 450 });
    await rec.at(l2 + 0.5);
    const [chooser] = await Promise.all([page.waitForFileChooser({ timeout: 8000 }), click(page, "aria=Upload Turn right photo", { ms: 500 })]);
    await chooser.accept([FIX + "/curly_right.jpg", FIX + "/curly_left.jpg", FIX + "/curly_bow.jpg"]);
    await rec.at(sc.duration - 1.5); await moveTo(page, "text=Analyse my hair", 700);
    await rec.at(sc.duration - 0.35); await click(page, "text=Analyse my hair", { ms: 150, pause: 60 });
    await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration);
  }
  // s04 — details: 4 APIs in parallel, porosity quiz, dew point
  {
    const sc = scene("s04_details"), [l0, l1, l2] = L(sc);
    await page.waitForFunction(() => location.pathname === "/scan/details", { timeout: 20000 });
    await sleep(250);
    const rec = new Recorder(page, "s04_details"); await rec.start(); rec.mark();
    const r = await page.evaluate(() => { const h = [...document.querySelectorAll("p,h2,h3,span")].find((e) => /Measuring your hair/.test(e.textContent) && e.children.length === 0); const c = h?.closest("div.card,section,div[class*=rounded]") || h?.parentElement?.parentElement; const b = c.getBoundingClientRect(); return { x: b.right, y: b.top, h: b.height }; });
    const apis = ["Hair Type Detection", "Hair Frizziness Detection", "Hair Density Detection", "Hair Length Detection"];
    await callout(page, "apis", `<div class="__card" style="width:330px"><div class="__eb">YouCam API · running in parallel</div>${apis.map((a, i) => `<div class="__chip" id="api${i}"><span class="__dot"></span>${a}</div>`).join("")}</div>`, `left:${Math.round(r.x + 28)}px;top:${Math.round(r.y - 6)}px`);
    await hover(page, "text=Curl pattern & frizz", 700);
    const when = [1.55, 2.6, 3.75, 4.8];
    for (let i = 0; i < 4; i++) { await rec.at(l0 + when[i]); await calloutStep(page, "#api" + i); }
    await rec.at(l1 - 0.6); await calloutOff(page, "apis");
    await scrollTo(page, "text=1. Porosity check", 900, 80);
    const ans = ["Soaks in after a moment", "About an hour or two", "Absorb fine", "Some, occasionally"];
    for (let i = 0; i < 4; i++) { await rec.at(l1 + 0.5 + i * 0.8); await click(page, "text=" + ans[i], { ms: 420, pause: 80 }); }
    await rec.at(l2 + 0.1); await click(page, "#city", { ms: 500 });
    await page.keyboard.type("Mumbai", { delay: 55 });
    await rec.at(l2 + 1.0); await click(page, "text=Go", { ms: 350 });
    await page.waitForFunction(() => /Mumbai, IN/.test(document.body.innerText), { timeout: 15000 });
    await sleep(500);
    await hover(page, "text=Mumbai, IN", 600);
    await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration);
  }
  // wait (unrecorded) for the analysis, then open results
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /See my results/.test(b.textContent) && !b.disabled), { timeout: 150000 });
  await click(page, "text=See my results", { ms: 200 });
  await page.waitForFunction(() => location.pathname === "/results" && /What we measured/.test(document.body.innerText), { timeout: 150000 });
  await page.evaluate(() => scrollTo(0, 0)); await sleep(1500);
  await saveState(page);
  await browser.close();
};
S.s04_details = async () => console.log("(recorded as part of s03_scan)");

S.s05_results = async () => {
  const { browser, page } = await launch();
  await restoreState(page);
  await page.goto(SITE + "/results", { waitUntil: "networkidle2" });
  await page.waitForFunction(() => /What we measured/.test(document.body.innerText), { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready); await sleep(1200);

    const sc = scene("s05_results"), [l0, l1, l2] = L(sc);
    await parkCursor(page, 1000, 600);
    const rec = new Recorder(page, "s05_results"); await rec.start(); rec.mark();
    await rec.at(l0 + 0.2); await scrollTo(page, "text=What we measured", 1500, 150);
    await hover(page, "text=3B TO 3C", 600);
    await rec.at(l0 + 2.6); await hover(page, "text=2.8 of 3", 600);
    await rec.at(l0 + 3.9); await hover(page, "text=Mumbai, IN", 700);
    await rec.at(l1 - 0.2); await scrollTo(page, "text=Your 3 key takeaways", 1300, 150);
    await rec.at(l1 + 1.0); await hover(page, "text=Use rich products", 500);
    await rec.at(l1 + 2.0); await hover(page, "text=Film-formers / hold", 500);
    await rec.at(l1 + 3.0); await scrollTo(page, "text=Your routine this week", 900, 150);
    await hover(page, "text=Glycerin-free styler", 500);
    await rec.at(l1 + 5.2); await scrollTo(page, "text=Your 3 key takeaways", 800, 150);
    await hover(page, "text=Your hair can carry", 500);
    await rec.at(l2 - 0.1); await scrollTo(page, "text=How we measured this", 1600, 150);
    await rec.at(l2 + 2.0); await hover(page, "text=Hair Type Detection", 600);
    await rec.at(l2 + 3.0); await hover(page, "text=head crop", 600);
    await rec.at(l2 + 4.2); await hover(page, "text=Hair Density Detection", 600);
    await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration);
    await browser.close();
};


async function resultsPage({ lang } = {}) {
  const { browser, page } = await launch();
  await restoreState(page);
  if (lang) await page.evaluateOnNewDocument((l) => localStorage.setItem("sl-coach-lang", l), lang);
  await page.goto(SITE + "/results", { waitUntil: "networkidle2" });
  await page.waitForFunction(() => /What we measured/.test(document.body.innerText), { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready); await sleep(1000);
  return { browser, page };
}

// ---------- s06: coach, in Hindi ----------
S.s06_coach = async () => {
  const sc = scene("s06_coach"), [l0, l1] = L(sc);
  const { browser, page } = await resultsPage({ lang: "hi" });
  await click(page, "text=Ingredients", { ms: 0 }); await sleep(1200);
  await parkCursor(page, 900, 420);
  const rec = new Recorder(page, "s06_coach"); await rec.start(); rec.mark();
  await rec.at(l0 + 0.2); await click(page, "text=Explain this section", { ms: 650 });
  const tClick = rec.now();
  await page.waitForFunction(() => /Listen/.test(document.querySelector("[aria-labelledby=coach-title]")?.innerText || ""), { timeout: 90000 });
  const tAns = rec.now();
  rec.compress(tClick + 1.0, tAns - 0.15, 0.9);
  await sleep(300);
  await hover(page, "select", 500);
  await rec.at(l0 + 3.6); await hover(page, "text=Listen", 600);
  await rec.at(l1 + 0.2); await hover(page, "aria=Ask by voice", 600);
  await rec.at(l1 + 1.6); await click(page, "text=Listen", { ms: 600 }).catch(() => {});
  await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration); await browser.close();
};

// ---------- s07: products + label photo ----------
S.s07_shop = async () => {
  const sc = scene("s07_shop"), [l0, l1] = L(sc);
  const { browser, page } = await resultsPage();
  await page.addStyleTag({ content: '[aria-label="Open the StrandLab hair coach"]{display:none!important}' });
  await click(page, "text=Products", { ms: 0 }); await sleep(1200);
  await scrollTo(page, "text=Products matched to you", 10, 150); await sleep(300);
  await parkCursor(page, 900, 300);
  const rec = new Recorder(page, "s07_shop"); await rec.start(); rec.mark();
  await rec.at(l0 + 0.3); await hover(page, "text=Low-Lather Curl Cleanser", 600);
  await rec.at(l0 + 1.3); await hover(page, "text=Butter-Rich Conditioner", 500);
  await rec.at(l0 + 2.2); await scrollTo(page, "text=Shop real shampoo like this", 1100, 260);
  await rec.at(l0 + 3.5); await hover(page, "text=Amazon.in", 500);
  await rec.at(l0 + 4.3); await hover(page, "text=Google Shopping", 400);
  await rec.at(l1 - 0.2); await scrollTo(page, "text=Already own one?", 900, 120);
  const [chooser] = await Promise.all([page.waitForFileChooser({ timeout: 15000 }), click(page, "text=Scan a label with your camera", { ms: 500 })]);
  await chooser.accept([path.join(ROOT, "work/label.jpg")]);
  const t1 = rec.now();
  await page.waitForFunction(() => { const c = document.getElementById("label-photo")?.closest(".card"); const t = c?.innerText || ""; return /(Good fit|Okay, with caveats|Skip it)\s*·\s*\d+%/.test(t) && !/Reading the ingredients/.test(t); }, { timeout: 90000 });
  const t2 = rec.now();
  rec.compress(t1 + 1.0, t2 - 0.1, 1.0);
  await sleep(150);
  await scrollTo(page, "text=Read from your photo", 800, 175);
  await hover(page, "text=Good fit", 500);
  await rec.at(l1 + 4.6); await page.evaluate(() => { const r = [...document.querySelectorAll("#label-photo ~ * span, .card span")].find((e) => /Good fit|Okay, with caveats|Skip it/.test(e.textContent))?.getBoundingClientRect(); if (r) window.__cur.move(r.right + 160, r.bottom + 70, 700); });
  await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration);
  await page.screenshot({ path: path.join(ROOT, "work/shots/s07_end.png") });
  await browser.close();
};

// ---------- s08: YouCam Hair Volume try-on (Maya sample = same photos) ----------
S.s08_preview = async () => {
  const sc = scene("s08_preview"), [l0] = L(sc);
  const { browser, page } = await launch();
  await page.goto(SITE + "/samples/maya", { waitUntil: "networkidle2" });
  await click(page, "text=Preview", { ms: 0 }); await sleep(2500);
  await scrollTo(page, "text=Preview", 10, 30).catch(() => {});
  await page.screenshot({ path: path.join(ROOT, "work/shots/s08_prep.png") });
  await parkCursor(page, 700, 300);
  const rec = new Recorder(page, "s08_preview"); await rec.start(); rec.mark();
  await rec.at(l0 + 0.4); await scrollTo(page, "text=Better clumping", 1300, 135);
  await rec.at(l0 + 1.9); await hover(page, "text=Today", 500);
  await rec.at(l0 + 3.0); await hover(page, "text=Realistic: Fuller", 600);
  await rec.at(l0 + 4.7); await hover(page, "text=The ad promise", 600);
  await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration); await browser.close();
};

// ---------- s09: the store widget ----------
S.s09_store = async () => {
  const sc = scene("s09_store"), [l0, l1, l2] = L(sc);
  const { browser, page } = await launch();
  await page.goto(SITE + "/store-demo", { waitUntil: "networkidle2" });
  await page.evaluate(() => document.fonts.ready); await sleep(1500);
  await parkCursor(page, 700, 640);
  const btn = await page.$("[data-strandlab] >>> button");
  const bb = await btn.boundingBox();
  const rec = new Recorder(page, "s09_store"); await rec.start(); rec.mark();
  await rec.at(l0 + 1.6);
  await callout(page, "code", `<div class="__card" style="width:max-content"><div class="__eb">The whole integration</div><div class="__code">&lt;script src="…/widget.js"&gt;&lt;/script&gt;
&lt;div data-strandlab data-product="Curl Gel"&gt;&lt;/div&gt;</div></div>`, `left:${Math.round(bb.x - 10)}px;top:${Math.round(bb.y + bb.height + 14)}px`);
  await rec.at(l0 + 3.2); await moveTo(page, btn, 700);
  await rec.at(l1 - 0.3); await calloutOff(page, "code");
  await rec.at(l1 + 0.6); await click(page, btn, { ms: 300 });
  await sleep(1200);
  const fr = page.frames().find((f) => /\/widget/.test(f.url()));
  await rec.at(l1 + 2.2); await click(page, await findEl(fr, "text=Maya", { timeout: 8000 }), { ms: 550 });
  await rec.at(l1 + 4.3); await click(page, await findEl(fr, "text=Done", { timeout: 8000 }), { ms: 550 });
  await rec.at(l1 + 5.0); await scrollTo(page, "text=You may also like", 1200, 20);
  await hover(page, "text=Shea Whip Curl Cream", 500);
  await rec.at(l2 - 0.2); await scrollTo(page, 0, 1000);
  await hover(page, "text=What this store receives", 600);
  await rec.at(l2 + 1.6); await hover(page, "text=strandlab:score", 500);
  await rec.at(l2 + 3.0); await hover(page, "text=No photos are ever sent", 600);
  await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration); await browser.close();
};

// ---------- phone scenes: mobile recording composited into a phone frame beside synced bullets ----------
async function phoneBg(id, v, times) {
  const sc = scene(id);
  const { browser, page } = await launch();
  await page.goto("file://" + path.join(ROOT, "cards", "phonebg.html") + "?v=" + v, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready); await sleep(400);
  const rec = new Recorder(page, id + "_bg"); await rec.start(); rec.mark();
  await page.evaluate((T) => window.go(T), times);
  await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration); await browser.close();
}
function composite(id) {
  const sc = scene(id);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path.join(ROOT, "clips", id + "_bg.mp4"), "-i", path.join(ROOT, "clips", id + "_phone.mp4"), "-i", path.join(ROOT, "cards", "bezel.png"),
    "-filter_complex", "[1:v]scale=404:874:flags=lanczos[p];[0:v][p]overlay=1230:103[a];[a][2:v]overlay=0:0,format=yuv420p[v]", "-map", "[v]",
    "-t", sc.duration.toFixed(3), "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "16", path.join(ROOT, "clips", id + ".mp4")]);
  console.log("composited", id);
}
const tap = (page, t, o = {}) => click(page, t, { ms: 380, pause: 140, ...o });

S.s10_pwa = async () => {
  const id = "s10_pwa", sc = scene(id), [l0, l1] = L(sc);
  await phoneBg(id, "pwa", [l0 + 1.0, l0 + 3.7, l1 + 0.2, l1 + 2.3, l1 + 4.3]);
  const { browser, page } = await launch({ mobile: true, camera: path.join(ROOT, "work/cam.y4m") });
  await page.goto(SITE + "/", { waitUntil: "networkidle2" });
  await page.evaluate(() => document.fonts.ready); await sleep(1500);
  await parkCursor(page, 300, 600);
  const rec = new Recorder(page, id + "_phone"); await rec.start(); rec.mark();
  await rec.at(l0 + 0.3); await tap(page, "aria=Menu");
  await rec.at(l0 + 1.3); const inst = await findEl(page, "text=Install StrandLab app", { timeout: 800 });
  if (inst) await tap(page, inst);
  await rec.at(l0 + 2.0);
  await page.goto("file://" + path.join(ROOT, "cards", "homescreen.html"), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await parkCursor(page, 330, 760);
  await rec.at(l0 + 2.3); await page.evaluate(() => window.addIcon());
  await rec.at(l0 + 3.3); await tap(page, "#sl .ic");
  await page.evaluate(() => window.launch());
  await rec.at(l0 + 4.1);
  await page.goto(SITE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /Measure it/.test(document.body.innerText), { timeout: 15000 });
  await parkCursor(page, 200, 900);
  await rec.at(l0 + 4.9); await scrollTo(page, 180, 1500);
  await rec.at(l1 + 0.1); await scrollTo(page, 0, 500);
  await tap(page, "text=Start free scan →");
  await page.waitForFunction(() => location.pathname === "/scan", { timeout: 15000 });
  await sleep(500);
  await rec.at(l1 + 1.6); await tap(page, "aria=Take Front photo with camera");
  await rec.at(l1 + 4.2);
  await page.setOfflineMode(true);
  try {
    await page.goto(SITE + "/learn", { waitUntil: "domcontentloaded", timeout: 6000 });
    const txt = await page.evaluate(() => document.body.innerText);
    console.log("  offline page:", txt.slice(0, 80).replace(/\n/g, " "));
    if (!/offline/i.test(txt)) throw new Error("not offline page");
  } catch (e) {
    console.log("  SW offline fallback not served (" + e.message + "); showing /offline");
    await page.setOfflineMode(false);
    await page.goto(SITE + "/offline", { waitUntil: "networkidle2" });
  }
  await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration); await browser.close();
  composite(id);
};

S.s11_access = async () => {
  const id = "s11_access", sc = scene(id), [l0, l1] = L(sc);
  await phoneBg(id, "access", [l0 + 0.2, l1 + 0.7, l1 + 1.9, l1 + 3.3, l1 + 5.0]);
  const { browser, page } = await launch({ mobile: true });
  await restoreState(page);
  await page.goto(SITE + "/quick", { waitUntil: "networkidle2" });
  await page.evaluate(() => document.fonts.ready); await sleep(1200);
  await parkCursor(page, 300, 650);
  const rec = new Recorder(page, id + "_phone"); await rec.start(); rec.mark();
  await rec.at(l0 + 0.3); await scrollTo(page, "text=1. Which looks most like", 700, 70);
  await rec.at(l0 + 1.1); await tap(page, "text=Tight curls");
  await rec.at(l0 + 1.9); await scrollTo(page, "text=2. How frizzy", 600, 70);
  await rec.at(l0 + 2.6); await tap(page, "text=A little");
  await rec.at(l0 + 3.3); await tap(page, "text=Barely");
  await rec.at(l0 + 4.0); await tap(page, "text=Past shoulders");
  await rec.at(l0 + 4.8); await tap(page, "text=Next: porosity");
  await rec.at(l1 + 0.1); await tap(page, "aria=Menu");
  await rec.at(l1 + 0.9); await tap(page, "text=Larger");
  await rec.at(l1 + 2.0); await tap(page, "text=High contrast");
  await rec.at(l1 + 2.9); await tap(page, "aria=Menu");
  await rec.at(l1 + 3.3); await tap(page, "aria=Ask the hair coach");
  await rec.at(l1 + 4.0); await hover(page, "aria=Ask by voice", 450);
  await rec.at(l1 + 4.6);
  await page.goto(SITE + "/results", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /Share my plan/.test(document.body.innerText), { timeout: 15000 });
  await parkCursor(page, 250, 600);
  await rec.at(l1 + 5.3); await tap(page, "text=Share my plan");
  await rec.at(sc.duration + 0.1); await rec.stop(); rec.encode(sc.duration); await browser.close();
  composite(id);
};

export default S;
const want = process.argv.slice(2);
for (const id of want.length ? want : Object.keys(S).filter((k) => k !== "s04_details")) {
  console.log("▶", id);
  await S[id]();
}
