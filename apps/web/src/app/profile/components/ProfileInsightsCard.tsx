'use client';

import { motion } from 'framer-motion';

export type ProfileInsight = { title: string; description: string };

export type ProfileInsights = {
  bestFocusSlot: string;
  strongestDay: string;
  weakestDay: string;
  topCategories: string[];
  recommendations: ProfileInsight[];
};

export function ProfileInsightsCard({ insights }: { insights: ProfileInsights }) {
  return (
    <motion.section
      className="profile-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="profile-card__head">
        <div>
          <p className="profile-label">Tu perfil productivo</p>
          <h3>Insights de Agendo AI</h3>
        </div>
      </div>
      <div className="insights-grid">
        <InsightItem title="Franja de máximo foco" value={insights.bestFocusSlot} />
        <InsightItem title="Día más fuerte" value={insights.strongestDay} tone="teal" />
        <InsightItem title="Día para proteger" value={insights.weakestDay} tone="violet" />
        <InsightItem title="Categorías con mayor consistencia" value={insights.topCategories.join(' · ')} />
      </div>
      <div className="insights-reco">
        <p className="profile-label">Recomendación de la semana</p>
        <ul>
          {insights.recommendations.map((reco) => (
            <li key={reco.title}>
              <strong>{reco.title}:</strong> {reco.description}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}

function InsightItem({ title, value, tone }: { title: string; value: string; tone?: 'teal' | 'violet' }) {
  return (
    <div className="insight-item" data-tone={tone}>
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}
