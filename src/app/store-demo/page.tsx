"use client";
// A fictional third-party shop that embeds the StrandLab widget exactly as a real store would:
// one <script> tag + data attributes. Everything StrandLab-specific comes from /widget.js.
import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

const PDP = {
  id: "ond-gel-01",
  name: "Cloud Curl Defining Gel",
  price: 18,
  hue: "#CFE3DE",
  ingredients:
    "Aqua, Glycerin, Polyquaternium-11, Aloe Barbadensis Leaf Juice, Hydroxyethylcellulose, Panthenol, Linum Usitatissimum Seed Extract, Phenoxyethanol, Ethylhexylglycerin, Parfum",
};

const MORE = [
  { id: "ond-cream-02", name: "Shea Whip Curl Cream", price: 22, hue: "#EAD9C2", ingredients: "Aqua, Butyrospermum Parkii Butter, Cetearyl Alcohol, Cocos Nucifera Oil, Glycerin, Behentrimonium Methosulfate, Ricinus Communis Seed Oil, Panthenol, Phenoxyethanol, Parfum" },
  { id: "ond-mousse-03", name: "Airlight Volume Mousse", price: 15, hue: "#E3E6F1", ingredients: "Aqua, Alcohol Denat., Polyquaternium-4, Isobutane, Propane, PEG-12 Dimethicone, Panthenol, Parfum" },
  { id: "ond-mask-04", name: "Rebuild Protein Mask", price: 26, hue: "#EADCE6", ingredients: "Aqua, Cetearyl Alcohol, Hydrolyzed Keratin, Hydrolyzed Wheat Protein, Behentrimonium Chloride, Glycerin, Argania Spinosa Kernel Oil, Phenoxyethanol" },
  { id: "ond-cowash-05", name: "Gentle Cleanse Co-Wash", price: 16, hue: "#DDEBDD", ingredients: "Aqua, Cetearyl Alcohol, Cocamidopropyl Betaine, Behentrimonium Chloride, Aloe Barbadensis Leaf Juice, Glycerin, Simmondsia Chinensis Seed Oil, Phenoxyethanol" },
  { id: "ond-shampoo-06", name: "Clarifying Daily Shampoo", price: 12, hue: "#E0ECF2", ingredients: "Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Sodium Chloride, Dimethicone, Parfum, Citric Acid, Methylchloroisothiazolinone" },
];

type Log = { at: string; name: string; detail: unknown };

function Bottle({ hue, big }: { hue: string; big?: boolean }) {
  return (
    <svg viewBox="0 0 120 160" className={big ? "h-72 w-auto" : "h-36 w-auto"} aria-hidden>
      <rect x="44" y="8" width="32" height="22" rx="4" fill="#3B3B3B" />
      <rect x="28" y="28" width="64" height="124" rx="18" fill={hue} stroke="#00000018" />
      <rect x="38" y="70" width="44" height="40" rx="6" fill="#ffffffb0" />
      <text x="60" y="94" fontSize="11" textAnchor="middle" fill="#333" fontFamily="Georgia">ondine</text>
    </svg>
  );
}

