"use client";
// No-photo route: for people who can't or don't want to share selfies (privacy, no camera, head covering).
// Self-reported answers stand in for the YouCam measurements; the rest of the plan works the same and is
// clearly labelled as lower confidence.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Quiz from "@/components/Quiz";
import { useApp } from "@/components/AppState";
import { FlowNav } from "@/components/Shell";
import { TYPE_MAPPINGS } from "@/lib/rules";
import { Choice, CURLS, DENSITY, FRIZZ, LENGTHS, selfMeasured, Strand } from "@/components/SelfReport";

export default function QuickPage() {
  const router = useRouter();
  const { answers, setAnswers, climate, setClimate, setSelfMeasured } = useApp();
  const [step, setStep] = useState<0 | 1>(0);
  const [curl, setCurl] = useState<number | null>(null);
  const [frizz, setFrizz] = useState<number | null>(null);
  const [dens, setDens] = useState<number | null>(null);
  const [len, setLen] = useState<number | null>(null);
  const answered = [curl, frizz, dens, len].filter((x) => x !== null).length;

  function finish() {
    setSelfMeasured(selfMeasured(curl!, frizz!, dens!, len!));
    router.push("/results");
  }

  const Progress = (
    <nav aria-label="No-photo check progress" className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
      <p className="text-sm text-muted">
        <span className="chip mr-2">No-photo check</span> Step {step + 1} of 2 · {step === 0 ? "Your hair" : "Porosity & weather"}
      </p>
    </nav>
  );

  if (step === 1)
    return (
      <>
        {Progress}
        <Quiz
          answers={answers}
          setAnswers={setAnswers}
          climate={climate}
          setClimate={setClimate}
          analyzing={false}
          status={<p className="text-sm text-muted">Your hair answers are saved. Two more things and your plan is ready.</p>}
          backLabel="Your hair"
          onBack={() => setStep(0)}
          onDone={finish}
        />
      </>
    );

  return (
    <>
      {Progress}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
        <h1 className="h2">Tell us about your hair</h1>
        <p className="mt-2 max-w-2xl text-ink/75">
          No camera, no photos stored — just four quick picks. Answers are less precise than the AI measurement, so your plan will be
          marked as <b>self-reported</b>. You can take the <Link href="/scan" className="text-teal underline">4-photo scan</Link> any time.
        </p>

        <div className="mt-8 space-y-8">
          <fieldset>
            <legend className="font-medium text-lg">1. Which looks most like your hair when it dries naturally?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CURLS.map((c, i) => (
                <Choice key={c.label} selected={curl === i} onClick={() => setCurl(i)} label={c.label} sub={`${c.sub} · ${TYPE_MAPPINGS[c.idx].toUpperCase()}`}>
                  <Strand amp={c.amp} freq={c.freq} />
                </Choice>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-medium text-lg">2. How frizzy is it on a normal day?</legend>
            <div className="mt-3 grid gap-2 grid-cols-2 lg:grid-cols-4">
              {FRIZZ.map((f, i) => <Choice key={f.label} selected={frizz === i} onClick={() => setFrizz(i)} label={f.label} sub={f.sub} />)}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-medium text-lg">3. When you part your hair, how easily can you see your scalp?</legend>
            <div className="mt-3 grid gap-2 grid-cols-2 lg:grid-cols-4">
              {DENSITY.map((d, i) => <Choice key={d.label} selected={dens === i} onClick={() => setDens(i)} label={d.label} sub={d.sub} />)}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-medium text-lg">4. How long is it?</legend>
            <div className="mt-3 grid gap-2 grid-cols-2 lg:grid-cols-4">
              {LENGTHS.map((l, i) => <Choice key={l.label} selected={len === i} onClick={() => setLen(i)} label={l.label} sub={l.sub} />)}
            </div>
          </fieldset>
        </div>
      </section>
      <FlowNav
        back={() => router.push("/")}
        backLabel="Home"
        next={() => {
          setStep(1);
          window.scrollTo({ top: 0 });
        }}
        nextDisabled={answered < 4}
        nextLabel={answered < 4 ? `${answered} of 4 answered` : "Next: porosity →"}
        hint={answered < 4 ? "Pick one option in each group." : "Ready."}
      />
    </>
  );
}
