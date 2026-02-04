import {
  Block,
  CategoryBias,
  CategoryScore,
  CompletionFeedback,
  DayPatternResult,
  FocusHeatmap,
  RangeBounds,
  Task,
} from './types.js';
import {
  average,
  dayNameFromIndex,
  feelingValue,
  formatSlotLabel,
  humanizeCategory,
  isWithinRange,
  normalizeRange,
  startOfDay,
  endOfDay,
} from './utils.js';
import { blockDurationMinutes, buildFeedbackIndex, taskAnchorDate } from './aggregation.js';

export interface PatternResults {
  bestFocusSlot: string | null;
  dayPattern: DayPatternResult;
  topCategories: string[];
  categoryScores: CategoryScore[];
  estimationBias: CategoryBias[];
}

const HEATMAP_DAY_LABELS = ['Lun', 'Mar', 'Mi\u00e9', 'Jue', 'Vie', 'S\u00e1b', 'Dom'];
const HEATMAP_SLOT_START_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22];
const HEATMAP_SLOT_MINUTES = 120;

export function computeFocusHeatmap(blocks: Block[], from: Date, to: Date): FocusHeatmap {
  const slots = HEATMAP_SLOT_START_HOURS.map((hour) => formatSlotLabel(hour * 60, HEATMAP_SLOT_MINUTES));
  const matrix = Array.from({ length: 7 }, () => Array(slots.length).fill(0));
  if (!blocks.length) {
    return { days: HEATMAP_DAY_LABELS, slots, matrix };
  }

  const range = normalizeRange(from, to);

  for (const block of blocks) {
    if (!block.completed) continue;
    const effectiveDuration = blockDurationMinutes(block);
    if (!effectiveDuration) continue;

    const clampedStart = clampDate(block.start, range.from, range.to);
    const clampedEnd = clampDate(block.end, range.from, range.to);
    if (clampedEnd.getTime() <= clampedStart.getTime()) continue;

    const spanMinutes = minutesBetween(clampedStart, clampedEnd);
    if (spanMinutes <= 0) continue;
    const scale = effectiveDuration / spanMinutes;

    for (
      let dayCursor = startOfDay(clampedStart);
      dayCursor.getTime() <= clampedEnd.getTime();
      dayCursor = addDays(dayCursor, 1)
    ) {
      const dayStart = dayCursor;
      const dayEnd = endOfDay(dayCursor);
      const dayWindowStart = Math.max(clampedStart.getTime(), dayStart.getTime());
      const dayWindowEnd = Math.min(clampedEnd.getTime(), dayEnd.getTime());
      if (dayWindowEnd <= dayWindowStart) continue;

      const matrixRow = matrix[mondayFirstIndex(dayCursor.getDay())];
      for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
        const slotStartMs = hourOnDay(dayStart, HEATMAP_SLOT_START_HOURS[slotIdx]);
        const slotEndMs = hourOnDay(dayStart, HEATMAP_SLOT_START_HOURS[slotIdx] + 2);
        const overlapMs = overlapMillis(dayWindowStart, dayWindowEnd, slotStartMs, slotEndMs);
        if (overlapMs <= 0) continue;
        const minutes = (overlapMs / 60000) * scale;
        matrixRow[slotIdx] += minutes;
      }
    }
  }

  return { days: HEATMAP_DAY_LABELS, slots, matrix };
}

export function computePatterns(
  blocks: Block[],
  tasks: Task[],
  feedback: CompletionFeedback[],
  range: RangeBounds,
): PatternResults {
  const bestFocusSlot = computeBestFocusSlot(blocks, feedback);
  const dayPattern = computeStrongestAndWeakestDay(blocks, tasks, range);
  const { topCategories, scores: categoryScores } = computeTopCategories(blocks, tasks, feedback);
  const estimationBias = computeTimeEstimationBias(blocks, tasks, feedback);
  return { bestFocusSlot, dayPattern, topCategories, categoryScores, estimationBias };
}

