"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Quiz from "@/components/Quiz";
import { useApp } from "@/components/AppState";
import { Stepper } from "@/components/Shell";

export default function DetailsPage() {
  const router = useRouter();
  const { answers, setAnswers, climate, setClimate, analyzing, measured, error, startAnalysis, photos } = useApp();
  const [waiting, setWaiting] = useState(false);
  const hasPhotos = Object.keys(photos).length === 4;

  useEffect(() => {
    if (waiting && !analyzing && measured) router.push("/results");
    if (waiting && !analyzing && error) setWaiting(false);
  }, [waiting, analyzing, measured, error, router]);

  if (!hasPhotos && !measured && !analyzing)
    return (
      <>
        <Stepper current={1} canVisit={(i) => i === 0} />
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="h2">Photos first</h1>
          <p className="mt-2 text-muted">We need your four photos before this step.</p>
          <Link href="/scan" className="btn-primary mt-6">Go to photos</Link>
        </div>
      </>
    );

  return (
    <>
      <Stepper current={1} canVisit={(i) => i === 0 || (i === 2 && !!measured)} />
      {error && (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6" role="alert">
          <div className="rounded-xl border border-clay/40 bg-clay-soft p-4 text-sm">
            <p className="font-medium text-clay">The hair analysis failed</p>
            <p className="mt-1">{error}</p>
            <div className="mt-3 flex gap-2">
              {hasPhotos && <button className="btn-ghost !py-1.5" onClick={startAnalysis}>Try again</button>}
              <Link className="btn-ghost !py-1.5" href="/scan">Retake photos</Link>
            </div>
          </div>
        </div>
      )}
      <Quiz
        answers={answers}
        setAnswers={setAnswers}
        climate={climate}
        setClimate={setClimate}
        analyzing={analyzing}
        waiting={waiting}
        onBack={() => router.push("/scan")}
        onDone={() => (analyzing ? setWaiting(true) : measured ? router.push("/results") : null)}
      />
    </>
  );
}
