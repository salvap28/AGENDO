'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type PlanFeedback = {
  id: string;
  liked: boolean;
  comment: string | null;
  planData: any;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<PlanFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeedbacks = async () => {
      try {
        setLoading(true);
        const response = await api.get('/plan/feedbacks');
        setFeedbacks(response.data.feedbacks || []);
        setError(null);
      } catch (err: any) {
        console.error('Error cargando feedbacks:', err);
        if (err.response?.status === 403) {
          setError('No tenés permisos para acceder a esta página. Solo el desarrollador puede ver los feedbacks.');
        } else {
          setError('No se pudieron cargar los feedbacks');
        }
      } finally {
        setLoading(false);
      }
    };

    loadFeedbacks();
  }, []);

  const likedCount = feedbacks.filter(f => f.liked).length;
  const dislikedCount = feedbacks.filter(f => !f.liked).length;

  if (loading) {
    return (
      <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: '24px' }}>Feedbacks de Planes</h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Cargando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: '24px' }}>Feedbacks de Planes</h1>
        <p style={{ color: '#ff6b9d' }}>{error}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginBottom: '8px' }}>Feedbacks de Planes</h1>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px' }}>
        Total: {feedbacks.length} feedbacks
      </p>

      {/* Estadísticas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'rgba(86, 225, 233, 0.1)',
          border: '1px solid rgba(86, 225, 233, 0.3)',
        }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#56E1E9', marginBottom: '4px' }}>
            {likedCount}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>Me gustó</div>
        </div>
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'rgba(255, 107, 157, 0.1)',
          border: '1px solid rgba(255, 107, 157, 0.3)',
        }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#ff6b9d', marginBottom: '4px' }}>
            {dislikedCount}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>No me gustó</div>
        </div>
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
            {feedbacks.filter(f => f.comment).length}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>Con comentarios</div>
        </div>
      </div>

      {/* Lista de feedbacks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {feedbacks.map((feedback) => (
          <div
            key={feedback.id}
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${feedback.liked ? 'rgba(86, 225, 233, 0.3)' : 'rgba(255, 107, 157, 0.3)'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '20px' }}>{feedback.liked ? '👍' : '👎'}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    {feedback.user.name || feedback.user.email}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {new Date(feedback.createdAt).toLocaleString('es-AR')}
                </div>
              </div>
            </div>
            {feedback.comment && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '14px',
                lineHeight: '1.5',
              }}>
                {feedback.comment}
              </div>
            )}
          </div>
        ))}
      </div>

      {feedbacks.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px', 
          color: 'rgba(255, 255, 255, 0.5)' 
        }}>
          No hay feedbacks aún
        </div>
      )}
    </main>
  );
}

