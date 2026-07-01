const PLACEHOLDER_BARS = [
  { day: "Mon", pct: 35 },
  { day: "Tue", pct: 52 },
  { day: "Wed", pct: 63 },
  { day: "Thu", pct: 71 },
  { day: "Fri", pct: 18 },
  { day: "Sat", pct: 88 },
  { day: "Sun", pct: 95 },
];

export function EarningsChart() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-base font-bold text-slate-900">Daily Earnings Breakdown</h2>
      <div className="flex h-40 items-end gap-3">
        {PLACEHOLDER_BARS.map(({ day, pct }) => (
          <div key={day} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-lg bg-[#0d1b2a] transition-all"
              style={{ height: `${pct}%` }}
            />
            <span className="text-xs text-slate-400">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