export default function StoreDemo() {
  const [log, setLog] = useState<Log[]>([]);
  useEffect(() => {
    const add = (e: Event) => setLog((l) => [{ at: new Date().toLocaleTimeString(), name: e.type, detail: (e as CustomEvent).detail }, ...l].slice(0, 12));
    document.addEventListener("strandlab:result", add);
    document.addEventListener("strandlab:score", add);
    return () => {
      document.removeEventListener("strandlab:result", add);
      document.removeEventListener("strandlab:score", add);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#222]" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <Script src="/widget.js" strategy="afterInteractive" />
      <div className="bg-[#1F2A2A] text-white text-sm">
        <div className="mx-auto max-w-6xl px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <p>🧪 <b>Demo:</b> a fictional shop embedding the StrandLab widget with one script tag.</p>
          <div className="flex gap-4">
            <Link href="/for-stores" className="underline">How to add it to your store</Link>
            <Link href="/" className="underline">← StrandLab</Link>
          </div>
        </div>
      </div>

      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <p className="text-2xl tracking-wide" style={{ fontFamily: "Georgia, serif" }}>ondine <span className="text-xs align-middle text-gray-500">(demo store)</span></p>
          <nav className="hidden sm:flex gap-6 text-sm text-gray-600" aria-label="Demo store">
            <span>Curls</span><span>Waves</span><span>Coils</span><span>Bundles</span>
          </nav>
          <span className="text-sm">Bag (0)</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 grid lg:grid-cols-[1fr_340px] gap-10">
        <div>
          {/* Product detail */}
          <section className="grid md:grid-cols-2 gap-8 items-start">
            <div className="rounded-2xl bg-[#F4F1EC] flex items-center justify-center py-10"><Bottle hue={PDP.hue} big /></div>
            <div>
              <p className="text-sm text-gray-500">Styler · 250 ml</p>
              <h1 className="mt-1 text-3xl" style={{ fontFamily: "Georgia, serif" }}>{PDP.name}</h1>
              <p className="mt-2 text-xl">${PDP.price}.00</p>
              <p className="mt-4 text-gray-700">Soft-hold gel for defined, touchable curls. Flaxseed and aloe for slip.</p>

              {/* ↓↓↓ This is the whole integration on a product page ↓↓↓ */}
              <div className="mt-6">
                <div data-strandlab="" data-product={PDP.name} data-product-id={PDP.id} data-ingredients-selector="#pdp-ingredients" />
              </div>
              {/* ↑↑↑ */}

              <button className="mt-4 w-full rounded-full bg-[#222] py-3 text-white">Add to bag</button>
              <details className="mt-6 border-t pt-4" open>
                <summary className="cursor-pointer font-medium">Ingredients</summary>
                <p id="pdp-ingredients" className="mt-2 text-sm text-gray-600">{PDP.ingredients}</p>
              </details>
            </div>
          </section>

          {/* Product grid: buttons get match badges automatically once the shopper has a profile */}
          <section className="mt-14">
            <h2 className="text-xl" style={{ fontFamily: "Georgia, serif" }}>You may also like</h2>
            <p className="text-sm text-gray-500">After your first match, every product here is scored for your hair automatically.</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {MORE.map((p) => (
                <div key={p.id} className="rounded-2xl border p-4 flex flex-col">
                  <div className="rounded-xl bg-[#F4F1EC] flex justify-center py-4"><Bottle hue={p.hue} /></div>
                  <p className="mt-3 font-medium">{p.name}</p>
                  <p className="text-sm text-gray-500">${p.price}.00</p>
                  <div className="mt-3">
                    <div data-strandlab="" data-product={p.name} data-product-id={p.id} data-ingredients={p.ingredients} data-label="Check my match" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* What the store's own code receives */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="rounded-2xl border bg-[#FAFAF8] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">What this store receives</p>
            <p className="mt-1 text-sm text-gray-600">
              Live <code className="text-xs bg-white px-1 rounded border">strandlab:result</code> and <code className="text-xs bg-white px-1 rounded border">strandlab:score</code> events. The store can use them to sort products, show badges or recommend bundles. No photos are ever sent.
            </p>
            {log.length === 0 && <p className="mt-4 text-sm text-gray-500">Click “Find my hair match” to see events here.</p>}
            <ol className="mt-3 space-y-2 max-h-[60vh] overflow-auto" aria-live="polite">
              {log.map((l, i) => (
                <li key={i} className="rounded-lg bg-white border p-2">
                  <p className="text-xs"><b>{l.name}</b> <span className="text-gray-400">{l.at}</span></p>
                  <pre className="mt-1 text-[11px] leading-snug whitespace-pre-wrap break-words text-gray-700">{JSON.stringify(l.detail, null, 1).slice(0, 900)}</pre>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
