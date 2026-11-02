import Link from "next/link";
import type { Metadata } from "next";
import { SampleGrid } from "@/components/SamplePicker";

export const metadata: Metadata = { title: "Sample results · StrandLab" };

export default function SamplesIndex() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <Link href="/" className="text-sm text-muted hover:text-ink">← Back to home</Link>
      <p className="eyebrow mt-6">Sample results</p>
      <h1 className="h2 mt-2">Open a full result in one click</h1>
      <p className="mt-2 text-muted max-w-2xl">
        Every tab works: profile, ingredients, routine, products, try-on preview, the coach, and the YouCam call trace.
        These people are AI-generated; their measurements are real YouCam Hair AI results.
      </p>
      <div className="mt-8"><SampleGrid /></div>
      <p className="mt-8 text-sm text-muted">
        Ready for your own? <Link href="/scan" className="text-teal underline">Start a free scan</Link> — about 2 minutes.
      </p>
    </div>
  );
}
