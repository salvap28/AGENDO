'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import IntelligentPlanningWizard from '@/components/planea/intelligent/IntelligentPlanningWizard';

export default function IntelligentPlanningPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleComplete = () => {
    router.push('/calendario');
  };

  const handleCancel = () => {
    if (sessionId) {
      // Opcional: limpiar sesión en backend
      // await api.delete(`/ai/intelligent-planning/${sessionId}`);
    }
    router.back();
  };

  return (
    <main className="intelligent-planning-page">
      <div className="intelligent-planning-page__container">
        <IntelligentPlanningWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          onSessionCreated={setSessionId}
        />
      </div>
    </main>
  );
}

