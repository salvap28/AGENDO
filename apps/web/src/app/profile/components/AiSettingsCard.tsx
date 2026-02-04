'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export type AiTone = 'warm' | 'neutral' | 'direct';
export type AiInterventionLevel = 'low' | 'medium' | 'high';

export type AiSettings = {
  tone: AiTone;
  interventionLevel: AiInterventionLevel;
  dailyReflectionQuestionEnabled: boolean;
};

export function AiSettingsCard({ initial, onSave }: { initial: AiSettings; onSave: (v: AiSettings) => Promise<void> }) {
  const [settings, setSettings] = useState<AiSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (data: Partial<AiSettings>) => {
    setSettings((prev) => ({ ...prev, ...data }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await onSave(settings).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.section className="profile-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="profile-card__head">
        <div>
          <p className="profile-label">Agendo AI</p>
          <h3>Configuración de IA</h3>
        </div>
        <button className="profile-save" onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar'}
        </button>
      </div>

      <div className="ai-grid">
        <div className="pref-block">
          <p className="pref-title">Tono</p>
          <div className="chip-row">
            {(['warm', 'neutral', 'direct'] as const).map((tone) => (
              <button
                key={tone}
                className={clsx('pill', settings.tone === tone && 'is-active')}
                onClick={() => update({ tone })}
              >
                {tone === 'warm' ? 'Cálido' : tone === 'neutral' ? 'Neutral' : 'Directo'}
              </button>
            ))}
          </div>
        </div>

        <div className="pref-block">
          <p className="pref-title">Intervención</p>
          <div className="chip-row">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                className={clsx('pill', settings.interventionLevel === level && 'is-active')}
                onClick={() => update({ interventionLevel: level })}
              >
                {level === 'low'
                  ? 'Solo cuando interactúo'
                  : level === 'medium'
                    ? 'Sugerir bloques en huecos'
                    : 'Reprogramar proactivamente'}
              </button>
            ))}
          </div>
        </div>

        <div className="pref-block">
          <p className="pref-title">Reflexión diaria</p>
          <button
            type="button"
            className={clsx('pill', settings.dailyReflectionQuestionEnabled && 'is-active')}
            onClick={() => update({ dailyReflectionQuestionEnabled: !settings.dailyReflectionQuestionEnabled })}
          >
            {settings.dailyReflectionQuestionEnabled ? 'Activado' : 'Desactivado'}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
