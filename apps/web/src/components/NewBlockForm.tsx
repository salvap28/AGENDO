
'use client';
export default function NewBlockForm() {
  return (
    <section className="panel p-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_120px_120px_auto] gap-3">
        <input className="input" placeholder="Nombre del bloque" />
        <input className="input-date" type="date" />
        <input className="input-time" type="time" />
        <input className="input-time" type="time" />
        <button className="btn-primary hover-pulse">Crear</button>
      </div>
    </section>
  );
}
