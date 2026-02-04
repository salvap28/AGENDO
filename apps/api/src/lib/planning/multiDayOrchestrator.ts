import type { PrismaClient } from '@prisma/client';
import { generateDailyPlan, type PlanGenerateInput, type SingleDayPlan } from './dailyPlanner.js';
import type { MultiDayPlan, PlanningSession } from './types.js';
import type { DayTask, MultiDayStrategyResult } from './multiDayStrategy.js';

type CalendarBlock = {
  id?: string;
  date: string;
  start: string;
  end: string;
  title: string;
  color?: string | null;
};

const mapEnergy = (energy?: string): PlanGenerateInput['energia'] => {
  if (energy === 'low') return 'baja';
  if (energy === 'high') return 'alta';
  return 'media';
};

const mapIntensity = (energy?: string, taskCount?: number): PlanGenerateInput['intensidad'] => {
  if (energy === 'low') return 'liviana';
  if ((taskCount || 0) >= 3) return 'intensa';
  return 'balanceada';
};

const buildFocus = (tasks: DayTask[]): string => {
  const hasStudy = tasks.some((task) => task.taskType === 'STUDY');
  const hasPhysical = tasks.some((task) => task.taskType === 'PHYSICAL');
  if (hasStudy) return 'Estudio';
  if (hasPhysical) return 'Entrenamiento';
  return 'Balanceado';
};

const buildClarification = (tasks: DayTask[], session: PlanningSession): string => {
  const notes: string[] = [];
  const constraints = session.intent?.emotionalConstraints || [];
  if (constraints.length) {
    notes.push(`Restricciones emocionales: ${constraints.join(', ')}.`);
  }
  const heavyTasksTime = session.intent?.preferences.heavyTasksTime;
  if (heavyTasksTime && heavyTasksTime !== 'unknown' && heavyTasksTime !== 'any') {
    const label = heavyTasksTime === 'morning' ? 'manana' : heavyTasksTime === 'afternoon' ? 'tarde' : 'noche';
    notes.push(`Preferencia: tareas pesadas por la ${label}.`);
  }
  if (session.intent?.preferences.fixedCommitments === 'yes') {
    notes.push('Hay compromisos fijos no detallados; evitar saturar el dia.');
  }
  const estimated = tasks
    .filter((task) => task.estimatedMinutes && task.estimatedMinutes > 0)
    .map((task) => `${task.title} (~${task.estimatedMinutes} min)`);
  if (estimated.length) {
    notes.push(`Duraciones estimadas: ${estimated.join(', ')}.`);
  }
  return notes.join(' ');
};

export async function buildMultiDayPlan(params: {
  session: PlanningSession;
  strategy: MultiDayStrategyResult;
  existingCalendar: CalendarBlock[];
  userId: string;
  prisma: PrismaClient;
}): Promise<MultiDayPlan> {
  const { session, strategy, existingCalendar, prisma, userId } = params;
  const intent = session.intent;
  if (!intent) {
    return { days: [], assumptions: strategy.assumptions, warnings: ['No se pudo interpretar la intencion.'] };
  }

  const days: Array<{ dayIndex: number; date: string; plan: SingleDayPlan }> = [];

  for (const day of strategy.days) {
    const bloquesExistentes = existingCalendar
      .filter((block) => block.date === day.date)
      .map((block) => ({
        id: block.id || `existing-${block.date}-${block.start}`,
        title: block.title,
        start: block.start,
        end: block.end,
        color: block.color || undefined,
      }));

    const tareasPersonalizadas = day.tasks.map((task, idx) => ({
      id: `custom-${day.dayIndex}-${idx}`,
      title: task.title,
      priority: task.priority || 'media',
    }));

    const input: PlanGenerateInput = {
      energia: mapEnergy(intent.preferences.energyPattern),
      foco: buildFocus(day.tasks),
      tiempoDisponible: 'todo-el-dia',
      intensidad: mapIntensity(intent.preferences.energyPattern, day.tasks.length),
      tareasImportantes: [],
      tareasPersonalizadas,
      incluirDescansos: true,
      aclaracionFinal: buildClarification(day.tasks, session),
      quiereNotificaciones: false,
      cantidadNotificaciones: 0,
      tiemposNotificaciones: [],
      fecha: day.date,
      bloquesExistentes: bloquesExistentes.length ? bloquesExistentes : undefined,
    };

    const plan = await generateDailyPlan({
      userId,
      data: input,
      prisma,
    });

    days.push({
      dayIndex: day.dayIndex,
      date: day.date,
      plan,
    });
  }

  return {
    days,
    assumptions: strategy.assumptions,
    warnings: [],
  };
}
