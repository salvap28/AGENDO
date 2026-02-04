'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePlanStore } from '@/stores/planStore';

export default function StepNotificaciones() {
  const { 
    quiereNotificaciones, 
    cantidadNotificaciones, 
    tiemposNotificaciones,
    setQuiereNotificaciones,
    setCantidadNotificaciones,
    setTiemposNotificaciones,
  } = usePlanStore();

  const [localQuiere, setLocalQuiere] = useState(quiereNotificaciones ?? false);
  // Asegurar que la cantidad siempre sea al menos 1 cuando las notificaciones están activas
  const initialCantidad = quiereNotificaciones && cantidadNotificaciones > 0 ? cantidadNotificaciones : 1;
  const [localCantidad, setLocalCantidad] = useState(initialCantidad);
  const [localTiempos, setLocalTiempos] = useState<number[]>(
    tiemposNotificaciones && tiemposNotificaciones.length > 0 
      ? tiemposNotificaciones.filter(t => t > 0) // Solo tiempos mayores a 0 (excluir "al inicio")
      : [15]
  );
  // Estado separado para "notificar al inicio"
  const [notificarAlInicio, setNotificarAlInicio] = useState(
    tiemposNotificaciones && tiemposNotificaciones.some(t => t === 0)
  );
  // Estado para los valores de los inputs (permite strings vacíos temporalmente)
  const [inputValues, setInputValues] = useState<string[]>(
    localTiempos.map(t => t.toString())
  );

  const handleToggle = (value: boolean) => {
    setLocalQuiere(value);
    setQuiereNotificaciones(value);
    if (!value) {
      setCantidadNotificaciones(0);
      setTiemposNotificaciones([]);
      setNotificarAlInicio(false);
    } else {
      // Cuando se activa, asegurar que la cantidad sea al menos 1
      const cantidadFinal = Math.max(1, localCantidad);
      const tiemposFinal = localTiempos.length > 0 ? localTiempos : [15];
      setLocalCantidad(cantidadFinal);
      setCantidadNotificaciones(cantidadFinal);
      setLocalTiempos(tiemposFinal);
      // Incluir "al inicio" si está activo
      const todosLosTiempos = notificarAlInicio ? [0, ...tiemposFinal] : tiemposFinal;
      setTiemposNotificaciones(todosLosTiempos);
    }
  };

  const handleToggleAlInicio = (value: boolean) => {
    setNotificarAlInicio(value);
    // Actualizar los tiempos en el store
    const todosLosTiempos = value 
      ? [0, ...localTiempos] 
      : localTiempos.filter(t => t > 0);
    setTiemposNotificaciones(todosLosTiempos);
  };

  const handleCantidadChange = (cantidad: number) => {
    // Asegurar que la cantidad nunca sea menor a 1
    if (cantidad < 1) cantidad = 1;
    if (cantidad > 5) cantidad = 5;
    setLocalCantidad(cantidad);
    setCantidadNotificaciones(cantidad);
    
    // Ajustar array de tiempos (solo los de "minutos antes", no "al inicio")
    const nuevosTiempos = [...localTiempos];
    while (nuevosTiempos.length < cantidad) {
      nuevosTiempos.push(15);
    }
    while (nuevosTiempos.length > cantidad) {
      nuevosTiempos.pop();
    }
    // Asegurar que siempre haya al menos 1 tiempo
    if (nuevosTiempos.length === 0) {
      nuevosTiempos.push(15);
    }
    setLocalTiempos(nuevosTiempos);
    // Actualizar también los valores de los inputs
    setInputValues(nuevosTiempos.map(t => t.toString()));
    // Incluir "al inicio" si está activo
    const todosLosTiempos = notificarAlInicio ? [0, ...nuevosTiempos] : nuevosTiempos;
    setTiemposNotificaciones(todosLosTiempos);
  };

  const handleTiempoChange = (index: number, minutos: number) => {
    if (minutos < 1) minutos = 1; // No permitir 0 aquí, solo valores positivos
    if (minutos > 1440) minutos = 1440; // Máximo 24 horas
    const nuevosTiempos = [...localTiempos];
    nuevosTiempos[index] = minutos;
    setLocalTiempos(nuevosTiempos);
    // Actualizar también el valor del input
    const nuevosInputValues = [...inputValues];
    nuevosInputValues[index] = minutos.toString();
    setInputValues(nuevosInputValues);
    // Incluir "al inicio" si está activo
    const todosLosTiempos = notificarAlInicio ? [0, ...nuevosTiempos] : nuevosTiempos;
    setTiemposNotificaciones(todosLosTiempos);
  };

  const handleInputChange = (index: number, value: string) => {
    // Permitir valores vacíos temporalmente
    const nuevosInputValues = [...inputValues];
    nuevosInputValues[index] = value;
    setInputValues(nuevosInputValues);
    
    // Si el valor no está vacío, actualizar el tiempo
    if (value.trim() !== '') {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 1) {
        handleTiempoChange(index, Math.min(numValue, 1440));
      }
    }
  };

  const handleInputBlur = (index: number) => {
    // Cuando pierde el foco, normalizar a 1 si está vacío
    const value = inputValues[index];
    if (value.trim() === '' || isNaN(parseInt(value, 10)) || parseInt(value, 10) < 1) {
      handleTiempoChange(index, 1);
    }
  };

  return (
    <div className="plan-step">
      <h2 className="plan-step-title">¿Querés recibir notificaciones?</h2>
      <p className="plan-step-subtitle">
        Te avisamos antes de que comience cada bloque del plan
      </p>

      <div className="plan-switch-container">
        <span className="plan-switch-label">Notificaciones</span>
        <div
          className={`plan-switch ${localQuiere ? 'is-on' : ''}`}
          onClick={() => handleToggle(!localQuiere)}
        >
          <motion.div
            className="plan-switch-thumb"
            animate={{ x: localQuiere ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
        <span className="plan-switch-label">{localQuiere ? 'Sí' : 'No'}</span>
      </div>

      {localQuiere && (
        <motion.div
          className="plan-notifications-config"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="plan-notifications-quantity">
            <label className="plan-notifications-label">
              Cantidad de notificaciones antes de cada bloque
            </label>
            <div className="plan-quantity-selector">
              <button
                type="button"
                className="plan-quantity-btn"
                onClick={() => handleCantidadChange(localCantidad - 1)}
                disabled={localCantidad <= 1}
              >
                −
              </button>
              <span className="plan-quantity-value">{localCantidad}</span>
              <button
                type="button"
                className="plan-quantity-btn"
                onClick={() => handleCantidadChange(localCantidad + 1)}
                disabled={localCantidad >= 5}
              >
                +
              </button>
            </div>
          </div>

          {/* Sección separada para "Al inicio" */}
          <div className="plan-notifications-at-start" style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <label className="plan-notifications-label" style={{ marginBottom: '4px', display: 'block' }}>
                  Notificar al inicio del bloque
                </label>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>
                  Recibirás una notificación cuando comience cada bloque
                </p>
              </div>
              <div
                className={`plan-switch ${notificarAlInicio ? 'is-on' : ''}`}
                onClick={() => handleToggleAlInicio(!notificarAlInicio)}
                style={{ flexShrink: 0, marginLeft: '16px' }}
              >
                <motion.div
                  className="plan-switch-thumb"
                  animate={{ x: notificarAlInicio ? 24 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </div>
            </div>
          </div>

          {/* Sección para notificaciones "X minutos antes" */}
          <div className="plan-notifications-times">
            <label className="plan-notifications-label">
              Notificaciones antes del bloque
            </label>
            <div className="plan-times-list">
              {(localTiempos.length > 0 ? localTiempos : [15]).map((minutos, index) => (
                <motion.div
                  key={index}
                  className="plan-time-config-item"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <span className="plan-time-config-label">
                    Notificación {index + 1}:
                  </span>
                  <div className="plan-time-config-input-group">
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={inputValues[index] ?? minutos.toString()}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onBlur={() => handleInputBlur(index)}
                      className="plan-time-config-input"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                    <span className="plan-time-config-unit">minutos antes</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="plan-notifications-hint">
              Las notificaciones se enviarán a todos los bloques del plan generado
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

