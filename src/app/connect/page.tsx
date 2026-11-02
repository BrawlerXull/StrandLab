"use client";
// Pop-up opened by the store widget. It runs first-party on StrandLab, so it can read the user's saved profile,
// and it only shares it with the widget (same origin) after the user taps "Share".
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Shell";
import type { Profile } from "@/lib/types";
import { LAST_PROFILE_KEY, RETURN_KEY } from "@/lib/widget";

export default function ConnectPage() {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [hasOpener, setHasOpener] = useState(true);
  useEffect(() => {
    setHasOpener(!!window.opener);
    try {
      sessionStorage.setItem(RETURN_KEY, "connect");
      setProfile(JSON.parse(localStorage.getItem(LAST_PROFILE_KEY) || "null"));
    } catch {
      setProfile(null);
    }
  }, []);

  function share() {
    if (!profile || !window.opener) return;
    window.opener.postMessage({ type: "strandlab:profile", profile }, window.location.origin);
    window.close();
  }

  const m = profile?.measured;
  return (
    <div className="min-h-screen bg-paper px-5 py-6">
      <div className="flex items-center gap-2">
        <Logo className="h-8 w-8" />
        <p className="font-serif text-xl">StrandLab</p>
      </div>
      {profile === undefined ? null : m ? (
        <div className="mt-6">
          <h1 className="font-serif text-2xl leading-tight">Share your hair profile with this shop?</h1>
          <div className="mt-4 card p-4">
            <p className="text-sm font-semibold">{m.type?.mapping.toUpperCase()} · {m.type?.term}</p>
            <p className="mt-1 text-sm text-ink/80">Frizz {m.frizz?.level}/3 · {m.density?.term} · {m.length?.term} · {profile.porosity} porosity</p>
            <p className="mt-1 text-xs text-muted">{m.source === "self" ? "Self-reported" : "Measured with YouCam Hair AI"}</p>
          </div>
          <p className="mt-3 text-xs text-muted">The shop receives your hair type and match scores. Your photos are never shared.</p>
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={share} disabled={!hasOpener} className="btn-primary !py-3">Share with the shop</button>
            <Link href="/scan" className="btn-ghost">Take a new photo scan instead</Link>
            <button onClick={() => window.close()} className="text-sm text-muted underline mt-1">Cancel</button>
          </div>
          {!hasOpener && <p className="mt-3 text-sm text-clay">This window lost its link to the shop. Close it and try again from the shop page.</p>}
        </div>
      ) : (
        <div className="mt-6">
          <h1 className="font-serif text-2xl leading-tight">No StrandLab scan on this device yet</h1>
          <p className="mt-2 text-sm text-ink/75">Take the 4-photo scan (about 2 minutes) — when it&apos;s done, you can send the result straight back to the shop.</p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/scan" className="btn-primary !py-3">Start the photo scan</Link>
            <Link href="/quick" className="btn-ghost">Answer 4 questions instead</Link>
            <button onClick={() => window.close()} className="text-sm text-muted underline mt-1">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
