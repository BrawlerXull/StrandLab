# Devpost submission draft: StrandLab

**Tagline:** Your hair type, measured. Then only the products that suit it.

**Elevator pitch (≤200 chars):** YouCam Hair AI measures your curls, frizz, density and length, and StrandLab turns that into what to buy, on any store, via one script tag. An accessible PWA with a 17-language coach.

**Demo video (2:58):** _YouTube link coming soon_

**Store widget (eCommerce integration):** https://strandlab-youcam.vercel.app/store-demo — one `<script>` tag gives any shop hair matching on every product.
**Live demo:** https://strandlab-youcam.vercel.app (no login needed). Fastest look, no photos: https://strandlab-youcam.vercel.app/samples
**Repo:** https://github.com/BrawlerXull/StrandLab

## Inspiration
Curly, wavy and coily shoppers famously buy and abandon dozens of products. Labels say "for 3B curls", "for fine hair" or "for high porosity", but most people don't know which of those they are. And the same product changes behaviour with the weather: a glycerin gel that defines curls on a mild day causes frizz on a humid or freezing one.

YouCam's hair diagnostics can measure what people currently guess, yet almost every hair project uses only colour or style try-on. We wanted Skin-AI-style diagnostics for hair, connected directly to shopping.

## What it does
1. **Four guided photos:** front, left, right, and head tipped forward. The camera checks your pose live (distance, centring, head turn, head tip, lighting), talks you through it out loud, and takes the photo itself when the pose is right, so you can do the tipped-forward shot alone. Gallery uploads work too. **No camera or prefer not to share photos?** A no-photo check builds a clearly labelled, self-reported plan from 4 picture-based questions.
2. **Four YouCam detectors measure the hair:** curl pattern (Hair Type Detection), frizz 0–3 (Hair Frizziness Detection), density 0–3 (Hair Density Detection) and length (Hair Length Detection). They run in parallel with live progress.
3. **Two things a camera can't see:** a 4-question porosity check, and the live dew point for your city.
4. **An explainable plan:**
   - The **Ingredients** tab is a label cheat sheet: what to look for, what to avoid and why, each naming the measurement behind it (e.g. "Avoid glycerin: 22 °C dew point means humid air makes it swell and frizz").
   - The **Routine** tab gives four wash-day steps (cleanse, condition, leave-in, style), each with its reason.
   - The Overview plans each day of the week from the forecast.
5. **Shopping:**
   - a ranked starter kit
   - a "Shop real … like this" search built from your rules, localised to your country (Google Shopping region + the right Amazon store, e.g. amazon.in, amazon.co.uk)
   - a label checker: **photograph the back of a bottle in the shop** (Gemini reads the ingredient list) or paste it; Gemini maps it to ingredient families, and deterministic rules score it
   - share your plan (phone share sheet, WhatsApp, email), copy it, or print / save it as a PDF
6. **Expectation check:** YouCam Hair Volume / Wavy Hair try-on shows the realistic result of the routine next to the "ad promise", on your own photo.
7. **Coach:** available on every page and grounded in your measurements. It offers follow-up questions, an "Explain this section" button in each section, and "Ask why" on every ingredient and step. **Ask by voice, hear answers read aloud, and get replies in 17 languages** (auto-detects the language you write or speak in: Hindi, Spanish, Portuguese, Arabic, Swahili, Yoruba and more).
8. **Accessible to everyone:** text size and high-contrast settings, and 0 axe-core WCAG 2.1 AA violations across every page in both display modes.
9. **For stores (eCommerce integration):** one `<script>` tag adds a "Find my hair match" button to any store's product page. The shopper matches once, inside an isolated dialog, and every product on the page then shows a match badge. The store's code receives the result (match %, reasons, `lookFor`/`avoid`) as a JavaScript event. Photos never reach the store. Live demo store: https://strandlab-youcam.vercel.app/store-demo · docs: /for-stores.
10. **Installable PWA:** install it from the browser, with no app store. It opens full screen from the home screen in the store aisle, uses the phone camera for the guided scan and label photos, and has an offline fallback.
11. **Proof it works:** re-scan in two weeks (calendar reminder included) and StrandLab charts whether frizz actually dropped. Scans are stored only on your device.

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
- It's a complete product, from landing page to installable app, with accessibility built in: 0 automated WCAG 2.1 AA violations, voice in/out, 17 languages, a no-photo route and a hands-free camera.

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
- **Coach:** "Ask the coach" (bottom right) or "Explain this section" in any results tab. Try the mic, "Listen", or set "Reply in" to हिन्दी / Español.
- **Label photo:** Products tab → "Scan a label with your camera" (or upload a photo of any ingredient list).
- **No-photo check:** https://strandlab-youcam.vercel.app/quick
- **Display:** the "Aa" button in the header (text size, high contrast).
- **Store widget:** https://strandlab-youcam.vercel.app/store-demo → "Find my hair match" → pick a sample (e.g. Maya) → Done. Every product gets a badge, and the right-hand panel shows exactly what the store's code receives.
