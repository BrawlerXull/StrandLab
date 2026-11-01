"use client";
import { useState } from "react";

export default function CompareSlider({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const [x, setX] = useState(50);
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-shell select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={afterLabel} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={beforeLabel} className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${x}%` }} />
      <span className="absolute left-2 bottom-2 chip">{beforeLabel}</span>
      <span className="absolute right-2 bottom-2 chip">{afterLabel}</span>
      <input type="range" min={0} max={100} value={x} onChange={(e) => setX(+e.target.value)} aria-label="Compare" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}
