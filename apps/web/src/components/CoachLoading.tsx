type CoachLoadingProps = {
  progress?: number;
};

export function CoachLoading({ progress }: CoachLoadingProps) {
  const shimmer = 'animate-pulse bg-white/10';
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  const bars = [100, 82, 94, 88, 97, 72];
  return (
    <div className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_15%_20%,rgba(123,108,255,0.14),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(86,225,233,0.14),transparent_30%),rgba(7,11,24,0.82)] p-6 backdrop-blur-2xl shadow-[0_24px_90px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Agendo AI Coach</p>
          <p className="text-xs text-white/65">Generando tu resumen personalizado...</p>
        </div>
        <div className="text-xs text-white/70">{pct ? `${Math.round(pct)}%` : 'Procesando'}</div>
      </div>

      {pct ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 transition-all duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {bars.map((w, idx) => (
            <div key={idx} className={`${shimmer} h-3 rounded-full`} style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      <div className="mt-5 space-y-1 text-xs text-white/65">
        <p>Agendo está procesando tu semana con el modelo local (Ollama).</p>
        <p>Puede demorar unos segundos. Te avisamos apenas esté listo.</p>
      </div>
    </div>
  );
}
