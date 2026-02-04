'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export type AccountData = {
  name: string;
  email: string;
  language: string;
  timezone: string;
  integrations?: { id: string; name: string; connected: boolean }[];
};

export function AccountSettingsCard({
  account,
  onUpdate,
  onExport,
  onDelete,
  onLogout,
}: {
  account: AccountData;
  onUpdate: (data: AccountData) => Promise<void>;
  onExport: () => Promise<void>;
  onDelete: () => Promise<void>;
  onLogout: () => void;
}) {
  const [data, setData] = useState<AccountData>(account);
  const [saving, setSaving] = useState(false);
  const [danger, setDanger] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(data).catch(() => {});
    setSaving(false);
  };

  return (
    <motion.section className="profile-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="profile-card__head">
        <div>
          <p className="profile-label">Cuenta</p>
          <h3>Datos y privacidad</h3>
        </div>
        <button className="profile-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="account-grid">
        <label className="input-label glass-input">
          <span>Nombre</span>
          <input value={data.name} onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))} />
        </label>
        <label className="input-label glass-input">
          <span>Email</span>
          <input value={data.email} onChange={(e) => setData((p) => ({ ...p, email: e.target.value }))} />
        </label>
        <div className="pref-block">
          <p className="pref-title">Idioma</p>
          <div className="chip-row">
            {['es', 'en'].map((lang) => (
              <button
                key={lang}
                className={clsx('pill', data.language === lang && 'is-active')}
                onClick={() => setData((p) => ({ ...p, language: lang }))}
              >
                {lang === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>
        </div>
        <div className="pref-block">
          <p className="pref-title">Zona horaria</p>
          <div className="chip-row">
            {['America/Argentina/Buenos_Aires', 'UTC', 'America/Mexico_City'].map((tz) => (
              <button
                key={tz}
                className={clsx('pill', data.timezone === tz && 'is-active')}
                onClick={() => setData((p) => ({ ...p, timezone: tz }))}
              >
                {tz}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.integrations?.length ? (
        <div className="integrations">
          <p className="profile-label">Integraciones</p>
          <div className="chip-row">
            {data.integrations.map((int) => (
              <span key={int.id} className={clsx('pill', int.connected && 'is-active')}>
                {int.name} {int.connected ? 'conectado' : 'desconectado'}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="account-actions">
        <button className="profile-save ghost" onClick={onExport}>
          Exportar datos
        </button>
        <button className="profile-save ghost" onClick={onLogout}>
          Cerrar sesión
        </button>
        <button className="profile-save danger" onClick={() => setDanger(true)}>
          Borrar cuenta
        </button>
      </div>

      {danger ? (
        <div className="confirm-overlay" onClick={(e) => e.target === e.currentTarget && setDanger(false)}>
          <div className="confirm-sheet" role="dialog" aria-modal="true">
            <header className="confirm-head">
              <p className="confirm-title">¿Eliminar cuenta?</p>
              <p className="confirm-sub">Esta acción es irreversible. Exportá tus datos antes.</p>
            </header>
            <div className="confirm-actions">
              <button className="confirm-btn ghost" onClick={() => setDanger(false)}>
                Cancelar
              </button>
              <button
                className={clsx('confirm-btn danger')}
                onClick={async () => {
                  await onDelete().catch(() => {});
                  setDanger(false);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}
