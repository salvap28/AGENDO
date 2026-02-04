'use client';
import { useState } from 'react';

export default function TryAI() {
  const [q, setQ] = useState('');
  return (
    <section className="panel p-6 md:p-8">
      <label className="block text-sm text-white/60 mb-3">Probar Agendo IA</label>
      <div className="flex gap-3">
        <input className="input flex-1" placeholder="Preguntale algo a Agendo IA..." value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn-primary">Enviar</button>
      </div>
    </section>
  );
}
