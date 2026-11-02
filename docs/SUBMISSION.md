# Devpost submission draft: StrandLab

**Tagline:** Your hair type, measured. Then only the products that suit it.

**Elevator pitch (≤200 chars):** YouCam Hair AI measures your curls, frizz, density and length, and StrandLab turns that into what to buy, on any store, via one script tag. An accessible PWA with a 17-language coach.

**Demo video (2:58):** https://youtu.be/a3W9PW61wXw

**Store widget (eCommerce integration):** https://strandlab-youcam.vercel.app/store-demo — one `<script>` tag gives any shop hair matching on every product.
**Live demo:** https://strandlab-youcam.vercel.app (no login needed). Fastest look, no photos: https://strandlab-youcam.vercel.app/samples
**Repo:** https://github.com/BrawlerXull/StrandLab

## Text description (features, functionality, consumer and retail value)

**StrandLab measures your hair with YouCam Hair AI and tells you exactly what to buy, on our site or inside any online store.**

**The problem.** Hair-care labels say "for 3B curls", "for fine hair" or "for high porosity", but most shoppers don't know which of those they are. So they guess, buy a product, find it doesn't work, and buy another. Curly, wavy and coily shoppers are hit hardest, and the weather makes it worse: the same glycerin gel defines curls on a mild day and causes frizz on a humid one.

**How it works**
- **Measure:** the shopper takes four guided photos. A live camera guide speaks corrections and takes each photo automatically. Four YouCam APIs then run in parallel: **Hair Type, Hair Frizziness, Hair Density and Hair Length Detection**. An auto-framing step re-crops any photo YouCam rejects, so real-world selfies still get measured.
- **Add context:** a 4-question porosity check and the live dew point at the shopper's location cover what a camera can't see.
- **Explain:** an explainable rule engine scores 14 ingredient families.
  - The **Ingredients** tab lists what to look for and avoid, each with the measurement behind it.
  - The **Routine** tab gives four wash-day steps, each with its reason.
  - The Overview plans every day of the week from the forecast.
- **Shop:** a ranked starter kit, real-product searches localised to the shopper's country, and a label checker. The shopper can photograph any bottle in a shop and get a "Good fit / Okay / Skip it" verdict with a match score.
- **Set expectations:** YouCam's **Hair Volume** and **Wavy Hair** try-ons show the realistic result of the routine next to the "ad promise", on the shopper's own photo.
- **Ask:** a coach grounded in the shopper's measurements answers in 17 languages, by voice or text, and can read its answers aloud.

**Consumer value.** Shoppers stop guessing and stop wasting money on products that were never right for them. Every recommendation is explained, and a re-scan loop shows whether frizz actually dropped. StrandLab is free, needs no login, and installs as a **PWA** from the browser with no app store. That puts it on the home screen in the store aisle, with camera access for scans and label photos, and offline fallback.

**Accessibility.** The app reaches more people than a typical beauty tool:
- a no-photo check for people who can't or won't share a selfie
- a hands-free spoken camera guide
- voice in and voice out, and 17 languages
- bigger text and a high-contrast mode
- 0 axe-core WCAG 2.1 AA violations across every page

**Retail value.** One `<script>` tag adds a "Find my hair match" button to any store's product pages.
- The shopper matches once, without leaving the store, and **every product on the page shows a personal match badge**.
- The store's code receives the result (match %, reasons, look-for and avoid lists) as JavaScript events it can use to sort, recommend or bundle products.
- Photos never reach the store.
- Badges are scored in the browser, so they cost nothing per page view.

For retailers, that means more confident purchases, fewer returns of products that didn't suit the shopper, and real hair data for personalisation.

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

## Was there a moment where the API surprised you?
Both kinds, and close together.

**The frustrating part:** our first real selfies were rejected. We got `error_face_position_too_small`, then `error_mismatch_image_size`, then out-of-boundary errors, for photos that looked fine to us. The hair detectors turned out to have strict input rules that we had to discover by testing live:
- the face must fill roughly 50–80% of the image width
- the three angle photos must have exactly the same pixel size
- density needs a head-tipped-forward photo that still shows the face, and it is very sensitive to framing

**The good surprise came straight after:** rejected tasks aren't billed. That changed our whole approach. Instead of asking users to retake photos, we built an auto-framing ladder:
- MediaPipe finds the face in the browser.
- The server crops, pads and resizes with sharp, then retries tighter or looser framings until YouCam accepts one.
- Retries cost nothing, so "photo rejected" became a measurement for almost any real-world selfie.

