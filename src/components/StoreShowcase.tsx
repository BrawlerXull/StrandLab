"use client";
// "For stores" showcase with the REAL widget running inside it (same /widget.js a store would embed).
import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

const DEMO = {
  name: "Cloud Curl Defining Gel",
  ingredients: "Aqua, Glycerin, Polyquaternium-11, Aloe Barbadensis Leaf Juice, Hydroxyethylcellulose, Panthenol, Linum Usitatissimum Seed Extract, Phenoxyethanol, Parfum",
};

type Got = { match: number; label: string; lookFor: string[]; avoid: string[] } | null;

export default function StoreShowcase({ id = "for-stores" }: { id?: string }) {
  const [got, setGot] = useState<Got>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const r = (e as CustomEvent).detail;
      if (r?.product?.id === "showcase-gel") setGot({ match: r.product.match, label: r.product.verdictLabel, lookFor: r.lookFor || [], avoid: r.avoid || [] });
    };
    document.addEventListener("strandlab:result", on);
    return () => document.removeEventListener("strandlab:result", on);
  }, []);

  return (
    <section id={id} className="scroll-mt-20 bg-ink text-paper" aria-labelledby={`${id}-title`}>
      <Script src="/widget.js" strategy="afterInteractive" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-amber px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            New · For stores &amp; brands
          </p>
          <h2 id={`${id}-title`} className="mt-4 font-serif text-3xl sm:text-5xl leading-[1.08] tracking-tight">
            One line of code puts StrandLab on <em className="text-[#9FD3C7]">every product page</em>
          </h2>
          <p className="mt-4 max-w-xl text-lg text-paper/80">
            Any hair-care shop can add a <b className="text-paper">“Find my hair match”</b> button. Shoppers match once and every product
            shows how well it suits their hair, with reasons. The store gets the result as a JavaScript event. No catalogue work, and photos never reach the store.
          </p>
          <ul className="mt-5 grid sm:grid-cols-3 gap-3 text-sm">
            {[
              ["1 script tag", "Shopify, WooCommerce, Webflow, any site"],
              ["Every product scored", "Badges appear across the whole page"],
              ["Data back to the store", "match %, look-for / avoid lists"],
            ].map(([t, d]) => (
              <li key={t} className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="font-semibold">{t}</p>
                <p className="text-paper/70 text-xs mt-0.5">{d}</p>
              </li>
            ))}
          </ul>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-black/40 border border-white/10 p-4 text-[12.5px] leading-relaxed font-mono text-[#CFE7E1]" aria-label="Install snippet">
{`<script src="https://strandlab-youcam.vercel.app/widget.js" async></script>
<div data-strandlab data-product="Curl Gel"
     data-ingredients="Aqua, Glycerin, Polyquaternium-11, …"></div>`}
          </pre>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/store-demo" className="btn !px-6 !py-3 !text-base bg-paper text-ink hover:bg-white">Open the live demo store →</Link>
            <Link href="/for-stores" className="btn !px-6 !py-3 !text-base border border-white/30 text-paper hover:bg-white/10">Install guide &amp; API</Link>
          </div>
        </div>

        {/* Live widget, exactly as a store embeds it */}
        <div className="min-w-0 rounded-3xl bg-white text-[#222] p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Try it right here: this is the real widget</p>
            <span className="rounded-full bg-[#F4F1EC] px-2 py-0.5 text-[11px] text-gray-600">example shop</span>
          </div>
          <div className="mt-4 flex gap-4">
            <div className="flex h-28 w-24 shrink-0 items-center justify-center rounded-2xl bg-[#F4F1EC]" aria-hidden>
              <svg viewBox="0 0 120 160" className="h-24 w-auto">
                <rect x="44" y="8" width="32" height="22" rx="4" fill="#3B3B3B" />
                <rect x="28" y="28" width="64" height="124" rx="18" fill="#CFE3DE" />
                <rect x="38" y="70" width="44" height="40" rx="6" fill="#ffffffb0" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-lg leading-tight" style={{ fontFamily: "Georgia, serif" }}>{DEMO.name}</p>
              <p className="text-sm text-gray-500">$18.00 · 250 ml</p>
              <div className="mt-3">
                <div data-strandlab="" data-product={DEMO.name} data-product-id="showcase-gel" data-ingredients={DEMO.ingredients} />
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-[#FAFAF8] p-4" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">What the store’s code receives</p>
            {got ? (
              <pre className="mt-2 text-[12px] leading-snug whitespace-pre-wrap text-gray-800 font-mono">
{`strandlab:result {
  match: ${got.match},  // "${got.label}"
  lookFor: [${got.lookFor.slice(0, 3).map((x) => `"${x}"`).join(", ")}],
  avoid: [${got.avoid.slice(0, 3).map((x) => `"${x}"`).join(", ")}]
}`}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Tap <b>Find my hair match</b>, then pick a sample person. The result appears here, the same way it reaches a store.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