export function computeBestFocusSlot(
  blocks: Block[],
  feedback: CompletionFeedback[],
  slotMinutes = 120,
): string | null {
  const completedBlocks = blocks.filter((block) => block.completed);
  if (!completedBlocks.length) return null;

  const feedbackIndex = buildFeedbackIndex(feedback);
  const slots = new Map<
    number,
    { focusMinutes: number; positiveFeedback: number; totalFeedback: number }
  >();

  for (const block of completedBlocks) {
    const duration = blockDurationMinutes(block);
    if (!duration) continue;

    const startMinutes = block.start.getHours() * 60 + block.start.getMinutes();
    const slotStart = Math.floor(startMinutes / slotMinutes) * slotMinutes;
    const current = slots.get(slotStart) ?? { focusMinutes: 0, positiveFeedback: 0, totalFeedback: 0 };

    current.focusMinutes += duration;
    const relatedFeedback = feedbackIndex.byBlock.get(block.id) ?? [];
    current.positiveFeedback += relatedFeedback.filter(
      (item) => item.focus === 'yes' && (item.feeling === 'excellent' || item.feeling === 'good'),
    ).length;
    current.totalFeedback += relatedFeedback.length;
    slots.set(slotStart, current);
  }

  if (!slots.size) return null;

  const scored = Array.from(slots.entries()).map(([slotStart, info]) => {
    const qualityRate = info.totalFeedback ? info.positiveFeedback / info.totalFeedback : 0.5;
    const score = info.focusMinutes * (0.7 + 0.3 * qualityRate);
    return { slotStart, qualityRate, focusMinutes: info.focusMinutes, score };
  });

  scored.sort((a, b) => {
    if (b.score === a.score) {
      return b.focusMinutes - a.focusMinutes;
    }
    return b.score - a.score;
  });

  return formatSlotLabel(scored[0]?.slotStart ?? 0, slotMinutes);
}

export function computeStrongestAndWeakestDay(
  blocks: Block[],
  tasks: Task[],
  range: RangeBounds,
): DayPatternResult {
  const metrics = Array.from({ length: 7 }, () => ({
    focusMinutes: 0,
    completedBlocks: 0,
    tasksCreatedOrDue: 0,
    tasksCompleted: 0,
  }));

  for (const block of blocks) {
    if (!block.completed) continue;
    const idx = block.start.getDay();
    metrics[idx].focusMinutes += blockDurationMinutes(block);
    metrics[idx].completedBlocks += 1;
  }

  for (const task of tasks) {
    const anchor = taskAnchorDate(task);
    if (isWithinRange(anchor, range)) {
      metrics[anchor.getDay()].tasksCreatedOrDue += 1;
    }
    if (task.completed && task.completedAt && isWithinRange(task.completedAt, range)) {
      metrics[task.completedAt.getDay()].tasksCompleted += 1;
    }
  }

  const dayScores = metrics.map((value, dayIndex) => {
    const denom = value.tasksCreatedOrDue || value.tasksCompleted;
    const completionRate = denom ? value.tasksCompleted / denom : 0;
    const focusHours = value.focusMinutes / 60;
    const score = focusHours * 10 + value.completedBlocks * 8 + completionRate * 100;
    return {
      dayIndex,
      dayName: dayNameFromIndex(dayIndex),
      completionRate,
      completedBlocks: value.completedBlocks,
      focusMinutes: value.focusMinutes,
      tasksCompleted: value.tasksCompleted,
      tasksCreatedOrDue: value.tasksCreatedOrDue,
      score,
    };
  });

  const activeDays = dayScores.filter(
    (day) =>
      day.focusMinutes > 0 ||
      day.tasksCreatedOrDue > 0 ||
      day.tasksCompleted > 0 ||
      day.completedBlocks > 0,
  );
  if (!activeDays.length) {
    return { strongestDay: null, weakestDay: null, dayScores };
  }

  const strongest = activeDays.reduce((best, day) => (day.score > best.score ? day : best), activeDays[0]);
  const weakest = activeDays.reduce((worst, day) => (day.score < worst.score ? day : worst), activeDays[0]);

  return {
    strongestDay: strongest.dayName,
    weakestDay: activeDays.length > 1 ? weakest.dayName : null,
    dayScores,
  };
}

