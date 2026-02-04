'use client';
import { useState } from "react";

export default function NewBlockPanel({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState("Bloque");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      // ← conecta tu API aquí (fetch POST /blocks…)
      onCreated?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card p-4">
      <div className="text-ink/90 text-lg font-semibold mb-3">Nuevo bloque</div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,170px,120px,120px,110px]">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />

        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />

        <button className="btn-primary" onClick={create} disabled={loading}>
          {loading ? "Creando…" : "Crear"}
        </button>
      </div>

      <p className="mt-2 text-sub">Foco sostenible: planificá sin fricción.</p>
    </section>
  );
}
