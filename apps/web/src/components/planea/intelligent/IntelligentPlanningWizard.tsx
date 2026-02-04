'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import InputStep from './InputStep';
import PreviewStep from './PreviewStep';
import QuestionsStep from './QuestionsStep';
import PlanReviewStep from './PlanReviewStep';
import type {
  IntelligentPlanningStepResponse,
  IntelligentPlanningSession,
} from '@/types/intelligent-planning';
import api from '@/lib/api';

type IntelligentPlanningWizardProps = {
  onComplete: () => void;
  onCancel: () => void;
  onSessionCreated?: (sessionId: string) => void;
};

type WizardStep = 'input' | 'preview' | 'questions' | 'plan';

export default function IntelligentPlanningWizard({
  onComplete,
  onCancel,
  onSessionCreated,
}: IntelligentPlanningWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>('input');
  const [session, setSession] = useState<IntelligentPlanningSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildErrorMessage = (err: any, fallback: string) => {
    const status = err?.response?.status;
    const data = err?.response?.data || {};
    const retryAfter = Number(data?.retryAfterSeconds)
      || Number.parseInt(err?.response?.headers?.['retry-after'] || '', 10);
    if (status === 429) {
      const suffix = Number.isFinite(retryAfter) ? ` Reintenta en ~${retryAfter}s.` : '';
      return `Se excedio la cuota de Gemini.${suffix}`;
    }
    return data?.message || data?.error || fallback;
  };


  const handleInputSubmit = async (rawText: string) => {
    setLoading(true);
    setError(null);

    try {
      // Primero crear la sesión inicial (usar endpoint existente para compatibilidad)
      const startResponse = await api.post<IntelligentPlanningStepResponse>('/ai/intelligent-planning', {
        mode: 'start',
        rawText,
        contextDate: new Date().toISOString().split('T')[0],
      });

      if (startResponse.data.status === 'error') {
        setError(startResponse.data.message);
        return;
      }

      const sessionId = startResponse.data.sessionId;

      if (startResponse.data.status === 'redirect_single_day') {
        router.push('/plan');
        return;
      }

      if (startResponse.data.status === 'final_plan') {
        const sessionData: IntelligentPlanningSession = {
          sessionId,
          rawText,
          tasksPreview: [],
          currentQuestion: null,
          answers: {},
          currentStep: 'plan',
        };
        setSession(sessionData);
        onSessionCreated?.(sessionId);
        setCurrentStep('plan');
        return;
      }

      if (startResponse.data.status === 'need_question') {
        const tasksPreview = startResponse.data.tasksPreview || [];
        const sessionData: IntelligentPlanningSession = {
          sessionId,
          rawText,
          tasksPreview,
          currentQuestion: startResponse.data.question,
          answers: {},
          currentStep: tasksPreview.length > 0 ? 'preview' : 'questions',
        };
        setSession(sessionData);
        onSessionCreated?.(sessionId);
        setCurrentStep(tasksPreview.length > 0 ? 'preview' : 'questions');
      }

    } catch (err: any) {
      console.error('Error iniciando planeación inteligente:', err);
      setError(buildErrorMessage(err, 'Error al procesar tu solicitud. Por favor, intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewContinue = () => {
    if (session && session.currentQuestion) {
      setCurrentStep('questions');
    } else {
      // Si no hay preguntas, usar /step para obtener la primera o el plan final
      handleNextStep();
    }
  };

  const handleQuestionAnswer = async (
    questionId: string,
    optionId?: string,
    customValue?: string,
    freeText?: string
  ) => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<IntelligentPlanningStepResponse>('/ai/intelligent-planning/step', {
        sessionId: session.sessionId,
        lastQuestionId: questionId,
        lastAnswerOptionId: optionId,
        lastAnswerCustomValue: customValue,
        lastAnswerFreeText: freeText,
      });

      if (response.data.status === 'error') {
        setError(response.data.message);
        setLoading(false);
        return;
      }

      // Actualizar sesión con la nueva respuesta
      const updatedSession: IntelligentPlanningSession = {
        ...session,
        answers: {
          ...session.answers,
          [questionId]: {
            optionId,
            customValue,
            freeText,
          },
        },
      };

      if (response.data.status === 'final_plan') {
        // Tenemos el plan final
        updatedSession.currentStep = 'plan';
        updatedSession.currentQuestion = null;
        setSession(updatedSession);
        setCurrentStep('plan');
      } else if (response.data.status === 'need_question') {
        // Hay más preguntas
        updatedSession.currentQuestion = response.data.question;
        setSession(updatedSession);
        // Mantener en questions step
      }
    } catch (err: any) {
      console.error('Error respondiendo pregunta:', err);
      setError(buildErrorMessage(err, 'Error al procesar tu respuesta. Por favor, intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<IntelligentPlanningStepResponse>('/ai/intelligent-planning/step', {
        sessionId: session.sessionId,
      });

      if (response.data.status === 'error') {
        setError(response.data.message);
        setLoading(false);
        return;
      }

      const updatedSession: IntelligentPlanningSession = {
        ...session,
        currentQuestion: response.data.status === 'need_question' ? response.data.question : null,
        currentStep: response.data.status === 'final_plan' ? 'plan' : 'questions',
      };

      setSession(updatedSession);

      if (response.data.status === 'final_plan') {
        setCurrentStep('plan');
      } else {
        setCurrentStep('questions');
      }
    } catch (err: any) {
      console.error('Error obteniendo siguiente paso:', err);
      setError(buildErrorMessage(err, 'Error al procesar. Por favor, intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  };


  const handlePlanConfirm = async () => {
    if (!session) return;

    setLoading(true);
    try {
      // Guardar los bloques nuevos en el calendario
      await api.post('/ai/intelligent-planning/confirm', {
        sessionId: session.sessionId,
      });
      onComplete();
    } catch (err: any) {
      console.error('Error confirmando plan:', err);
      setError(buildErrorMessage(err, 'Error al guardar el plan. Por favor, intentá de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="intelligent-planning-wizard">
      <AnimatePresence mode="wait">
        {/* Pantalla de carga cuando se está procesando el input */}
        {loading && currentStep === 'input' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="intelligent-step"
          >
            <div className="plan-generating-overlay">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="plan-generating-content"
              >
                {/* Spinner animado */}
                <div className="plan-generating-spinner">
                  <div className="plan-generating-spinner__ring">
                    <div className="plan-generating-spinner__ring-inner" />
                  </div>
                  <div className="plan-generating-spinner__glow" />
                </div>

                {/* Título y descripción */}
                <div className="plan-generating-text">
                  <h2 className="plan-generating-title">Agendo está generando tu agenda</h2>
                  <p className="plan-generating-subtitle">
                    Estoy analizando tu solicitud y organizando todo para que tengas un plan perfecto...
                  </p>
                </div>

                {/* Barra de progreso animada */}
                <div className="plan-generating-progress">
                  <motion.div
                    className="plan-generating-progress__bar"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </div>

                {/* Indicadores de estado */}
                <div className="plan-generating-steps">
                  <motion.div
                    className="plan-generating-step"
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
                  >
                    <div className="plan-generating-step__dot" />
                    <span>Analizando tu solicitud</span>
                  </motion.div>
                  <motion.div
                    className="plan-generating-step"
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.3, repeatType: 'reverse' }}
                  >
                    <div className="plan-generating-step__dot" />
                    <span>Detectando tareas y fechas</span>
                  </motion.div>
                  <motion.div
                    className="plan-generating-step"
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.6, repeatType: 'reverse' }}
                  >
                    <div className="plan-generating-step__dot" />
                    <span>Preparando tu plan</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {currentStep === 'input' && !loading && (
          <InputStep
            key="input"
            onSubmit={handleInputSubmit}
            onCancel={onCancel}
            loading={loading}
            error={error}
            initialText={session?.rawText}
          />
        )}

        {currentStep === 'preview' && session && (
          <PreviewStep
            key="preview"
            tasksPreview={session.tasksPreview}
            onContinue={handlePreviewContinue}
            onBack={() => setCurrentStep('input')}
            onBackToInput={() => setCurrentStep('input')}
            loading={loading}
          />
        )}

        {currentStep === 'questions' && session && (
          <QuestionsStep
            key="questions"
            session={session}
            onAnswer={handleQuestionAnswer}
            onBack={() => {
              // Si hay preview, volver a preview, sino volver a input
              if (session.tasksPreview && session.tasksPreview.length > 0) {
                setCurrentStep('preview');
              } else {
                setCurrentStep('input');
              }
            }}
            onBackToInput={() => setCurrentStep('input')}
            loading={loading}
            error={error}
          />
        )}

        {currentStep === 'plan' && session && (
          <PlanReviewStep
            key="plan"
            sessionId={session.sessionId}
            onConfirm={handlePlanConfirm}
            onCancel={onCancel}
            onBackToInput={() => setCurrentStep('input')}
            loading={loading}
            error={error}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

