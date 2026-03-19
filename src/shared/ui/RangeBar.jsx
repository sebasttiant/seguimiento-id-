import React, { useMemo } from "react";

export default function RangeBar({ min, max, current }) {
  const hasAll = typeof min === "number" && typeof max === "number" && typeof current === "number" && max > min;
  const pct = useMemo(() => {
    if (!hasAll) return 0;
    const raw = ((current - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, raw));
  }, [min, max, current, hasAll]);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Mín: {hasAll ? min : "—"}</span>
        <span>Máx: {hasAll ? max : "—"}</span>
      </div>
      <div className="relative mt-2 h-2 w-full rounded-full bg-slate-100">
        {hasAll ? (
          <div className="absolute -top-1 h-4 w-1.5 rounded-full bg-slate-900" style={{ left: `calc(${pct}% - 3px)` }} />
        ) : null}
      </div>
    </div>
  );
}