export function computeTopCategories(
  blocks: Block[],
  tasks: Task[],
  feedback: CompletionFeedback[],
): { topCategories: string[]; scores: CategoryScore[] } {
  type CategoryTotals = {
    total: number;
    completed: number;
    focusYes: number;
    feedbackCount: number;
    feelings: number[];
  };
  const stats = new Map<string, CategoryTotals>();
  const ensure = (category: string): CategoryTotals => {
    const existing = stats.get(category);
    if (existing) return existing;
    const created: CategoryTotals = { total: 0, completed: 0, focusYes: 0, feedbackCount: 0, feelings: [] };
    stats.set(category, created);
    return created;
  };

  const feedbackIndex = buildFeedbackIndex(feedback);

  for (const block of blocks) {
    const entry = ensure(block.category);
    entry.total += 1;
    if (block.completed) entry.completed += 1;
    const fbList = feedbackIndex.byBlock.get(block.id) ?? [];
    if (fbList.length) {
      entry.feedbackCount += fbList.length;
      entry.focusYes += fbList.filter((item) => item.focus === 'yes').length;
      entry.feelings.push(...fbList.map((item) => feelingValue(item.feeling)));
    }
  }

  for (const task of tasks) {
    const entry = ensure(task.category);
    entry.total += 1;
    if (task.completed) entry.completed += 1;
    const fbList = feedbackIndex.byTask.get(task.id) ?? [];
    if (fbList.length) {
      entry.feedbackCount += fbList.length;
      entry.focusYes += fbList.filter((item) => item.focus === 'yes').length;
      entry.feelings.push(...fbList.map((item) => feelingValue(item.feeling)));
    }
  }

  const scores: CategoryScore[] = Array.from(stats.entries()).map(([category, stat]) => {
    const completionRate = stat.total ? stat.completed / stat.total : 0;
    const focusYesRate = stat.feedbackCount ? stat.focusYes / stat.feedbackCount : 0;
    const feelingAverage = average(stat.feelings);
    const normalizedFeeling = feelingAverage != null ? (feelingAverage - 1) / 4 : 0.5;
    const score = completionRate * 0.45 + focusYesRate * 0.35 + normalizedFeeling * 0.2;
    return {
      category: category as Block['category'],
      label: humanizeCategory(category as Block['category']),
      score,
      completionRate,
      feelingAverage,
      focusYesRate,
      sampleSize: stat.total + stat.feedbackCount,
    };
  });

  scores.sort((a, b) => b.score - a.score);
  const topCount = scores.length <= 1 ? scores.length : Math.min(3, scores.length);
  const topCategories = scores.slice(0, topCount).map((item) => item.label);

  return { topCategories, scores };
}

export function computeTimeEstimationBias(
  blocks: Block[],
  tasks: Task[],
  feedback: CompletionFeedback[],
): CategoryBias[] {
  const values = new Map<string, number[]>();
  const blockMap = new Map(blocks.map((b) => [b.id, b]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const pushValue = (category: string, delta: number) => {
    const arr = values.get(category) ?? [];
    arr.push(delta);
    values.set(category, arr);
  };

  for (const block of blocks) {
    if (!block.completed) continue;
    if (block.actualDurationMinutes == null || block.plannedDurationMinutes <= 0) continue;
    const delta = (block.actualDurationMinutes - block.plannedDurationMinutes) / block.plannedDurationMinutes;
    pushValue(block.category, delta);
  }

  for (const entry of feedback) {
    const category =
      (entry.blockId ? blockMap.get(entry.blockId)?.category : undefined) ??
      (entry.taskId ? taskMap.get(entry.taskId)?.category : undefined);
    if (!category) continue;
    const weight = timeComparisonDelta(entry.timeComparison);
    if (weight !== 0) {
      pushValue(category, weight);
    }
  }

  const biases: CategoryBias[] = Array.from(values.entries()).map(([category, deltas]) => {
    const avg = average(deltas) ?? 0;
    return {
      category: category as Block['category'],
      biasPercent: +((avg || 0) * 100).toFixed(1),
    };
  });

  biases.sort((a, b) => Math.abs(b.biasPercent) - Math.abs(a.biasPercent));
  return biases;
}

function timeComparisonDelta(comparison: CompletionFeedback['timeComparison']): number {
  if (comparison === 'more') return 0.15;
  if (comparison === 'less') return -0.15;
  return 0;
}

function mondayFirstIndex(day: number): number {
  return (day + 6) % 7;
}

function overlapMillis(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / 60000);
}

function hourOnDay(day: Date, hour: number): number {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function clampDate(value: Date, min: Date, max: Date): Date {
  const time = value.getTime();
  const clamped = Math.min(Math.max(time, min.getTime()), max.getTime());
  return new Date(clamped);
}
