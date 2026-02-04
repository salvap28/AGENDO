'use client';
import Link from 'next/link';

export default function CalmLanding(){
  return (
    <section className="relative mx-auto max-w-5xl px-6 pt-8 pb-4">
      <div className="rounded-2xl p-10 md:p-14 ag-card relative">
        <div className="relative">
          <h1 className="text-[44px] md:text-[54px] font-bold tracking-tight">Agendo</h1>
          <p className="mt-3 text-lg text-white/80 max-w-2xl">
            Planificá con calma, sostené el foco y equilibrá el descanso. Estoy con vos, sin juzgar.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/calendar" className="ag-btn-primary">Ir al Calendario</Link>
            <Link href="/stats" className="ag-btn-secondary">Ver estadísticas</Link>
          </div>
        </div>
      </div>
      <div className="mt-6 ag-divider" />
    </section>
  );
}
