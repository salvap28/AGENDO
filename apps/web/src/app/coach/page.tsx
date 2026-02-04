import dynamic from 'next/dynamic';

const CoachPageClient = dynamic(() => import('./CoachPageClient'), { ssr: false });

export default function CoachPage() {
  return <CoachPageClient />;
}
