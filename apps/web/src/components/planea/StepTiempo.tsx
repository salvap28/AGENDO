'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePlanStore, type TiempoDisponible } from '@/stores/planStore';

export default function StepTiempo() {
  const { tiempoDisponible, tiempoParcialDesde, tiempoParcialHasta, setTiempoDisponible } = usePlanStore();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [desde, setDesde] = useState(tiempoParcialDesde || '09:00');
  const [hasta, setHasta] = useState(tiempoParcialHasta || '18:00');

  const opciones: { value: TiempoDisponible; label: string; emoji: string }[] = [
    { value: 'mañana', label: 'Mañana', emoji: '🌅' },
    { value: 'tarde', label: 'Tarde', emoji: '☀️' },
    { value: 'noche', label: 'Noche', emoji: '🌙' },
    { value: 'todo-el-dia', label: 'Todo el día', emoji: '📅' },
    { value: 'parcial', label: 'Parcial', emoji: '⏰' },
  ];

  const handleSelect = (value: TiempoDisponible) => {
    if (value === 'parcial') {
      setShowTimePicker(true);
      setTiempoDisponible(value, desde, hasta);
    } else {
      setShowTimePicker(false);
      setTiempoDisponible(value);
    }
  };

  const handleTimeChange = () => {
    if (desde && hasta && desde < hasta) {
      setTiempoDisponible('parcial', desde, hasta);
    }
  };

  return (
    <div className="plan-step">
      <h2 className="plan-step-title">¿Cuánto tiempo tenés disponible?</h2>
      <p className="plan-step-subtitle">Elegí el período del día que querés planificar</p>

      <div className="plan-options-grid">
        {opciones.map((opcion) => (
          <motion.button
            key={opcion.value}
            type="button"
            className={`plan-option ${tiempoDisponible === opcion.value ? 'is-active' : ''}`}
            onClick={() => handleSelect(opcion.value)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="plan-option-emoji">{opcion.emoji}</span>
            <span className="plan-option-label">{opcion.label}</span>
          </motion.button>
        ))}
      </div>

      {showTimePicker && tiempoDisponible === 'parcial' && (
        <motion.div
          className="plan-time-picker"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="plan-time-inputs">
            <div className="plan-time-input-group">
              <label>Desde</label>
              <input
                type="time"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  if (e.target.value < hasta) {
                    setTiempoDisponible('parcial', e.target.value, hasta);
                  }
                }}
                className="plan-time-input"
              />
            </div>
            <div className="plan-time-input-group">
              <label>Hasta</label>
              <input
                type="time"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value);
                  if (desde < e.target.value) {
                    setTiempoDisponible('parcial', desde, e.target.value);
                  }
                }}
                className="plan-time-input"
              />
            </div>
          </div>
          {desde >= hasta && (
            <p className="plan-time-error">El horario de inicio debe ser anterior al de fin</p>
          )}
        </motion.div>
      )}
    </div>
  );
}











