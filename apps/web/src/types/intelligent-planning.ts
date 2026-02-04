/**
 * Tipos para el flujo de Planeación Inteligente 2.0
 */

export type PlanningQuestionOption = {
  id: string;
  label: string;
  value?: string;
  kind?: 'time' | 'duration' | 'priority' | 'boolean' | 'custom';
  allowsCustomValue?: boolean; // habilita input adicional
};

export type PlanningQuestion = {
  id: string;
  text: string;
  relatedTaskId?: string;
  options: PlanningQuestionOption[];
  canSkip: boolean;
  allowFreeTextAlone?: boolean;
  freeTextPlaceholder?: string;
};

export type TaskPreview = {
  id: string;
  title: string;
  detectedDate?: string; // 'today', 'tomorrow', 'YYYY-MM-DD', etc.
  taskType?: 'STUDY' | 'WORK' | 'PHYSICAL' | 'PERSONAL' | 'OTHER';
  estimatedDuration?: number; // minutos
  priority?: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
};

export type PlanningStepRequest = {
  sessionId: string;
  lastQuestionId?: string;
  lastAnswerOptionId?: string;
  lastAnswerCustomValue?: string;
  lastAnswerFreeText?: string;
};

export type IntelligentPlanningStepResponse =
  | {
      status: 'need_question';
      sessionId: string;
      question: PlanningQuestion;
      tasksPreview?: TaskPreview[];
      questionsAsked?: number;
      maxQuestions?: number;
    }
  | {
      status: 'final_plan';
      sessionId: string;
      plan: MultiDayPlan;
    }
  | {
      status: 'redirect_single_day';
      sessionId: string;
    }
  | {
      status: 'error';
      message: string;
    };

export type SingleDayPlan = {
  bloques: Array<{
    id: string;
    titulo: string;
    inicio: string;
    fin: string;
    foco: string;
    tipo: 'profundo' | 'ligero';
    color: string;
    tareas: string[];
    descripcion: string;
  }>;
  tareasAsignadas: Array<{
    id: string;
    titulo: string;
    bloqueId: string;
    prioridad: 'alta' | 'media' | 'baja';
  }>;
  descansos: Array<{
    inicio: string;
    fin: string;
    tipo: 'corto' | 'largo';
    descripcion?: string;
  }>;
  recomendaciones: string[];
  explicacion: string;
  resumen: string;
};

export type MultiDayPlan = {
  days: Array<{
    dayIndex: number;
    date: string;
    plan: SingleDayPlan;
  }>;
  assumptions: string[];
  warnings: string[];
};

export type EfficiencyProfile = {
  [taskType: string]: {
    bestSlots: string[]; // ej. ['09-12', '15-17']
    weakSlots: string[]; // ej. ['22-01']
    averageDuration?: number; // minutos promedio
  };
};

export type IntelligentPlanningSession = {
  sessionId: string;
  rawText: string;
  contextDate?: string;
  tasksPreview: TaskPreview[];
  currentQuestion: PlanningQuestion | null;
  answers: Record<string, { optionId?: string; customValue?: string; freeText?: string }>;
  currentStep: 'input' | 'preview' | 'questions' | 'plan' | 'complete';
  multiDayPlan?: MultiDayPlan;
};
