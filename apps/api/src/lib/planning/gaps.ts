import type { PlanIntent, PlanningGap } from './types.js';

const normalizeText = (value: string): string => (
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

export function detectPlanningGaps(intent: PlanIntent): PlanningGap[] {
  const gaps: PlanningGap[] = [];

  if (intent.horizon === 'ambiguous' || (intent.horizon === 'multi_day' && !intent.horizonDays && !intent.dateRange?.start)) {
    gaps.push({
      key: 'HORIZON_CLARITY',
      severity: 'high',
      reason: 'Necesario para definir cuantos dias planificar.',
    });
  }

  if (intent.horizon === 'multi_day' && !intent.dateRange?.start) {
    gaps.push({
      key: 'DATE_RANGE',
      severity: 'medium',
      reason: 'Necesitamos saber desde cuando empieza el rango.',
    });
  }

  if (intent.horizon !== 'single_day' && intent.preferences.dayScope === 'unknown') {
    gaps.push({
      key: 'DAY_SCOPE',
      severity: 'medium',
      reason: 'Hay que aclarar si incluye fin de semana o solo dias habiles.',
    });
  }

  if (intent.horizon !== 'single_day' && intent.preferences.fixedCommitments === 'unknown') {
    gaps.push({
      key: 'FIXED_COMMITMENTS',
      severity: 'medium',
      reason: 'Necesitamos saber si hay compromisos fijos.',
    });
  }

  if (intent.preferences.energyPattern === 'unknown') {
    gaps.push({
      key: 'ENERGY_PATTERN',
      severity: 'medium',
      reason: 'Necesario para ubicar tareas cognitivas.',
    });
  }

  const hasStudy = intent.tasks.some((task) => task.taskType === 'STUDY');
  if (hasStudy && intent.preferences.heavyTasksTime === 'unknown') {
    gaps.push({
      key: 'STUDY_WINDOW',
      severity: 'low',
      reason: 'Conviene saber cuando rendis mejor para estudiar.',
    });
  }

  const hasTraining = intent.tasks.some((task) => task.taskType === 'PHYSICAL' && (task.frequency || 0) > 1);
  if (hasTraining && intent.preferences.trainingSpacing === 'unknown') {
    gaps.push({
      key: 'TRAINING_SPACING',
      severity: 'low',
      reason: 'Necesario para espaciar entrenamientos.',
    });
  }

  const hasAgendo = intent.tasks.some((task) => /agendo/i.test(task.title));
  const agendoDistribution = intent.preferences.agendoDistribution || 'unknown';
  if (hasAgendo && agendoDistribution === 'unknown') {
    gaps.push({
      key: 'AGENDO_DISTRIBUTION',
      severity: 'low',
      reason: 'Necesitamos saber como queres repartir el avance en Agendo.',
    });
  }

  return gaps;
}

export function applyAnswerToIntent(intent: PlanIntent, gapKey: PlanningGap['key'], response: string): PlanIntent {
  const normalized = normalizeText(response);

  if (gapKey === 'HORIZON_CLARITY') {
    const daysMatch = normalized.match(/\b(\d+)\s*dias?\b/);
    if (daysMatch) {
      intent.horizonDays = parseInt(daysMatch[1], 10);
      intent.horizon = intent.horizonDays > 1 ? 'multi_day' : 'single_day';
    } else if (/\bhoy\b/.test(normalized)) {
      intent.horizon = 'single_day';
      intent.horizonDays = 1;
    }
  }

  if (gapKey === 'DATE_RANGE') {
    const dateMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/g);
    if (dateMatch && dateMatch.length > 0) {
      intent.dateRange = {
        start: dateMatch[0],
        end: dateMatch[1] || dateMatch[0],
      };
    }
  }

  if (gapKey === 'DAY_SCOPE') {
    if (normalized.includes('habil')) {
      intent.preferences.dayScope = 'weekdays';
    } else if (normalized.includes('fin de semana') || normalized.includes('finde') || normalized.includes('incluye')) {
      intent.preferences.dayScope = 'all';
    }
  }

  if (gapKey === 'FIXED_COMMITMENTS') {
    if (normalized.includes('no')) {
      intent.preferences.fixedCommitments = 'no';
    } else if (normalized.includes('si') || normalized.includes('tengo')) {
      intent.preferences.fixedCommitments = 'yes';
    }
  }

  if (gapKey === 'ENERGY_PATTERN') {
    if (normalized.includes('baja') || normalized.includes('cans') || normalized.includes('agot')) {
      intent.preferences.energyPattern = 'low';
    } else if (normalized.includes('alta')) {
      intent.preferences.energyPattern = 'high';
    } else if (normalized.includes('media')) {
      intent.preferences.energyPattern = 'medium';
    }
  }

  if (gapKey === 'STUDY_WINDOW') {
    if (normalized.includes('manana')) {
      intent.preferences.heavyTasksTime = 'morning';
    } else if (normalized.includes('tarde')) {
      intent.preferences.heavyTasksTime = 'afternoon';
    } else if (normalized.includes('noche')) {
      intent.preferences.heavyTasksTime = 'evening';
    } else if (normalized.includes('me da igual') || normalized.includes('indistinto')) {
      intent.preferences.heavyTasksTime = 'any';
    }
  }

  if (gapKey === 'TRAINING_SPACING') {
    if (normalized.includes('alternad') || normalized.includes('dia por medio')) {
      intent.preferences.trainingSpacing = 'alternating';
    } else if (normalized.includes('no consecut') || normalized.includes('no seguidos')) {
      intent.preferences.trainingSpacing = 'non_consecutive';
    }
  }

  if (gapKey === 'AGENDO_DISTRIBUTION') {
    if (/(repart|igual|todos los dias|cada dia|altern|intercal)/.test(normalized)) {
      intent.preferences.agendoDistribution = 'even';
    } else if (/(concentr|mas en|un dia|picos)/.test(normalized)) {
      intent.preferences.agendoDistribution = 'focused';
    }

    const hasFrontend = /(frontend|front|interfaz|ui|web)/.test(normalized);
    const hasAi = /\b(ia|ai|inteligencia|motor|modelo)\b/.test(normalized);
    if (hasFrontend && hasAi) {
      intent.preferences.agendoFocus = 'both';
    } else if (hasFrontend) {
      intent.preferences.agendoFocus = 'frontend';
    } else if (hasAi) {
      intent.preferences.agendoFocus = 'ai';
    }
    const currentDistribution = intent.preferences.agendoDistribution || 'unknown';
    if (currentDistribution === 'unknown' && (hasFrontend || hasAi)) {
      intent.preferences.agendoDistribution = 'even';
    }
  }

  return intent;
}
