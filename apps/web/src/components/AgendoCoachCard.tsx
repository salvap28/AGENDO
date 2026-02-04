import type { CoachResponse, WeeklyInsightsResponse } from '@/lib/api/coach';
import { motion } from 'framer-motion';

type AgendoCoachCardProps = {
  data: CoachResponse | WeeklyInsightsResponse;
};

/**
 * Verifica si los datos son del formato nuevo (WeeklyInsightsResponse)
 */
function isWeeklyInsights(data: CoachResponse | WeeklyInsightsResponse): data is WeeklyInsightsResponse {
  return 'analisis' in data;
}

export function AgendoCoachCard({ data }: AgendoCoachCardProps) {
  // Si es el formato nuevo, adaptarlo
  if (isWeeklyInsights(data)) {
    return (
      <motion.div
        className="profile-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="profile-card__head">
          <div>
            <p className="profile-label">Análisis semanal</p>
          </div>
        </div>

        <div className="coach-analysis">
          <p>{data.analisis}</p>
        </div>

        <div className="coach-section">
          <p className="profile-label">Recomendaciones</p>
          <ul className="coach-list">
            {data.recomendaciones.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {data.mantener && (
          <div className="coach-section coach-section--highlight">
            <p className="profile-label">Seguí haciendo esto</p>
            <p className="coach-highlight">{data.mantener}</p>
          </div>
        )}

        {data.preguntaReflexion && (
          <div className="coach-section coach-section--reflection">
            <p className="profile-label">Pregunta de reflexión</p>
            <p className="coach-reflection">{data.preguntaReflexion}</p>
          </div>
        )}
      </motion.div>
    );
  }

  // Formato antiguo (CoachResponse) - mantener compatibilidad
  return (
    <motion.div
      className="profile-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="profile-card__head">
        <div>
          <p className="profile-label">Análisis semanal</p>
        </div>
      </div>

      <div className="coach-analysis">
        <p>{data.weeklySummaryText}</p>
      </div>

      <div className="coach-section">
        <p className="profile-label">Insights de la semana</p>
        <ul className="coach-list">
          {data.insights.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="coach-section">
        <p className="profile-label">Recomendaciones</p>
        <ul className="coach-list">
          {data.recommendations.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>

      {data.reflectionQuestion && (
        <div className="coach-section coach-section--reflection">
          <p className="profile-label">Pregunta de reflexión</p>
          <p className="coach-reflection">{data.reflectionQuestion}</p>
        </div>
      )}
    </motion.div>
  );
}
