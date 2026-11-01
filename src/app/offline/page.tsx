import Link from "next/link";

export default function Offline() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="h2">You&apos;re offline</h1>
      <p className="mt-3 text-ink/75">
        Measuring your hair and the coach need an internet connection. Pages you&apos;ve already visited, including sample results, still work offline.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn-primary">Home</Link>
        <Link href="/samples/maya" className="btn-ghost">Sample result</Link>
      </div>
    </div>
  );
}
