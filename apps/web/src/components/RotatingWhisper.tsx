'use client';
import { useEffect, useState } from 'react';

const PHRASES = [
  'Un paso a la vez.',
  'Tu descanso también cuenta.',
  'Lo importante es sostener el ritmo.',
  'Menos ruido, más claridad.'
];

export default function RotatingWhisper({ className = '' }: { className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % PHRASES.length), 5000);
    return () => clearInterval(id);
  }, []);
  return <p className={`text-white/55 italic ${className}`}>{PHRASES[i]}</p>;
}
