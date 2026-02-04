import {
  AiSettings,
  CompletionFeedback,
  RangeBounds,
  WeeklySummaryResult,
  Block,
  Task,
  CategoryBias,
} from './types.js';
import { PatternResults } from './patterns.js';
import { blockDurationMinutes, taskAnchorDate } from './aggregation.js';
import { formatWeekRangeLabel, humanizeCategory, isWithinRange } from './utils.js';

interface InterruptionStats {
  topCause: string | null;
  rate: number;
}

interface WeeklySummaryParams {
  blocks: Block[];
  tasks: Task[];
  feedback: CompletionFeedback[];
  range: RangeBounds;
  patterns: PatternResults;
  settings: AiSettings;
}

export function buildWeeklySummary({
  blocks,
  tasks,
  feedback,
  range,
  patterns,
  settings,
}: WeeklySummaryParams): WeeklySummaryResult {
  const completedBlocks = blocks.filter((block) => block.completed);
  const totalFocusMinutes = completedBlocks.reduce((acc, block) => acc + blockDurationMinutes(block), 0);
  const completedBlocksCount = completedBlocks.length;

  const completedTasks = tasks.filter(
    (task) => task.completed && task.completedAt && isWithinRange(task.completedAt, range),
  );
  const completedTasksCount = completedTasks.length;
  const tasksCreatedOrDue = tasks.filter((task) => isWithinRange(taskAnchorDate(task), range)).length;
  const completionRatePercent = tasksCreatedOrDue
    ? +((completedTasksCount / tasksCreatedOrDue) * 100).toFixed(1)
    : 0;

  const rangeLabel = formatWeekRangeLabel(range.from, range.to);
  const interruptionStats = computeInterruptionStats(feedback);
  const bias = patterns.estimationBias.find((item) => Math.abs(item.biasPercent) >= 12);

  const weeklySummary: WeeklySummaryResult = {
    weekRangeLabel: rangeLabel,
    totalFocusMinutes,
    completedBlocks: completedBlocksCount,
    completedTasks: completedTasksCount,
    completionRatePercent,
    highlight: pickHighlight(patterns),
    lowlight: pickLowlight(patterns, interruptionStats, bias),
    suggestions: buildSuggestions({
      patterns,
      interruptionStats,
      completionRatePercent,
      bias,
      settings,
    }),
  };

  if (!weeklySummary.lowlight) {
    delete weeklySummary.lowlight;
  }

  return weeklySummary;
}

function pickHighlight(patterns: PatternResults): string {
  if (patterns.bestFocusSlot) {
    return `Bloques más sólidos entre ${patterns.bestFocusSlot}.`;
  }
  if (patterns.topCategories.length) {
    return `Lo mejor de la semana vino de ${patterns.topCategories[0]}.`;
  }
  if (patterns.dayPattern.strongestDay) {
    return `Mejor día: ${patterns.dayPattern.strongestDay}.`;
  }
  return 'Semana con progreso estable.';
}

function pickLowlight(
  patterns: PatternResults,
  interruption: InterruptionStats,
  bias?: CategoryBias,
): string | undefined {
  if (patterns.dayPattern.weakestDay) {
    return `Día flojo: ${patterns.dayPattern.weakestDay}.`;
  }
  if (interruption.topCause) {
    return `Interrupciones frecuentes por ${humanizeInterruptionCause(interruption.topCause)}.`;
  }
  if (bias && Math.abs(bias.biasPercent) >= 15) {
    const direction = bias.biasPercent > 0 ? 'subestimación' : 'sobreestimación';
    return `Ajusta tus tiempos de ${humanizeCategory(bias.category)} (${direction} de ~${Math.abs(
      bias.biasPercent,
    )}%).`;
  }
  return undefined;
}

function buildSuggestions({
  patterns,
  interruptionStats,
  completionRatePercent,
  bias,
  settings,
}: {
  patterns: PatternResults;
  interruptionStats: InterruptionStats;
  completionRatePercent: number;
  bias?: CategoryBias;
  settings: AiSettings;
}): string[] {
  const suggestions: string[] = [];
  const desired = pickSuggestionCount(settings);

  if (patterns.bestFocusSlot) {
    suggestions.push(`Agenda bloques exigentes entre ${patterns.bestFocusSlot} y protegé esa ventana de distracciones.`);
  }

  if (patterns.dayPattern.weakestDay) {
    suggestions.push(
      `Define ${patterns.dayPattern.weakestDay} como día de tareas ligeras o repaso y mové lo crítico a tu día fuerte.`,
    );
  }

  if (interruptionStats.topCause) {
    suggestions.push(
      `Arma un protocolo simple contra ${humanizeInterruptionCause(
        interruptionStats.topCause,
      )} (modo silencio, avisos previos, puerta cerrada).`,
    );
  }

  if (bias && Math.abs(bias.biasPercent) >= 10) {
    const label = humanizeCategory(bias.category);
    if (bias.biasPercent > 0) {
      suggestions.push(`Sumá ~${Math.abs(bias.biasPercent)}% al plan de ${label} para llegar con aire.`);
    } else {
      suggestions.push(`Reducí la duración planificada de ${label} en ~${Math.abs(bias.biasPercent)}% y mantené la cadencia.`);
    }
  }

  if (completionRatePercent < 75) {
    suggestions.push('Recorta la entrada de tareas nuevas hasta subir tu tasa de cierre por encima del 75%.');
  }

  if (!settings.dailyReflectionQuestionEnabled) {
    suggestions.push('Activa la pregunta diaria de reflexión para capturar contexto y ajustar tus planes rápido.');
  }

  const fallback = [
    'Cierra cada bloque con una nota de interrupciones y cómo las evitaste.',
    'Agrupa tareas administrativas en un solo bloque para liberar las franjas de mayor foco.',
    'Prepara tu bloque inicial con materiales listos la noche anterior.',
    'Revisa tus categorías fuertes al final de la semana y agenda dos bloques similares para la próxima.',
  ];

  for (const item of fallback) {
    if (suggestions.length >= desired) break;
    if (!suggestions.includes(item)) {
      suggestions.push(item);
    }
  }

  const target = Math.max(2, desired);
  return suggestions.slice(0, target);
}

function computeInterruptionStats(feedback: CompletionFeedback[]): InterruptionStats {
  if (!feedback.length) {
    return { topCause: null, rate: 0 };
  }
  const interruptions = feedback.filter((item) => item.interruptions?.hadInterruptions);
  if (!interruptions.length) {
    return { topCause: null, rate: 0 };
  }
  const causeCount = interruptions.reduce((acc, item) => {
    const cause = item.interruptions.cause ?? 'other';
    acc[cause] = (acc[cause] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topCause = Object.entries(causeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const rate = interruptions.length / feedback.length;
  return { topCause, rate };
}

function humanizeInterruptionCause(cause: string): string {
  switch (cause) {
    case 'notifications':
      return 'notificaciones';
    case 'people':
      return 'interrupciones de personas';
    case 'fatigue':
      return 'fatiga';
    case 'self-distraction':
      return 'auto-distracciones';
    default:
      return 'otras causas';
  }
}

function pickSuggestionCount(settings: AiSettings): number {
  if (settings.interventionLevel === 'high') return 5;
  if (settings.interventionLevel === 'medium') return 4;
  return 3;
}
