"use client";
// "How we measured this": the real YouCam call trace (APIs, inputs, auto-framing attempts, timings)
// plus the downstream pipeline, so users and judges can see exactly what produced the result.
import type { Measured } from "@/lib/types";

const OUTCOME: Record<string, string> = {
  success: "accepted",
  error_face_position_too_small: "face too small → cropped tighter",
  error_face_position_out_of_boundary: "face too large → cropped looser",
  error_face_angle_invalid: "angle rejected → tried next framing",
  error_mismatch_image_size: "photo sizes differed",
  error_no_face: "no face found",
};

export default function TracePanel({ measured }: { measured: Measured }) {
  const trace = measured.trace || [];
  const calls = trace.reduce((a, t) => a + t.attempts.length, 0);
  const recovered = trace.filter((t) => t.attempts.length > 1 && t.attempts.at(-1)?.outcome === "success").length;
  const slowest = Math.max(0, ...trace.map((t) => t.attempts.reduce((a, x) => a + x.ms, 0)));

  return (
    <section aria-labelledby="trace-title" className="card p-5">
      <h2 id="trace-title" className="text-lg font-medium">How we measured this</h2>
      <p className="mt-1 text-sm text-ink/75">
        Your photos go through four YouCam Hair AI detectors. StrandLab auto-frames each photo to what the detector expects and
        retries if a framing is rejected (rejected attempts are not billed).
      </p>

      {/* Pipeline */}
      <ol className="mt-4 grid gap-2 sm:grid-cols-4 text-sm" aria-label="Pipeline">
        {[
          ["1", "4 photos", "MediaPipe face box in your browser"],
          ["2", "4 YouCam detectors", "type · frizz · density · length"],
          ["3", "Rule engine", "+ porosity quiz + live dew point"],
          ["4", "Products & preview", "scoring · YouCam hair try-on"],
        ].map(([n, t, d]) => (
          <li key={n} className="rounded-xl bg-shell/70 px-3 py-2.5">
            <span className="text-xs font-semibold text-teal-dark">Step {n}</span>
            <span className="block font-medium">{t}</span>
            <span className="block text-xs text-muted">{d}</span>
          </li>
        ))}
      </ol>

      {trace.length > 0 ? (
        <>
          <p className="mt-4 text-sm">
            <b>{calls}</b> YouCam calls · <b>{recovered}</b> {recovered === 1 ? "photo" : "photos"} rescued by auto-framing · slowest detector{" "}
            <b>{(slowest / 1000).toFixed(1)}s</b>
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">YouCam API calls</caption>
              <thead>
                <tr className="text-left text-xs text-muted border-b border-line">
                  <th scope="col" className="py-2 pr-3 font-medium">YouCam API</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Photos used</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {trace.map((t) => (
                  <tr key={t.api} className="border-b border-line/60 align-top">
                    <td className="py-2.5 pr-3"><span className="font-medium">{t.api}</span><span className="block text-xs text-muted">{t.detector}</span></td>
                    <td className="py-2.5 pr-3 text-ink/80">{t.input}</td>
                    <td className="py-2.5 pr-3">
                      <ol className="space-y-1">
                        {t.attempts.map((a, i) => (
                          <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                            <span className={a.outcome === "success" ? "text-teal-dark font-medium" : "text-amber"}>{a.outcome === "success" ? "✓" : "↻"}</span>
                            <span>{a.variant}</span>
                            <span className="text-muted">— {OUTCOME[a.outcome] || a.outcome} · {(a.ms / 1000).toFixed(1)}s</span>
                          </li>
                        ))}
                      </ol>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        Object.keys(measured.framing).length > 0 && (
          <p className="mt-4 receipt">{Object.entries(measured.framing).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
        )
      )}
    </section>
  );
}
