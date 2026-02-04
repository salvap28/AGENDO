import type { SingleDayPlan } from './dailyPlanner.js';

export type PlanningStage = 'intake' | 'clarifying' | 'planning' | 'final';

export type PlanIntentTask = {
  title: string;
  taskType?: 'STUDY' | 'WORK' | 'PHYSICAL' | 'PERSONAL' | 'OTHER';
  estimatedTotalMinutes?: number;
  frequency?: number;
  frequencyUnit?: 'times' | 'days' | 'week';
  confidence: number;
};

export type PlanIntent = {
  horizon: 'single_day' | 'multi_day' | 'ambiguous';
  horizonDays?: number;
  dateRange?: {
    start?: string;
    end?: string;
  };
  tasks: PlanIntentTask[];
  preferences: {
    energyPattern?: 'low' | 'medium' | 'high' | 'unknown';
    heavyTasksTime?: 'morning' | 'afternoon' | 'evening' | 'any' | 'unknown';
    dayScope?: 'weekdays' | 'all' | 'unknown';
    fixedCommitments?: 'yes' | 'no' | 'unknown';
    trainingSpacing?: 'alternating' | 'non_consecutive' | 'unknown';
    agendoDistribution?: 'even' | 'focused' | 'unknown';
    agendoFocus?: 'frontend' | 'ai' | 'both' | 'unknown';
  };
  emotionalConstraints: string[];
  confidence: number;
};

export type PlanningGap = {
  key: 'HORIZON_CLARITY' | 'DATE_RANGE' | 'DAY_SCOPE' | 'FIXED_COMMITMENTS' | 'ENERGY_PATTERN' | 'STUDY_WINDOW' | 'TRAINING_SPACING' | 'AGENDO_DISTRIBUTION';
  severity: 'low' | 'medium' | 'high';
  reason: string;
};

export type QuestionOption = {
  id: string;
  label: string;
  allowsCustomValue?: boolean;
};

export type Question = {
  id: string;
  gapKey: PlanningGap['key'];
  text: string;
  options?: QuestionOption[];
  createdAt: string;
};

export type Answer = {
  questionId: string;
  gapKey: PlanningGap['key'];
  response: string;
  createdAt: string;
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

export type PlanningSession = {
  id: string;
  stage: PlanningStage;
  userInput: string;
  contextDate: string;
  intent?: PlanIntent;
  gaps: PlanningGap[];
  questions: Question[];
  answers: Answer[];
  multiDayPlan?: MultiDayPlan;
  meta: {
    assumptions: string[];
    ruleDecisions: string[];
  };
};
