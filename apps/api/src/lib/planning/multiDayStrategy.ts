import type { PlanIntent, PlanningSession } from './types.js';

export type DayTask = {
  id: string;
  title: string;
  taskType?: PlanIntent['tasks'][number]['taskType'];
  estimatedMinutes?: number;
  priority?: 'alta' | 'media' | 'baja';
};

export type MultiDayStrategyResult = {
  days: Array<{
    dayIndex: number;
    date: string;
    tasks: DayTask[];
  }>;
  assumptions: string[];
  ruleDecisions: string[];
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
};

const formatYmd = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildDateList = (start: Date, count: number, dayScope: PlanIntent['preferences']['dayScope']): string[] => {
  const dates: string[] = [];
  let cursor = new Date(start.getTime());
  while (dates.length < count) {
    const day = cursor.getDay();
    const isWeekend = day === 0 || day === 6;
    if (dayScope !== 'weekdays' || !isWeekend) {
      dates.push(formatYmd(cursor));
    }
    cursor = addDays(cursor, 1);
  }
  return dates;
};

const distributeByFrequency = (
  dates: string[],
  frequency: number,
  spacing: PlanIntent['preferences']['trainingSpacing']
): number[] => {
  const indices: number[] = [];
  if (frequency <= 0) return indices;

  const step = spacing === 'alternating' || spacing === 'non_consecutive' ? 2 : 1;
  let idx = 0;
  while (indices.length < frequency && idx < dates.length) {
    indices.push(idx);
    idx += step;
  }

  if (indices.length < frequency) {
    for (let i = 0; i < dates.length && indices.length < frequency; i += 1) {
      if (!indices.includes(i)) {
        indices.push(i);
      }
    }
  }

  return indices;
};

export function buildMultiDayStrategy(session: PlanningSession): MultiDayStrategyResult {
  const intent = session.intent;
  if (!intent) {
    return { days: [], assumptions: ['Sin intencion, se asume sin tareas.'], ruleDecisions: [] };
  }

  const assumptions: string[] = [];
  const ruleDecisions: string[] = [];

  let totalDays = intent.horizonDays && intent.horizonDays > 1 ? intent.horizonDays : 0;
  if (!totalDays && intent.dateRange?.start && intent.dateRange?.end) {
    const start = new Date(`${intent.dateRange.start}T00:00:00`);
    const end = new Date(`${intent.dateRange.end}T00:00:00`);
    const diff = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    totalDays = diff;
  }
  if (!totalDays) {
    totalDays = intent.horizon === 'multi_day' ? 3 : 3;
    assumptions.push(`Se asumen ${totalDays} dias por falta de un horizonte claro.`);
  }

  const startDate = intent.dateRange?.start
    ? new Date(`${intent.dateRange.start}T00:00:00`)
    : new Date(`${session.contextDate}T00:00:00`);
  const dates = buildDateList(startDate, totalDays, intent.preferences.dayScope || 'all');

  const days = dates.map((date, index) => ({
    dayIndex: index,
    date,
    tasks: [] as DayTask[],
  }));

  const studyTasks = intent.tasks.filter((task) => task.taskType === 'STUDY');
  const physicalTasks = intent.tasks.filter((task) => task.taskType === 'PHYSICAL');
  const dailyTasks = intent.tasks.filter((task) => /agendo/i.test(task.title));
  const otherTasks = intent.tasks.filter((task) => !studyTasks.includes(task) && !physicalTasks.includes(task) && !dailyTasks.includes(task));
  const agendoDistribution = intent.preferences.agendoDistribution || 'unknown';
  const agendoFocus = intent.preferences.agendoFocus || 'unknown';

  const studyMinutesTotal = studyTasks.reduce((sum, task) => sum + (task.estimatedTotalMinutes || 0), 0);
  if (studyMinutesTotal > 0) {
    const perDay = Math.max(60, Math.round(studyMinutesTotal / days.length));
    ruleDecisions.push(`Se reparte estudio en ${days.length} dias (~${perDay} min por dia).`);
    days.forEach((day) => {
      day.tasks.push({
        id: `study_${day.dayIndex}`,
        title: 'Estudiar',
        taskType: 'STUDY',
        estimatedMinutes: perDay,
        priority: 'alta',
      });
    });
  } else if (studyTasks.length > 0) {
    const tasksPerDay = Math.max(1, Math.ceil(studyTasks.length / days.length));
    studyTasks.forEach((task, idx) => {
      const dayIdx = Math.floor(idx / tasksPerDay);
      days[Math.min(dayIdx, days.length - 1)].tasks.push({
        id: `study_${idx}`,
        title: task.title,
        taskType: task.taskType,
        estimatedMinutes: task.estimatedTotalMinutes,
        priority: 'alta',
      });
    });
  }

  if (physicalTasks.length > 0) {
    const totalSessions = physicalTasks.reduce((sum, task) => sum + (task.frequency || 1), 0);
    const indices = distributeByFrequency(dates, Math.min(totalSessions, days.length), intent.preferences.trainingSpacing || 'unknown');
    ruleDecisions.push('Se distribuyen entrenamientos evitando dias consecutivos cuando es posible.');
    indices.forEach((dayIdx, idx) => {
      const baseTask = physicalTasks[idx % physicalTasks.length];
      days[dayIdx].tasks.push({
        id: `train_${idx}`,
        title: baseTask.title || 'Entrenar',
        taskType: 'PHYSICAL',
        estimatedMinutes: baseTask.estimatedTotalMinutes,
        priority: 'media',
      });
    });
  }

  if (dailyTasks.length > 0) {
    const focusLabels =
      agendoFocus === 'both'
        ? ['Frontend', 'IA']
        : agendoFocus === 'frontend'
          ? ['Frontend']
          : agendoFocus === 'ai'
            ? ['IA']
            : [];
    const shouldFocus = agendoDistribution === 'focused' && days.length > 2;
    const focusedIndices = shouldFocus
      ? [0, days.length - 1]
      : days.map((_, idx) => idx);

    ruleDecisions.push(
      shouldFocus
        ? 'Se concentra el avance en Agendo en menos dias.'
        : 'Se incluye avance de Agendo en cada dia.'
    );
    if (focusLabels.length > 0) {
      ruleDecisions.push(`Se alterna foco en Agendo: ${focusLabels.join(' / ')}.`);
    }

    focusedIndices.forEach((dayIdx, idx) => {
      const task = dailyTasks[idx % dailyTasks.length];
      const titleRaw = String(task.title || 'Agendo');
      const titleNorm = titleRaw.toLowerCase();
      const hasExplicitFocus = /(frontend|front|interfaz|ui|web|ia|ai|inteligencia|motor|modelo)/.test(titleNorm);
      const focusLabel = focusLabels.length > 0 ? focusLabels[idx % focusLabels.length] : '';
      const title = !hasExplicitFocus && focusLabel ? `Agendo - ${focusLabel}` : titleRaw;

      days[dayIdx].tasks.push({
        id: `agendo_${dayIdx}_${idx}`,
        title,
        taskType: task.taskType,
        estimatedMinutes: task.estimatedTotalMinutes,
        priority: 'media',
      });
    });
  }

  otherTasks.forEach((task, idx) => {
    const dayIdx = idx % days.length;
    days[dayIdx].tasks.push({
      id: `task_${idx}`,
      title: task.title,
      taskType: task.taskType,
      estimatedMinutes: task.estimatedTotalMinutes,
      priority: 'media',
    });
  });

  return { days, assumptions, ruleDecisions };
}
