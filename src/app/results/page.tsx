"use client";
import Link from "next/link";
import Results from "@/components/Results";
import { dataUrlToBlob, useApp } from "@/components/AppState";
import { porosityFrom } from "@/components/Quiz";
import { Stepper } from "@/components/Shell";
import { Dots } from "@/components/Quiz";

export default function ResultsPage() {
  const { measured, analyzing, answers, climate, frontUrl, photos, history, reset } = useApp();

  if (!measured)
    return (
      <>
        <Stepper current={2} canVisit={(i) => i < 2} />
        <div className="mx-auto max-w-xl px-4 py-16 text-center" role="status">
          {analyzing ? (
            <>
              <p className="inline-flex items-center gap-2 text-teal"><Dots /> Measuring your hair…</p>
              <p className="mt-2 text-muted">This takes about 30 seconds.</p>
            </>
          ) : (
            <>
              <h1 className="h2">No results yet</h1>
              <p className="mt-2 text-muted">Start a scan, or explore a sample result first.</p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/scan" className="btn-primary">Start free scan</Link>
                <Link href="/samples/maya" className="btn-ghost">See a sample</Link>
              </div>
            </>
          )}
        </div>
      </>
    );

  const front = photos.front?.url || frontUrl || "";
  const blob = photos.front?.blob || (frontUrl ? dataUrlToBlob(frontUrl) : null);
  return (
    <>
      <Stepper current={2} canVisit={(i) => i < 2} />
      <Results
        title="Your hair profile"
        profile={{ measured, porosity: porosityFrom(answers), climate }}
        frontUrl={front}
        frontBlob={blob}
        history={history}
        retakeHref="/scan"
        editDetailsHref="/scan/details"
        onRestart={reset}
      />
    </>
  );
}
