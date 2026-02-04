'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';

export type FocusDistribution = { day: string; focusMinutes: number };

export type ProfileHabits = {
  avgBlocksPerDay: number;
  completionRatePercent: number;
  focusDistribution: FocusDistribution[];
};

export function ProfileStatsCard({ habits }: { habits: ProfileHabits }) {
  const maxFocus = Math.max(...habits.focusDistribution.map((f) => f.focusMinutes), 60);
  return (
    <motion.section
      className="profile-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="profile-card__head">
        <div>
          <p className="profile-label">Hábitos y ritmo</p>
          <h3>Tu agenda inteligente</h3>
        </div>
      </div>
      <div className="profile-metrics">
        <MetricBlock label="Bloques/día" value={habits.avgBlocksPerDay.toFixed(1)} />
        <MetricBlock label="Tareas completadas" value={`${habits.completionRatePercent.toFixed(0)}%`} tone="teal" />
      </div>
      <div className="focus-chart">
        {habits.focusDistribution.map((item) => {
          const pct = Math.max(8, Math.round((item.focusMinutes / maxFocus) * 100));
          return (
            <div key={item.day} className="focus-bar">
              <div className="focus-bar__label">{item.day}</div>
              <div className="focus-bar__track">
                <div className="focus-bar__fill" style={{ height: `${pct}%` }} />
              </div>
              <div className="focus-bar__value">{Math.round(item.focusMinutes / 60)}h</div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function MetricBlock({ label, value, tone }: { label: string; value: string; tone?: 'teal' | 'violet' }) {
  return (
    <div className={clsx('metric-block', tone && `metric-block--${tone}`)}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
