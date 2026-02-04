'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export type UserGoals = {
  weeklyFocusMinutesGoal: number;
  weeklyBlocksGoal: number;
  weeklyCheckInDaysGoal: number;
  goalsEnabled: boolean;
};

export function ProfileGoalsCard({
  initial,
  onSave,
}: {
  initial: UserGoals;
  onSave: (goals: UserGoals) => Promise<void>;
}) {
  const [goals, setGoals] = useState<UserGoals>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (data: Partial<UserGoals>) => {
    setGoals((prev) => ({ ...prev, ...data }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await onSave(goals).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.section className="profile-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="profile-card__head">
        <div>
          <p className="profile-label">Objetivos personales</p>
          <h3>Tu semana ideal</h3>
        </div>
        <div className="toggle">
          <input
            id="goals-enabled"
            type="checkbox"
            checked={goals.goalsEnabled}
            onChange={(e) => update({ goalsEnabled: e.target.checked })}
          />
          <label htmlFor="goals-enabled">Activar objetivos</label>
        </div>
      </div>
      <div className="goals-grid">
        <GoalStepper
          label="Horas de foco por semana"
          value={Math.round(goals.weeklyFocusMinutesGoal / 60)}
          suffix="h"
          onChange={(val) => update({ weeklyFocusMinutesGoal: val * 60 })}
          disabled={!goals.goalsEnabled}
        />
        <GoalStepper
          label="Bloques completados"
          value={goals.weeklyBlocksGoal}
          onChange={(val) => update({ weeklyBlocksGoal: val })}
          disabled={!goals.goalsEnabled}
        />
        <GoalStepper
          label="Días con check-in"
          value={goals.weeklyCheckInDaysGoal}
          onChange={(val) => update({ weeklyCheckInDaysGoal: val })}
          disabled={!goals.goalsEnabled}
        />
      </div>
      <div className="profile-card__footer">
        <button className="profile-save" onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar objetivos'}
        </button>
      </div>
    </motion.section>
  );
}

function GoalStepper({
  label,
  value,
  onChange,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  const clampVal = (v: number) => Math.max(0, v);
  return (
    <div className="goal-input">
      <span>{label}</span>
      <div className="goal-input__control">
        <button type="button" className="pill ghost" disabled={disabled} onClick={() => onChange(clampVal(value - 1))}>
          -
        </button>
        <span className="goal-value">{value}{suffix ?? ''}</span>
        <button type="button" className="pill ghost" disabled={disabled} onClick={() => onChange(clampVal(value + 1))}>
          +
        </button>
      </div>
    </div>
  );
}
