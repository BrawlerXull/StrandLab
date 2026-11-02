# Devpost submission draft: StrandLab

**Tagline:** Your hair type, measured. Then only the products that suit it.

**Live demo:** https://strandlab-youcam.vercel.app (no login needed). Fastest look, no photos: https://strandlab-youcam.vercel.app/samples
**Repo:** https://github.com/BrawlerXull/StrandLab

## Inspiration
Curly, wavy and coily shoppers famously buy and abandon dozens of products. Labels say "for 3B curls", "for fine hair" or "for high porosity", but most people don't know which of those they are. And the same product changes behaviour with the weather: a glycerin gel that defines curls on a mild day causes frizz on a humid or freezing one.

YouCam's hair diagnostics can measure what people currently guess, yet almost every hair project uses only colour or style try-on. We wanted Skin-AI-style diagnostics for hair, connected directly to shopping.

## What it does
1. **Four guided photos:** front, left, right, and head tipped forward. A camera guide and auto-framing help, and gallery uploads work too.
2. **Four YouCam detectors measure the hair:** curl pattern (Hair Type Detection), frizz 0–3 (Hair Frizziness Detection), density 0–3 (Hair Density Detection) and length (Hair Length Detection). They run in parallel with live progress.
3. **Two things a camera can't see:** a 4-question porosity check, and the live dew point for your city.
4. **An explainable plan:** ingredients to look for and avoid, each naming the measurement behind it (e.g. "Avoid glycerin: 22 °C dew point means humid air makes it swell and frizz"). It also includes a wash-day routine and a day-by-day routine for the week based on the forecast.
5. **Shopping:**
   - a ranked starter kit
   - a "Shop real … like this" search built from your rules
   - a label checker: paste any ingredient list, Gemini maps it to ingredient families, and deterministic rules score it
   - copy, print or save your plan as a shopping list
6. **Expectation check:** YouCam Hair Volume / Wavy Hair try-on shows the realistic result of the routine next to the "ad promise", on your own photo.
7. **Coach:** available on every page and grounded in your measurements. It offers follow-up questions, an "Explain this section" button in each section, and "Ask why" on every ingredient and step.
8. **Proof it works:** re-scan in two weeks (calendar reminder included) and StrandLab charts whether frizz actually dropped. Scans are stored only on your device.

## How we built it
- **App:** Next.js 14 + TypeScript + Tailwind, deployed on Vercel, installable as a PWA with offline support.
- **YouCam API v2** (upload → task → poll) for the four detectors plus the Hair Volume and Wavy Hair try-ons. The Hair Type result decides which try-on API and template to call.
- **Auto-framing ladder:**
  - **What the detectors require:** the face at 50–80% of the image width, three angle photos at identical pixel size, and specific head angles.
  - **How we meet it:** the browser computes a MediaPipe face box. The server crops, pads and resizes with sharp, and retries tighter or looser framings when YouCam rejects one. Rejected tasks aren't billed, so the retries are free.
  - **Transparency:** every attempt is traced and shown in "How we measured this".
- **Rule engine:** scores 14 ingredient families from curl family, frizz, density, length, porosity and dew point. Every score carries its reasons, and it's covered by unit tests.
- **Gemini:** INCI label parsing and the grounded coach, with key rotation and failover.
- **Open-Meteo:** live dew point and a 4-day outlook.

## Challenges we ran into
The hair detectors' input rules are strict and partly undocumented. We discovered each one by testing live:

- The face size limits.
- The three angle photos must have identical pixel size.
- Density needs a tipped-forward photo with the face still visible, and is very sensitive to framing.

Building the auto-framing ladder turned "photo rejected" into a measurement for real-world selfies. We also split analysis into parallel requests to stay well inside serverless time limits.

## Accomplishments we're proud of
- Six YouCam APIs are used, and the output of one decides the next call.
- No black box: every recommendation shows its reason, and every YouCam call is visible in the app.
- It's a complete product, from landing page to installable app, with accessibility built in.

## What we learned
Hair care depends as much on the environment (dew point) and on hidden properties (porosity) as on what the camera sees. The value comes from combining all three.

## What's next
- Retailer catalogues via affiliate feeds.
- Push reminders for the re-scan and for humid-day routine switches.
- A beard and scalp care mode using YouCam's beard and scalp APIs.

## Built with
nextjs · typescript · tailwindcss · youcam-api (hair-type-detection, hair-frizziness-detection, hair-density-detection, hair-length-detection, hair-volume, wavy-hair) · gemini · mediapipe · sharp · open-meteo · vercel · pwa

## Testing instructions
Open https://strandlab-youcam.vercel.app. No login is needed.

- **Fastest:** click **Try a sample** in the header (or open https://strandlab-youcam.vercel.app/samples) and pick Maya, Lena or Zola. These are pre-computed real YouCam results.
- **Full flow:** Start free scan → add 4 photos (camera or upload) → answer 4 questions + city → results (about 20–40 s).
- **Coach:** "Ask the coach" (bottom right) or "Explain this section" in any results tab.
