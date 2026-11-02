"use client";
import Link from "next/link";
import { useMemo } from "react";
import Results from "@/components/Results";
import { dataUrlToBlob, useApp } from "@/components/AppState";
import { porosityFrom } from "@/components/Quiz";
import { Stepper } from "@/components/Shell";
import AnalysisProgress from "@/components/AnalysisProgress";

export default function ResultsPage() {
  const { measured, analyzing, answers, climate, frontUrl, photos, history, reset } = useApp();
  const porosity = porosityFrom(answers);
  const profile = useMemo(() => (measured ? { measured, porosity, climate } : null), [measured, porosity, climate]);

  if (!measured || !profile)
    return (
      <>
        <Stepper current={2} canVisit={(i) => i < 2} />
        <div className="mx-auto max-w-xl px-4 py-16 text-center" role="status">
          {analyzing ? (
            <div className="text-left">
              <AnalysisProgress />
              <p className="mt-3 text-sm text-muted text-center">Usually 20–40 seconds. Results open automatically.</p>
            </div>
          ) : (
            <>
              <h1 className="h2">No results yet</h1>
              <p className="mt-2 text-muted">Start a scan, or explore a sample result first.</p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/scan" className="btn-primary">Start free scan</Link>
                <Link href="/quick" className="btn-ghost">No-photo check</Link>
                <Link href="/samples" className="btn-ghost">See a sample</Link>
              </div>
            </>
          )}
        </div>
      </>
    );

  const self = measured.source === "self";
  const front = photos.front?.url || frontUrl || "";
  const blob = photos.front?.blob || (frontUrl ? dataUrlToBlob(frontUrl) : null);
  return (
    <>
      {!self && <Stepper current={2} canVisit={(i) => i < 2} />}
      <Results
        title={self ? "Your hair profile · self-reported" : "Your hair profile"}
        profile={profile}
        frontUrl={front}
        frontBlob={blob}
        history={history}
        retakeHref="/scan"
        retakeLabel={self ? "Take the photo scan" : "Retake photos"}
        editDetailsHref={self ? "/quick" : "/scan/details"}
        onRestart={reset}
      />
    </>
  );
}