We also show every attempt in the app ("How we measured this"), so judges and users can see exactly what was sent and which framing worked.

The other pleasant surprise was how well the APIs chain together. The Hair Type result is precise enough that we use it to decide which try-on to run: Hair Volume or Wavy Hair, and with which template. One API's output drives the next call.

## Industries or use cases nobody is talking about yet
Most conversation about beauty AI is about try-on: lipstick shades, hair colours, hairstyles. Building StrandLab convinced us the bigger opportunity is **diagnostics as a measurement tool**, especially once it's combined with data the camera can't see.

1. **Health and recovery tracking.** Hair density measured over time is a real signal for people going through chemotherapy, postpartum shedding, thyroid treatment or alopecia care. Today they judge regrowth by eye in the mirror. A consistent, photo-based density trend (our re-scan loop already does this for frizz and density) would give patients and clinics something objective to talk about. It wouldn't be a diagnosis, just honest tracking.
2. **Climate-aware beauty.** We were surprised how much dew point changes which ingredients work. Combine diagnostics with weather and location and brands can do things nobody does yet:
   - switch a subscriber's regimen with the seasons
   - forecast regional demand ("anti-humidity stylers before the monsoon in Mumbai")
   - send humid-day routine alerts
3. **Formulation R&D from real-world data.** Aggregated, anonymised and with consent, diagnostics show what people's hair actually looks like by region: curl families, density, frizz under real humidity. Today formulators mostly work from small panels. This is a market-research product hiding inside a consumer app.
4. **Salons and stylists.** A client could arrive with a measured profile and routine already shared (our "Share my plan" sends it in one tap). Consultations would be faster, and the stylist could recommend retail products that actually suit the client, instead of whatever is on the shelf.
5. **Physical retail and pharmacies.** A PWA plus a label photo turns any phone into a shelf assistant in the aisle. The same approach would help drugstores, where most hair care is sold, and help visually impaired shoppers, who can photograph a bottle and hear the verdict read aloud.
6. **Hospitality and travel.** Hotels, gyms and airlines stock one generic shampoo. A guest's saved profile could pick amenities that suit their hair, which is a small, delightful personalisation that no one offers.

The common thread: YouCam's APIs are usually treated as a fun mirror. They're also a **sensor**, and sensors become valuable when you measure over time, add context and connect the result to a decision.

## Where did you hit a wall technically? How did you work around it?
The biggest wall was YouCam rejecting real-world selfies. The auto-framing ladder we built to get past it is described in the API answer above. Four other walls:

1. **Serverless time limits.** The four detectors run as upload, then task, then poll. Add framing retries, and one analysis request blew past Vercel's function time limit.
   **Workaround:** the browser fires three requests in parallel (curl + frizz, length, density), so each gets its own time budget. The UI shows live per-detector progress, so waiting feels like progress rather than a frozen screen. Results are cached by image hash, so a repeat run spends no API units.

2. **The tipped-forward photo is hard to take alone.** Density needs your head tipped forward with your face still visible. You can't see your screen in that pose, and most attempts were rejected.
   **Workaround:** a guided camera. MediaPipe face keypoints check distance, centring, head turn, tip angle and lighting in real time. The app **speaks** corrections ("tip a little more") and **takes the photo automatically** once the pose holds steady. The feature started as a fix for rejected photos and became one of our biggest accessibility wins.

3. **AI rate limits during demos.** Gemini powers the label reader and the coach. Free-tier rate limits and occasional outages meant features could fail exactly when a judge tried them.
   **Workarounds:**
   - Requests rotate across API keys, with failover.
   - Label scoring always goes through a **deterministic INCI classifier** (unit-tested), with Gemini only reading the label photo. If Gemini is down, pasted ingredient lists still get a verdict.
   - The coach falls back to answers built from the rule engine's own reasons instead of showing an error.

4. **Getting the shopper's profile into someone else's store, safely.** The widget runs on a store's domain, and browsers now partition third-party storage, so the iframe can't simply read the profile the shopper saved on our site. The store's CSS could also break our button, and any page can send `postMessage`.
   **Workarounds:**
   - The scan profile is shared through a **first-party pop-up**, and only after the shopper taps Share.
   - The button lives in **Shadow DOM**, so store styles can't reach it.
   - Every message is checked against its origin.
   - Per-product badges are scored in the browser, so they never hit an API or a rate limit.

Smaller one: voice input via the Web Speech API doesn't work in every browser (Firefox, some iOS setups). We switched to recording with MediaRecorder and transcribing with Gemini, so the mic works in every modern browser.

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
