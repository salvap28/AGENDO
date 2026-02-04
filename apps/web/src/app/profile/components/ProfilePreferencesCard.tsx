'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import NotificationsToggle from '@/components/NotificationsToggle';

export type NotificationPreferences = {
  preBlockReminderMinutes: 5 | 10 | 15;
  dailyCheckInReminderTime: string;
  nudgeStyle: 'soft' | 'motivational' | 'disciplined';
};

export type UserPreferences = {
  notifications: NotificationPreferences;
};

export function ProfilePreferencesCard({
  initial,
  onSave,
}: {
  initial: UserPreferences;
  onSave: (prefs: UserPreferences) => Promise<void>;
}) {
  const [prefs, setPrefs] = useState<UserPreferences>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof UserPreferences>(section: K, data: Partial<UserPreferences[K]>) => {
    setPrefs((prev) => ({ ...prev, [section]: { ...(prev[section] as any), ...data } }));
    setSaved(false);
  };

  const savePrefs = async () => {
    setSaving(true);
    await onSave(prefs).catch(() => { });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.section
      className="profile-card profile-card--prefs"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="profile-card__head">
        <div>
          <p className="profile-label">Preferencias</p>
          <h3>Notificaciones</h3>
        </div>
        <button className="profile-save" onClick={savePrefs} disabled={saving}>
          {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
      </div>

      <div className="pref-grid">
        <div className="pref-block">
          <div className="chip-row">
            {[5, 10, 15].map((min) => (
              <button
                key={min}
                className={clsx('pill', prefs.notifications.preBlockReminderMinutes === min && 'is-active')}
                onClick={() => update('notifications', { preBlockReminderMinutes: min as any })}
              >
                {min} min antes del bloque
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <p className="pref-title" style={{ marginBottom: 8 }}>Estado de notificaciones</p>
            <NotificationsToggle />
          </div>

          <div className="time-control">
            <div>
              <p className="pref-title">Hora de recordatorio diario</p>
              <span className="time-display">{prefs.notifications.dailyCheckInReminderTime}</span>
            </div>
            <div className="time-buttons">
              <button
                type="button"
                className="pill ghost"
                onClick={() => update('notifications', { dailyCheckInReminderTime: addMinutes(prefs.notifications.dailyCheckInReminderTime, 30) })}
              >
                +30m
              </button>
              <button
                type="button"
                className="pill ghost"
                onClick={() => update('notifications', { dailyCheckInReminderTime: addMinutes(prefs.notifications.dailyCheckInReminderTime, -30) })}
              >
                -30m
              </button>
            </div>
          </div>
          <div className="chip-row">
            {(['soft', 'motivational', 'disciplined'] as const).map((style) => (
              <button
                key={style}
                className={clsx('pill', prefs.notifications.nudgeStyle === style && 'is-active')}
                onClick={() => update('notifications', { nudgeStyle: style })}
              >
                {style === 'soft' ? 'Soft' : style === 'motivational' ? 'Motivador' : 'Disciplinado'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}


function addMinutes(time: string, delta: number) {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  const total = (h * 60 + m + delta + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

