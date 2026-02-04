'use client';
import { useEffect, useState } from 'react';

export default function VoiceWave({ active=false }: { active?: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(()=> setPhase(p=> (p+1)%100), 100);
    return ()=> clearInterval(id);
  }, [active]);
  const bars = Array.from({length: 24});
  return (
    <div className="flex items-end gap-1 h-20">
      {bars.map((_, i) => {
        const height = 20 + 40 * Math.abs(Math.sin((i + phase/4) * 0.5));
        return <div key={i} className="w-1.5 rounded bg-white/70 animate-wave" style={{ height }} />;
      })}
    </div>
  );
}
