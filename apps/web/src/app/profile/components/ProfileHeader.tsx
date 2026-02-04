'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import clsx from 'clsx';

export type ProfileStats = {
  currentStreakDays: number;
  focusTimeThisWeekMinutes: number;
  memberSince: string; // ISO date
};

export type ProfileUser = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export function ProfileHeader({ user, stats }: { user: ProfileUser; stats: ProfileStats }) {
  const initials = user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
  const focusLabel = minutesToLabel(stats.focusTimeThisWeekMinutes);
  const memberDate = new Date(stats.memberSince).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
  const hasAvatar = Boolean(user.avatarUrl);

  return (
    <motion.section
      className="profile-card profile-card--hero"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="profile-hero">
        <div className="profile-identity">
          <p className="profile-kicker">Vos en Agendo</p>
          <h1>{user.name || user.email}</h1>
          <p className="profile-sub">Construyendo consistencia desde {memberDate}</p>
        </div>
        <div className="profile-quick">
          <StreakBadge days={stats.currentStreakDays} />
          <QuickStat label="Concentración semanal" value={focusLabel} tone="teal" />
        </div>
      </div>
    </motion.section>
  );
}

function QuickStat({ label, value, tone }: { label: string; value: string; tone?: 'teal' | 'violet' }) {
  return (
    <div className={clsx('quick-stat', tone && `quick-stat--${tone}`)}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function StreakBadge({ days }: { days: number }) {
  // Determinar el nivel de racha basado en los días
  const getStreakLevel = (days: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' => {
    if (days === 0) return 'bronze';
    if (days >= 1 && days <= 3) return 'bronze';
    if (days >= 4 && days <= 7) return 'silver';
    if (days >= 8 && days <= 14) return 'gold';
    if (days >= 15 && days <= 30) return 'platinum';
    return 'diamond'; // 31+ días
  };

  const level = getStreakLevel(days);
  
  return (
    <div className={`streak-badge streak-badge--${level}`}>
      <div className={`streak-glow streak-glow--${level}`} />
      <div className={`streak-ring streak-ring--${level}`}>
        <span className="streak-value">{days}</span>
        <span className="streak-label">días</span>
      </div>
      <p className="streak-caption">Racha activa</p>
    </div>
  );
}

function minutesToLabel(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!total) return '0 min';
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}
