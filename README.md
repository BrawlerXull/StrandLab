# StrandLab: your hair type, measured

**For curly, wavy and frizz-prone shoppers who keep buying products that don't suit their hair.**

Hair-care labels assume you know whether you're "3A", "fine" or "high porosity". Most people guess, so they buy and abandon product after product. StrandLab uses **YouCam Hair AI** to measure the hair, adds the two factors a camera can't see (porosity and today's dew point), and returns a shopping list in which every ingredient is explained.

## What it does

1. **4 guided photos.** Front, left, right, and head tipped forward. A MediaPipe face box is computed in the browser, and the server auto-frames each photo to what each YouCam detector expects.
2. **Four YouCam detectors, run in parallel:**
   | YouCam API | Input | Output |
   |---|---|---|
   | Hair Type Detection | front + right + left | curl pattern 1–4C (9 ranges) |
   | Hair Frizziness Detection | front + right + left | frizz 0–3 |
   | Hair Density Detection | head-tipped photo | density 0–3 |
   | Hair Length Detection | front photo | length band |
3. **Porosity quiz + live dew point** ([Open-Meteo](https://open-meteo.com), no key). Dew point decides whether humectants like glycerin help (4–15 °C), pull moisture *out* (dry air), or cause swelling and frizz (humid air).
4. **Explainable rule engine** (`src/lib/rules.ts`). Each measurement adds or subtracts points for 14 ingredient families, and every point carries a reason that names the measurement it came from, e.g. *"22 °C dew point (humid): glycerin pulls in excess moisture → frizz"*.
5. **Ranked shortlist** from a demo catalogue (fictional products), plus a starter kit.
6. **Label checker.** Paste any ingredient list. Gemini maps the INCI names to the rule-engine tags, and the score itself stays deterministic.
7. **Expectation check (YouCam Hair Volume / Wavy Hair VTO).** Shows the *realistic* result of the routine next to the *ad-campaign* result, on your own photo, so expectations are set before you buy.
8. **Coach.** Gemini answers follow-up questions using only your measurements and the rule output.
9. **Re-scan tracking.** Frizz and density changes since your last scan, stored only in your browser.

## How the YouCam APIs are chained

- One output decides the next call:
  - **Hair Type** picks the try-on feature and templates: Wavy Hair for waves, Volume for straight, curly and coily hair.
  - **All four measurements plus climate** drive the rule engine, and the rule engine scores products and pasted labels.
- **Auto-framing ladder** (`src/lib/diagnose.ts`):
  - **Type and frizz:** the detectors need the face at ~50–80% of the image width, and all three angle photos at identical pixel size. On `error_face_position_too_small` the server crops tighter; on `out_of_boundary` it crops looser.
  - **Density and length:** the server walks a set of padding and crop variants.
  - **Cost:** failed tasks don't consume units, so the retries are free.
- **Caching:** results are cached by image hash, so repeat runs cost nothing.

## Run it

```bash
npm install
cp .env.example .env.local   # add YOUCAM_API_KEY and GEMINI_API_KEYS (comma-separated, rotated)
npm run dev
```

Three sample profiles (Maya, Lena, Zola) open instantly from pre-computed **real YouCam results**. The people in them are AI-generated with YouCam's own image generator, so no real person's photos are used. `scripts/build_samples.py` rebuilds them through the live API.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · sharp · MediaPipe Tasks (face box) · YouCam API v2 · Gemini (key rotation and failover) · Open-Meteo.

*Cosmetic guidance only. For hair loss, scalp pain or sudden shedding, see a dermatologist.*
