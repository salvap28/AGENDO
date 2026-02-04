export function CoachError() {
  return (
    <div className="rounded-2xl border border-rose-200/30 bg-[radial-gradient(circle_at_15%_20%,rgba(244,63,94,0.22),transparent_32%),rgba(15,7,16,0.82)] p-6 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
      <h3 className="text-lg font-semibold text-white">No pudimos obtener el coach</h3>
      <p className="mt-2 text-sm text-white/80">
        Reintentá en unos segundos o verifica tu conexión con el servidor de Ollama.
      </p>
    </div>
  );
}
