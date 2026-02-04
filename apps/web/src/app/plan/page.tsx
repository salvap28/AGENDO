'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlanStore } from '@/stores/planStore';
import StepEnergia from '@/components/planea/StepEnergia';
import StepFoco from '@/components/planea/StepFoco';
import StepTiempo from '@/components/planea/StepTiempo';
import StepIntensidad from '@/components/planea/StepIntensidad';
import StepTareas from '@/components/planea/StepTareas';
import StepDescansos from '@/components/planea/StepDescansos';
import StepAclaracion from '@/components/planea/StepAclaracion';
import StepNotificaciones from '@/components/planea/StepNotificaciones';
import PlanResult from '@/components/planea/PlanResult';
import PlanGenerating from '@/components/planea/PlanGenerating';
import PlanExitModal from '@/components/planea/PlanExitModal';
import api from '@/lib/api';

export default function PlanPage() {
  const router = useRouter();
  const {
    currentStep,
    totalSteps,
    energia,
    foco,
    tiempoDisponible,
    tiempoParcialDesde,
    tiempoParcialHasta,
    intensidad,
    tareasImportantes,
    incluirDescansos,
    aclaracionFinal,
    quiereNotificaciones,
    cantidadNotificaciones,
    tiemposNotificaciones,
    planGenerado,
    isLoading,
    error,
    nextStep,
    prevStep,
    setPlanGenerado,
    setLoading,
    setError,
    reset,
    setEnergia,
    setFoco,
    setTiempoDisponible,
    setIntensidad,
    setTareasImportantes,
    setTareasPersonalizadas,
    setIncluirDescansos,
    setAclaracionFinal,
    setQuiereNotificaciones,
    setCantidadNotificaciones,
    setTiemposNotificaciones,
    setFechaSeleccionada,
    bloquesExistentes,
    goToStep,
  } = usePlanStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [hasCheckedSavedProgress, setHasCheckedSavedProgress] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [savedProgress, setSavedProgress] = useState<any>(null);

  // Restaurar progreso guardado al entrar
  useEffect(() => {
    if (hasCheckedSavedProgress) return;
    
    try {
      const saved = localStorage.getItem('agendo_plan_progress');
      if (saved) {
        const progress = JSON.parse(saved);
        // Verificar que el progreso no sea muy antiguo (más de 7 días)
        const savedAt = progress.savedAt ? new Date(progress.savedAt) : null;
        const daysDiff = savedAt ? (Date.now() - savedAt.getTime()) / (1000 * 60 * 60 * 24) : 999;
        
        if (daysDiff <= 7) {
          // Mostrar prompt para restaurar
          setSavedProgress(progress);
          setShowRestorePrompt(true);
        } else {
          // Limpiar progreso antiguo
          localStorage.removeItem('agendo_plan_progress');
        }
      }
    } catch (e) {
      console.error('Error restaurando progreso guardado:', e);
      localStorage.removeItem('agendo_plan_progress');
    } finally {
      setHasCheckedSavedProgress(true);
    }
  }, [hasCheckedSavedProgress, setEnergia, setFoco, setTiempoDisponible, setIntensidad, setTareasImportantes, setTareasPersonalizadas, setIncluirDescansos, setAclaracionFinal, setQuiereNotificaciones, setCantidadNotificaciones, setTiemposNotificaciones, setFechaSeleccionada, goToStep]);

  const handleCancel = () => {
    // Verificar si hay algún progreso guardado
    const hasProgress = energia !== null || 
                       foco !== null || 
                       tiempoDisponible !== null || 
                       intensidad !== null || 
                       tareasImportantes.length > 0 || 
                       (usePlanStore.getState().tareasPersonalizadas?.length ?? 0) > 0 ||
                       aclaracionFinal !== '' ||
                       quiereNotificaciones;
    
    if (hasProgress) {
      // Si hay progreso, mostrar el modal
      setShowExitModal(true);
    } else {
      // Si no hay progreso, salir directamente
      reset();
      router.push('/calendario');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return energia !== null;
      case 2:
        return foco !== null;
      case 3:
        return tiempoDisponible !== null && 
               (tiempoDisponible !== 'parcial' || (tiempoParcialDesde && tiempoParcialHasta && tiempoParcialDesde < tiempoParcialHasta));
      case 4:
        return intensidad !== null;
      case 5:
        return true; // Las tareas son opcionales
      case 6:
        return true; // El switch siempre tiene un valor
      case 7:
        return true; // La aclaración es opcional
      case 8:
        return true; // Las notificaciones son opcionales
      default:
        return false;
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLoading(true);
    setError(null);

    try {
      const { tareasPersonalizadas, fechaSeleccionada } = usePlanStore.getState();
      const fecha = fechaSeleccionada || new Date().toISOString().split('T')[0];
      
      const payload = {
        energia,
        foco,
        tiempoDisponible,
        tiempoParcialDesde: tiempoDisponible === 'parcial' ? tiempoParcialDesde : undefined,
        tiempoParcialHasta: tiempoDisponible === 'parcial' ? tiempoParcialHasta : undefined,
        intensidad,
        tareasImportantes,
        tareasPersonalizadas,
        incluirDescansos,
        aclaracionFinal,
        quiereNotificaciones,
        cantidadNotificaciones,
        tiemposNotificaciones,
        fecha: fecha,
        bloquesExistentes: bloquesExistentes || undefined,
      };

      const res = await api.post('/plan/generate', payload);
      setPlanGenerado(res.data.plan);
    } catch (err: any) {
      console.error('Error generando plan:', err);
      setError(err.response?.data?.error || 'Error al generar el plan. Por favor, intentá de nuevo.');
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepEnergia />;
      case 2:
        return <StepFoco />;
      case 3:
        return <StepTiempo />;
      case 4:
        return <StepIntensidad />;
      case 5:
        return <StepTareas />;
      case 6:
        return <StepDescansos />;
      case 7:
        return <StepAclaracion />;
      case 8:
        return <StepNotificaciones />;
      default:
        return null;
    }
  };

  if (planGenerado) {
    return <PlanResult />;
  }

  if (isGenerating || isLoading) {
    return <PlanGenerating />;
  }

  return (
    <main className="plan-page">
      <div className="plan-container">
        <header className="plan-header">
          <div className="plan-header-content">
            <h1 className="plan-title">Planeá con Agendo</h1>
            <p className="plan-subtitle">Respondé unas preguntas y generamos tu plan del día</p>
          </div>
          <button
            type="button"
            className="plan-close-button"
            onClick={handleCancel}
            aria-label="Cancelar y salir"
            title="Cancelar y salir"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        {/* Progress bar */}
        <div className="plan-progress">
          <div
            className="plan-progress-bar"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <p className="plan-progress-text">
          Paso {currentStep} de {totalSteps}
        </p>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="plan-step-container"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Error message */}
        {error && (
          <motion.div
            className="plan-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* Restore progress prompt */}
        {showRestorePrompt && savedProgress && (
          <motion.div
            className="plan-restore-prompt"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="plan-restore-prompt-text">
              Tenés un plan guardado desde el paso {savedProgress.currentStep}. ¿Querés continuar desde ahí?
            </p>
            <div className="plan-restore-prompt-actions">
              <button
                type="button"
                className="plan-btn plan-btn--primary"
                onClick={() => {
                  // Restaurar el progreso
                  if (savedProgress.energia) setEnergia(savedProgress.energia);
                  if (savedProgress.foco) setFoco(savedProgress.foco);
                  if (savedProgress.tiempoDisponible) {
                    setTiempoDisponible(
                      savedProgress.tiempoDisponible,
                      savedProgress.tiempoParcialDesde,
                      savedProgress.tiempoParcialHasta
                    );
                  }
                  if (savedProgress.intensidad) setIntensidad(savedProgress.intensidad);
                  if (savedProgress.tareasImportantes) setTareasImportantes(savedProgress.tareasImportantes);
                  if (savedProgress.tareasPersonalizadas) setTareasPersonalizadas(savedProgress.tareasPersonalizadas);
                  if (savedProgress.incluirDescansos !== undefined) setIncluirDescansos(savedProgress.incluirDescansos);
                  if (savedProgress.aclaracionFinal) setAclaracionFinal(savedProgress.aclaracionFinal);
                  if (savedProgress.quiereNotificaciones !== undefined) setQuiereNotificaciones(savedProgress.quiereNotificaciones);
                  if (savedProgress.cantidadNotificaciones) setCantidadNotificaciones(savedProgress.cantidadNotificaciones);
                  if (savedProgress.tiemposNotificaciones) setTiemposNotificaciones(savedProgress.tiemposNotificaciones);
                  if (savedProgress.fechaSeleccionada) setFechaSeleccionada(savedProgress.fechaSeleccionada);
                  if (savedProgress.currentStep) goToStep(savedProgress.currentStep);
                  setShowRestorePrompt(false);
                }}
              >
                Continuar
              </button>
              <button
                type="button"
                className="plan-btn plan-btn--secondary"
                onClick={() => {
                  localStorage.removeItem('agendo_plan_progress');
                  setShowRestorePrompt(false);
                  setSavedProgress(null);
                }}
              >
                Empezar de nuevo
              </button>
            </div>
          </motion.div>
        )}

        {/* Navigation buttons */}
        <div className="plan-navigation">
          {currentStep > 1 && (
            <motion.button
              type="button"
              className="plan-btn plan-btn--secondary"
              onClick={prevStep}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Atrás
            </motion.button>
          )}

          <div className="plan-navigation-right">
            {currentStep < totalSteps ? (
              <motion.button
                type="button"
                className="plan-btn plan-btn--primary"
                onClick={nextStep}
                disabled={!canProceed()}
                whileHover={canProceed() ? { scale: 1.02 } : {}}
                whileTap={canProceed() ? { scale: 0.98 } : {}}
              >
                Siguiente
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className="plan-btn plan-btn--primary"
                onClick={handleGenerate}
                disabled={isGenerating || isLoading}
                whileHover={!isGenerating && !isLoading ? { scale: 1.02 } : {}}
                whileTap={!isGenerating && !isLoading ? { scale: 0.98 } : {}}
              >
                {isGenerating || isLoading ? (
                  <>
                    <span className="plan-btn-spinner" />
                    Generando plan...
                  </>
                ) : (
                  'Generar mi plan'
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <PlanExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
      />
    </main>
  );
}

