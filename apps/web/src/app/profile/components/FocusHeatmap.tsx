import type { FocusHeatmap as FocusHeatmapType } from '@/lib/api/ai';

type FocusHeatmapProps = {
  heatmap: FocusHeatmapType;
};

export function FocusHeatmap({ heatmap }: FocusHeatmapProps) {
  const { days, slots, matrix } = heatmap;
  const maxValue = Math.max(
    0,
    ...matrix.flatMap((row) => row.map((value) => value ?? 0)),
  );
  const firstColumnMinWidth = 96;
  const slotMinWidth = 72;
  const columnsTemplate = `minmax(${firstColumnMinWidth}px, 110px) repeat(${slots.length}, minmax(${slotMinWidth}px, 1fr))`;
  const minGridWidth = firstColumnMinWidth + slots.length * slotMinWidth;

  const cellTone = (value: number): string => {
    if (!maxValue || value <= 0) return 'bg-slate-800/60 border border-slate-700/60';
    const intensity = value / maxValue;
    if (intensity < 0.33) return 'bg-gradient-to-br from-indigo-500/25 to-violet-500/30 border border-violet-300/15 shadow-[0_6px_18px_rgba(99,102,241,0.28)]';
    if (intensity < 0.66) return 'bg-gradient-to-br from-indigo-500/45 to-violet-500/55 border border-violet-200/25 shadow-[0_10px_28px_rgba(99,102,241,0.35)]';
    return 'bg-gradient-to-br from-indigo-400/80 via-violet-500/80 to-fuchsia-500/75 border border-violet-100/35 shadow-[0_14px_32px_rgba(167,139,250,0.5)]';
  };

  const formatMinutes = (value: number): string => `${Math.round(value)} min`;

  return (
    <div className="overflow-x-auto pb-1">
      <div
        className="relative inline-grid min-w-full gap-[6px] rounded-2xl border border-slate-700/70 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.12),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.14),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(17,24,39,0.88))] p-3 shadow-[0_22px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:gap-[8px] sm:p-4"
        style={{ gridTemplateColumns: columnsTemplate, minWidth: `${minGridWidth}px` }}
      >
        <div className="rounded-xl opacity-0" aria-hidden />
        {slots.map((slot) => (
          <div
            key={slot}
            className="rounded-xl bg-slate-900/80 px-2 py-1 text-center text-[9px] font-semibold leading-tight text-white/85 shadow-inner shadow-black/40 ring-1 ring-white/5 sm:px-3 sm:py-2 sm:text-[11px] sm:leading-snug"
          >
            <span className="whitespace-nowrap text-[10px] leading-[1.05] sm:text-[11px] sm:leading-tight">
              {slot}
            </span>
          </div>
        ))}

        {days.map((day, dayIdx) => (
          <div key={day} className="contents">
            <div className="flex items-center justify-end pr-1 text-[11px] font-semibold text-white/90 sm:pr-2 sm:text-sm">
              {day}
            </div>
            {slots.map((_, slotIdx) => {
              const value = matrix[dayIdx]?.[slotIdx] ?? 0;
              return (
                <div
                  key={`${day}-${slotIdx}`}
                  className={`flex h-10 items-center justify-center rounded-xl text-[10px] font-semibold text-white/90 transition-all duration-200 sm:h-11 sm:text-xs ${cellTone(
                    value,
                  )}`}
                  title={formatMinutes(value)}
                >
                  {value > 0 ? Math.round(value) : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
