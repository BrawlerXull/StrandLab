"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const SNIPPET = (origin: string) => `<!-- 1. Once per page -->
<script src="${origin}/widget.js" async></script>

<!-- 2. Where the button should appear (product page, quick view, grid card…) -->
<div data-strandlab
     data-product="Cloud Curl Defining Gel"
     data-product-id="sku-123"
     data-ingredients="Aqua, Glycerin, Polyquaternium-11, Aloe Barbadensis Leaf Juice, …"></div>`;

const LISTEN = `// 3. Optional: use the result in your store
document.addEventListener("strandlab:result", (e) => {
  const r = e.detail;            // see "Result" below
  if (r.product?.verdict === "great") showBadge(r.product.id);
  sortCatalogue({ lookFor: r.lookFor, avoid: r.avoid });
});

document.addEventListener("strandlab:score", (e) => {
  // { id, match, verdict, label } — fired for every product button on the page
});

// Or open it from your own button / quiz entry point:
StrandLab.open({ name: "Curl Cream", ingredients: "Aqua, Shea Butter, …" });
StrandLab.open();               // no product: profile + what to look for`;

const RESULT = `{
  "product": {
    "id": "sku-123", "name": "Cloud Curl Defining Gel",
    "match": 82, "verdict": "great", "verdictLabel": "Great match",
    "pros": ["Film-formers / hold: gel cast locks the curl clump", "…"],
    "cons": ["Humectants: 22°C dew point (humid) — glycerin pulls in moisture"],
    "detected": ["Humectants", "Film-formers / hold", "Panthenol"]
  },
  "profile": {
    "curlPattern": "3B TO 3C", "curlFamily": "curly", "frizz": 2,
    "density": "High Density", "length": "above chest", "porosity": "high",
    "dewPointC": 22, "source": "measured"   // measured | self-reported | sample
  },
  "routineWeight": "rich",
  "lookFor": ["Film-formers / hold", "Fatty alcohols", "Rich butters"],
  "avoid": ["Humectants", "Sulfate cleansers", "Drying alcohols"]
}`;

function Code({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-2xl bg-ink text-paper">
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* ignore */
          }
        }}
        className="absolute right-3 top-3 rounded-full bg-white/15 px-3 py-1 text-xs hover:bg-white/25"
        aria-label={`Copy ${label}`}
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-5 pr-20 text-[13px] leading-relaxed font-mono"><code>{code}</code></pre>
    </div>
  );
}

const ATTRS: [string, string][] = [
  ["data-strandlab", "Marks where the button goes (required)."],
  ["data-product", "Product name shown in the dialog."],
  ["data-product-id", "Your SKU / ID — returned in every event so you can match results to products."],
  ["data-ingredients", "The INCI ingredient list. StrandLab classifies it (Gemini) and scores it with its deterministic rules."],
  ["data-ingredients-selector", "Instead of data-ingredients: a CSS selector for the element on your page that already shows the ingredients."],
  ["data-label", "Button text (default “Find my hair match”). On the <script> tag it sets the default for all buttons."],
  ["data-color (script tag)", "Brand colour for the button, e.g. data-color=\"#7A2E5C\"."],
  ["data-auto-score=\"false\" (script tag)", "Turn off automatic match badges on every product button."],
];

export default function ForStores() {
  const [origin, setOrigin] = useState("https://strandlab-youcam.vercel.app");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
      <Link href="/" className="text-sm text-muted hover:text-ink">← Back to home</Link>
      <p className="eyebrow mt-6">For stores &amp; brands</p>
      <h1 className="font-serif text-4xl sm:text-5xl tracking-tight mt-2">Put a hair-match check on every product page</h1>
      <p className="mt-4 max-w-3xl text-lg text-ink/80">
        One script tag adds a <b>“Find my hair match”</b> button to any store. Shoppers measure their hair once (YouCam Hair AI photo scan, or 5 quick
        questions), and every product shows how well it suits them — with the reasons. Your code gets the result as a JavaScript event.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/store-demo" className="btn-primary !px-6 !py-3 !text-base">Open the live demo store →</Link>
        <a href="#install" className="btn-ghost !px-6 !py-3 !text-base">Install in 2 minutes</a>
      </div>

      <section className="mt-12 grid gap-4 md:grid-cols-3" aria-label="How it works for shoppers">
        {[
          ["1. Tap the button", "On your product page. The StrandLab dialog opens on top — the shopper never leaves your store."],
          ["2. Get matched", "Quick 5-question check, or their AI-measured StrandLab scan (shared only with their consent). Saved for the next product."],
          ["3. Every product scored", "The button turns into “82% match · suits your hair”, and every other product on the page gets its own badge."],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <p className="font-semibold">{t}</p>
            <p className="mt-1 text-sm text-ink/75">{d}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="h2">Why stores add it</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 text-ink/85">
          <li className="card p-4"><b>Confidence at the moment of purchase.</b> “Will this work on my hair?” is the question that stops a curly-hair shopper from buying.</li>
          <li className="card p-4"><b>Fewer wrong-product returns.</b> A clear “not ideal for your hair — here’s why” beats a disappointed review.</li>
          <li className="card p-4"><b>Zero catalogue work.</b> It reads the ingredient list you already publish. No tagging, no product feed.</li>
          <li className="card p-4"><b>First-party insight.</b> Use <code>lookFor</code> / <code>avoid</code> to sort collections or recommend bundles — your data, in your code.</li>
        </ul>
      </section>

      <section id="install" className="mt-12 scroll-mt-24">
        <h2 className="h2">Install</h2>
        <p className="mt-2 text-ink/75">Works on any platform that lets you add HTML: Shopify (theme section / custom liquid), WooCommerce, Webflow, BigCommerce, or a custom site.</p>
        <div className="mt-4 space-y-4">
          <Code code={SNIPPET(origin)} label="install snippet" />
          <Code code={LISTEN} label="event example" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="h2">Attributes</h2>
        <div className="mt-4 overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-shell text-left">
              <tr><th className="p-3 font-semibold">Attribute</th><th className="p-3 font-semibold">What it does</th></tr>
            </thead>
            <tbody>
              {ATTRS.map(([a, d]) => (
                <tr key={a} className="border-t border-line align-top">
                  <td className="p-3 font-mono text-xs whitespace-nowrap">{a}</td>
                  <td className="p-3 text-ink/80">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="h2">Result</h2>
        <p className="mt-2 text-ink/75"><code>event.detail</code> of <code>strandlab:result</code>:</p>
        <div className="mt-4"><Code code={RESULT} label="result example" /></div>
      </section>

      <section className="mt-12 card p-6">
        <h2 className="text-lg font-semibold">Privacy &amp; security</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink/80">
          <li>Photos never reach the store. The photo scan runs on StrandLab in its own window; only the derived hair summary and match scores are shared, after the shopper taps “Share”.</li>
          <li>The widget runs in an isolated iframe; every message is checked against the StrandLab origin, and replies go only to the page that embedded it.</li>
          <li>Button styles live in Shadow DOM, so they can’t clash with your theme. No cookies, no tracking pixels, no dependencies (~10 KB).</li>
          <li>Cosmetic guidance only — the dialog points people with scalp or hair-loss concerns to a dermatologist.</li>
        </ul>
      </section>
    </div>
  );
}
