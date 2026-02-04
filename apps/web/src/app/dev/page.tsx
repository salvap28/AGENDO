'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion } from 'framer-motion';

type FeedbackItem = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  instanceDate: string;
  completedAt: string;
  feeling: string;
  focus: string;
  interrupted: boolean;
  interruptionReason: string | null;
  timeDelta: string;
  note: string | null;
  taskId: string | null;
  blockId: string | null;
};

export default function DevPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notifications' | 'feedback'>('notifications');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [notificationResult, setNotificationResult] = useState<any>(null);

  useEffect(() => {
    if (user && !user.isDev) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (activeTab === 'feedback' && feedback.length === 0) {
      loadFeedback();
    }
  }, [activeTab]);

  const loadFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const response = await api.get('/dev/feedback');
      setFeedback(response.data.feedback || []);
    } catch (error) {
      console.error('Error cargando feedback:', error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      return;
    }

    setSendingNotification(true);
    setNotificationResult(null);
    try {
      const response = await api.post('/notifications/broadcast', {
        title: notificationTitle,
        message: notificationMessage,
      });
      setNotificationResult(response.data);
      setNotificationTitle('');
      setNotificationMessage('');
    } catch (error: any) {
      console.error('Error enviando notificación:', error);
      setNotificationResult({
        error: error?.response?.data?.error || 'Error al enviar notificación',
      });
    } finally {
      setSendingNotification(false);
    }
  };

  if (!user || !user.isDev) {
    return null;
  }

  return (
    <div className="dev-page">
      <div className="dev-container">
        <div className="dev-header">
          <h1 className="dev-title">🛠️ Vista de Dev</h1>
          <p className="dev-subtitle">Herramientas de administración</p>
        </div>

        <div className="dev-tabs">
          <button
            className={`dev-tab ${activeTab === 'notifications' ? 'dev-tab--active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            📢 Notificaciones
          </button>
          <button
            className={`dev-tab ${activeTab === 'feedback' ? 'dev-tab--active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            💬 Feedback de Usuarios
          </button>
        </div>

        <div className="dev-content">
          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="dev-section"
            >
              <h2 className="dev-section-title">Enviar Notificación Broadcast</h2>
              <p className="dev-section-description">
                Enviá una notificación push a todos los usuarios con suscripciones activas.
              </p>

              <div className="dev-form">
                <div className="dev-form-group">
                  <label className="dev-form-label">Título</label>
                  <input
                    type="text"
                    className="dev-form-input"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Ej: 🎉 Nueva Actualización"
                  />
                </div>

                <div className="dev-form-group">
                  <label className="dev-form-label">Mensaje</label>
                  <textarea
                    className="dev-form-textarea"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Escribí el mensaje de la notificación..."
                    rows={6}
                  />
                </div>

                <button
                  className="dev-form-button"
                  onClick={handleSendNotification}
                  disabled={sendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
                >
                  {sendingNotification ? 'Enviando...' : 'Enviar Notificación'}
                </button>

                {notificationResult && (
                  <div className={`dev-result ${notificationResult.error ? 'dev-result--error' : 'dev-result--success'}`}>
                    {notificationResult.error ? (
                      <p>❌ Error: {notificationResult.error}</p>
                    ) : (
                      <div>
                        <p>✅ Notificación enviada exitosamente</p>
                        <p>Total: {notificationResult.total} usuarios</p>
                        <p>Exitosas: {notificationResult.sent}</p>
                        <p>Fallidas: {notificationResult.failed}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'feedback' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="dev-section"
            >
              <div className="dev-feedback-header">
                <h2 className="dev-section-title">Feedback de Usuarios</h2>
                <button
                  className="dev-refresh-button"
                  onClick={loadFeedback}
                  disabled={loadingFeedback}
                >
                  {loadingFeedback ? 'Cargando...' : '🔄 Actualizar'}
                </button>
              </div>

              {loadingFeedback ? (
                <div className="dev-loading">Cargando feedback...</div>
              ) : feedback.length === 0 ? (
                <div className="dev-empty">No hay feedback disponible</div>
              ) : (
                <div className="dev-feedback-list">
                  {feedback.map((item) => (
                    <div key={item.id} className="dev-feedback-item">
                      <div className="dev-feedback-header-item">
                        <div>
                          <div className="dev-feedback-user">
                            {item.userName || item.userEmail}
                          </div>
                          <div className="dev-feedback-date">
                            {new Date(item.completedAt).toLocaleString('es-AR')}
                          </div>
                        </div>
                        <div className="dev-feedback-badges">
                          <span className={`dev-feedback-badge dev-feedback-badge--${item.feeling}`}>
                            {item.feeling}
                          </span>
                          <span className={`dev-feedback-badge dev-feedback-badge--focus-${item.focus}`}>
                            Focus: {item.focus}
                          </span>
                        </div>
                      </div>
                      {item.note && (
                        <div className="dev-feedback-note">
                          <strong>Nota:</strong> {item.note}
                        </div>
                      )}
                      <div className="dev-feedback-meta">
                        <span>Fecha: {item.instanceDate}</span>
                        {item.interrupted && (
                          <span>Interrumpido: {item.interruptionReason || 'Sin razón especificada'}</span>
                        )}
                        <span>Tiempo: {item.timeDelta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}








