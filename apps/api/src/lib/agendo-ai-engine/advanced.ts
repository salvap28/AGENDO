import {
  AbandonmentStats,
  Block,
  CategoryHeatmap,
  CategoryMetric,
  CategoryStackBar,
  CompletionFeedback,
  ConsistencyMetrics,
  DeepFocusIndex,
  FeelingInsight,
  HabitScore,
  InterruptionInsight,
  EnergyHourPoint,
  EngineRecommendations,
  EngineRecommendationItem,
  EngineTrends,
  EstimationVariance,
  ExtendedMetrics,
  GoalInsight,
  OddDayFlag,
  PlannedVsSpontaneous,
  PlanningInsight,
  RangeBounds,
  Task,
  TimelineEntry,
  TrendPoint,
  WeeklyComparison,
} from './types.js';
import {
  dayNameFromIndex,
  formatSlotLabel,
  isWithinRange,
} from './utils.js';
import { blockDurationMinutes, buildFeedbackIndex, taskAnchorDate } from './aggregation.js';
import { computeFocusHeatmap } from './patterns.js';

const SLOT_MINUTES = 120;

export function computeExtendedMetrics(
  blocks: Block[],
  tasks: Task[],
  feedback: CompletionFeedback[],
  range: RangeBounds,
): ExtendedMetrics {
  const byCategory = computeCategoryMetrics(blocks, feedback);
  const energyCurve = computeEnergyCurve(blocks, feedback);
  const consistency = computeConsistency(blocks, range);
  const estimationVariance = computeEstimationVariance(blocks);
  const oddDays = detectOddDays(blocks, feedback, range);
  const plannedVsSpontaneous = computePlannedVsSpontaneous(blocks);
  const abandonment = computeAbandonment(blocks);
  const deepFocus = computeDeepFocus(blocks, feedback);
  const habits = computeHabits(blocks);
  const interruptions = computeInterruptionInsight(blocks, feedback);
  const feelings = computeFeelingInsight(blocks, feedback, range);
  const goals = computeGoalInsight(tasks, range);
  const planning = computePlanningInsight(abandonment, energyCurve, goals);
  const burnoutRisk = computeBurnoutRisk(feelings, deepFocus);
  const dayClusters = clusterDays(blocks, feedback, range);
  const phase = computePhase(consistency, deepFocus, goals);
  const perceptionVsReality = buildPerceptionVsReality(feelings, energyCurve);
  return {
    byCategory,
    energyCurve,
    consistency,
    estimationVariance,
    oddDays,
    plannedVsSpontaneous,
    abandonment,
    deepFocus,
    habits,
    interruptions,
    feelings,
    goals,
    planning,
    burnoutRisk,
    dayClusters,
    phase,
    perceptionVsReality,
  };
}

export function buildEngineTrends(blocks: Block[], tasks: Task[], feedback: CompletionFeedback[], range: RangeBounds): EngineTrends {
  return {
    categoryHeatmaps: computeCategoryHeatmaps(blocks, range),
    focusTrend: computeFocusTrend(blocks, tasks, range),
    stackedFocus: computeStackedFocus(blocks),
    timeline: buildTimeline(blocks, feedback),
    weeklyComparison: computeWeeklyComparison(blocks, range),
  };
}

export function buildEngineRecommendations(
  metrics: ExtendedMetrics,
  patterns: { bestFocusSlot: string | null; strongestDay: string | null },
): EngineRecommendations {
  return {
    planning: buildPlanningRecommendations(metrics, patterns),
    interruptions: buildInterruptionRecommendations(metrics),
    recovery: buildRecoveryRecommendations(metrics),
    habits: buildHabitRecommendations(metrics),
  };
}

function computeCategoryMetrics(blocks: Block[], feedback: CompletionFeedback[]): CategoryMetric[] {
  const stats = new Map<
    string,
    {
      total: number;
      completed: number;
      duration: number;
      focusYes: number;
      feedbackCount: number;
      feelingSum: number;
    }
  >();
  const fbIndex = buildFeedbackIndex(feedback);
  for (const block of blocks) {
    const entry =
      stats.get(block.category) ??
      { total: 0, completed: 0, duration: 0, focusYes: 0, feedbackCount: 0, feelingSum: 0 };
    entry.total += 1;
    entry.duration += blockDurationMinutes(block);
    if (block.completed) entry.completed += 1;
    const fbList = fbIndex.byBlock.get(block.id) ?? [];
    entry.feedbackCount += fbList.length;
    entry.focusYes += fbList.filter((f) => f.focus === 'yes').length;
    entry.feelingSum += fbList.reduce((acc, f) => acc + feelingValueSafe(f.feeling), 0);
    stats.set(block.category, entry);
  }

  return Array.from(stats.entries()).map(([category, s]) => ({
    category: category as Block['category'],
    completionRate: s.total ? s.completed / s.total : 0,
    averageDurationMinutes: s.total ? s.duration / s.total : 0,
    focusYesRate: s.feedbackCount ? s.focusYes / s.feedbackCount : 0,
    averageFeeling: s.feedbackCount ? s.feelingSum / s.feedbackCount : null,
  }));
}

function computeEnergyCurve(blocks: Block[], feedback: CompletionFeedback[]): EnergyHourPoint[] {
  const fbIndex = buildFeedbackIndex(feedback);
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, score: 0, weight: 0 }));
  for (const block of blocks) {
    const fbList = fbIndex.byBlock.get(block.id) ?? [];
    const baseFocus = fbList.filter((f) => f.focus === 'yes').length ? 1 : 0;
    const feeling = averageFeeling(fbList);
    const interruptions = fbList.filter((f) => f.interruptions?.hadInterruptions).length;
    const completion = block.completed ? 1 : 0;
    const hour = block.start.getHours();
    const energy = completion * 0.3 + baseFocus * 0.3 + feeling * 0.3 - interruptions * 0.2;
    hours[hour].score += energy;
    hours[hour].weight += 1;
  }
  return hours.map((h) => ({
    hour: h.hour,
    score: h.weight ? h.score / h.weight : 0,
  }));
}

function computeConsistency(blocks: Block[], _range: RangeBounds): ConsistencyMetrics {
  const dayMinutes = Array.from({ length: 7 }, () => 0);
  for (const block of blocks) {
    if (!block.completed) continue;
    const idx = block.start.getDay();
    dayMinutes[idx] += blockDurationMinutes(block);
  }
  const activeDays = dayMinutes.filter((m) => m > 0).length;
  const avg = dayMinutes.reduce((a, b) => a + b, 0) / 7;
  const variance =
    dayMinutes.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (dayMinutes.length || 1);
  const daysAbove = dayMinutes.filter((m) => m >= 60).length;
  return {
    activeDays,
    focusVariance: variance,
    stable: variance < 60 * 60,
    daysAboveThreshold: daysAbove,
  };
}

function computeEstimationVariance(blocks: Block[]): EstimationVariance {
  const values: number[] = [];
  const byCategory = new Map<string, number[]>();
  for (const block of blocks) {
    if (block.actualDurationMinutes == null || block.plannedDurationMinutes <= 0) continue;
    const delta = block.actualDurationMinutes - block.plannedDurationMinutes;
    values.push(delta);
    const arr = byCategory.get(block.category) ?? [];
    arr.push(delta);
    byCategory.set(block.category, arr);
  }
  const overallStd = stdDev(values);
  return {
    overallStd,
    byCategory: Array.from(byCategory.entries()).map(([category, vals]) => ({
      category: category as Block['category'],
      std: stdDev(vals),
      sampleSize: vals.length,
    })),
  };
}

function detectOddDays(blocks: Block[], feedback: CompletionFeedback[], range: RangeBounds): OddDayFlag[] {
  const dayFocus = Array.from({ length: 7 }, () => 0);
  const dayInterruptions = Array.from({ length: 7 }, () => 0);
  const dayFeeling: number[][] = Array.from({ length: 7 }, () => []);
  const fbIndex = buildFeedbackIndex(feedback);

  for (const block of blocks) {
    if (!isWithinRange(block.start, range)) continue;
    const idx = block.start.getDay();
    dayFocus[idx] += blockDurationMinutes(block);
    const fbList = fbIndex.byBlock.get(block.id) ?? [];
    if (fbList.length) {
      dayInterruptions[idx] += fbList.filter((f) => f.interruptions?.hadInterruptions).length;
      dayFeeling[idx].push(...fbList.map((f) => feelingValueSafe(f.feeling)));
    }
  }

  const focusAvg = average(dayFocus);
  const interruptsAvg = average(dayInterruptions);
  const feelingAvg = average(dayFeeling.flat());

  const flags: OddDayFlag[] = [];
  for (let i = 0; i < 7; i++) {
    const reasons: string[] = [];
    if (focusAvg != null && Math.abs(dayFocus[i] - focusAvg) > focusAvg * 0.6) {
      reasons.push('foco atipico');
    }
    if (interruptsAvg != null && Math.abs(dayInterruptions[i] - interruptsAvg) > Math.max(1, interruptsAvg)) {
      reasons.push('interrupciones atipicas');
    }
    const dayFeelAvg = average(dayFeeling[i]);
    if (feelingAvg != null && dayFeelAvg != null && Math.abs(dayFeelAvg - feelingAvg) > 0.8) {
      reasons.push('estado animo atipico');
    }
    if (reasons.length) {
      flags.push({ dayIndex: i, reason: reasons });
    }
  }
  return flags;
}

function computePlannedVsSpontaneous(blocks: Block[]): PlannedVsSpontaneous {
  let planned = 0;
  let spontaneous = 0;
  for (const block of blocks) {
    const duration = blockDurationMinutes(block);
    if (!duration) continue;
    if (block.plannedDurationMinutes > 0) planned += duration;
    else spontaneous += duration;
  }
  const total = planned + spontaneous || 1;
  return { plannedMinutes: planned, spontaneousMinutes: spontaneous, plannedRatio: planned / total };
}

function computeAbandonment(blocks: Block[]): AbandonmentStats {
  const byCategory = new Map<string, number>();
  const bySlot = new Map<string, number>();
  for (const block of blocks) {
    if (block.completed) continue;
    const slotLabel = formatSlotLabel(block.start.getHours() * 60, SLOT_MINUTES);
    byCategory.set(block.category, (byCategory.get(block.category) ?? 0) + 1);
    bySlot.set(slotLabel, (bySlot.get(slotLabel) ?? 0) + 1);
  }
  const totalAbandoned = Array.from(byCategory.values()).reduce((a, b) => a + b, 0);
  return {
    totalAbandoned,
    byCategory: Array.from(byCategory.entries()).map(([category, count]) => ({ category: category as Block['category'], count })),
    bySlot: Array.from(bySlot.entries()).map(([slotLabel, count]) => ({ slotLabel, count })),
  };
}

function computeDeepFocus(blocks: Block[], feedback: CompletionFeedback[]): DeepFocusIndex {
  const fbIndex = buildFeedbackIndex(feedback);
  let qualifying = 0;
  let longBlocks = 0;
  for (const block of blocks) {
    if (!block.completed) continue;
    const duration = blockDurationMinutes(block);
    if (duration >= 40) longBlocks += 1;
    if (duration < 40) continue;
    const fb = fbIndex.byBlock.get(block.id) ?? [];
    const focusYes = fb.filter((f) => f.focus === 'yes').length;
    const interruptions = fb.filter((f) => f.interruptions?.hadInterruptions).length;
    const feeling = averageFeeling(fb);
    if (focusYes > 0 && interruptions === 0 && feeling >= 3.5) {
      qualifying += 1;
    }
  }
  const score = longBlocks ? qualifying / longBlocks : 0;
  return { score, longBlocks, qualifyingBlocks: qualifying };
}

function computeHabits(blocks: Block[]): HabitScore[] {
  const byCategory = new Map<string, { days: Set<string>; streak: number }>();
  const byDayCategory = new Map<string, Set<string>>();
  for (const block of blocks) {
    if (!block.completed) continue;
    const dayKey = formatDay(block.start);
    const set = byDayCategory.get(dayKey) ?? new Set<string>();
    set.add(block.category);
    byDayCategory.set(dayKey, set);
  }

  const sortedDays = Array.from(byDayCategory.keys()).sort();
  const streaks = new Map<string, number>();
  for (const day of sortedDays) {
    const categories = byDayCategory.get(day) ?? new Set();
    for (const cat of categories) {
      const prev = streaks.get(cat) ?? 0;
      streaks.set(cat, prev + 1);
    }
  }

  for (const block of blocks) {
    if (!block.completed) continue;
    const entry = byCategory.get(block.category) ?? { days: new Set<string>(), streak: streaks.get(block.category) ?? 0 };
    entry.days.add(formatDay(block.start));
    byCategory.set(block.category, entry);
  }

  return Array.from(byCategory.entries()).map(([category, info]) => {
    const freq = info.days.size;
    const score = Math.min(10, Math.round((freq / 7) * 10 + info.streak * 0.5));
    return { category: category as Block['category'], score, streak: info.streak };
  });
}

function computeInterruptionInsight(blocks: Block[], feedback: CompletionFeedback[]): InterruptionInsight {
  const fbIndex = buildFeedbackIndex(feedback);
  const causeMap = new Map<string, number>();
  const hourMap = new Map<number, number>();
  const byCategory = new Map<string, number>();
  const pseudo: string[] = [];

  for (const block of blocks) {
    const fbList = fbIndex.byBlock.get(block.id) ?? [];
    const interruptions = fbList.filter((f) => f.interruptions?.hadInterruptions);
    if (!interruptions.length) {
      if (blockDurationMinutes(block) <= 30 && fbList.some((f) => f.focus !== 'yes')) {
        pseudo.push(block.id);
      }
      continue;
    }
    for (const fb of interruptions) {
      const cause = fb.interruptions?.cause ?? 'otros';
      causeMap.set(cause, (causeMap.get(cause) ?? 0) + 1);
    }
    const hour = block.start.getHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + interruptions.length);
    byCategory.set(block.category, (byCategory.get(block.category) ?? 0) + interruptions.length);
  }

  const topCauses = Array.from(causeMap.entries())
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const vulnerableHours = Array.from(hourMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  return {
    topCauses,
    vulnerableHours,
    byCategory: Array.from(byCategory.entries()).map(([category, interruptions]) => ({
      category: category as Block['category'],
      interruptions,
    })),
    pseudoFocusBlocks: pseudo,
  };
}

function computeFeelingInsight(
  blocks: Block[],
  feedback: CompletionFeedback[],
  range: RangeBounds,
): FeelingInsight {
  const fbIndex = buildFeedbackIndex(feedback);
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, feelings: [] as number[] }));
  const byCategory = new Map<string, number[]>();
  const perDay: { focus: number; feeling: number[] }[] = Array.from({ length: 7 }, () => ({ focus: 0, feeling: [] }));

  const completedFeel: number[] = [];
  const uncompletedFeel: number[] = [];

  for (const block of blocks) {
    const fbList = fbIndex.byBlock.get(block.id) ?? [];
    const feelingList = fbList.map((f) => feelingValueSafe(f.feeling));
    if (block.completed) {
      completedFeel.push(...feelingList);
    } else {
      uncompletedFeel.push(...feelingList);
    }
    const hour = block.start.getHours();
    hours[hour].feelings.push(...feelingList);
    const catList = byCategory.get(block.category) ?? [];
    catList.push(...feelingList);
    byCategory.set(block.category, catList);

    if (isWithinRange(block.start, range)) {
      const idx = block.start.getDay();
      perDay[idx].focus += blockDurationMinutes(block);
      perDay[idx].feeling.push(...feelingList);
    }
  }

  const completionCorrelation = correlation(completedFeel, uncompletedFeel);
  const highlightDays = perDay
    .map((day, idx) => ({
      dayIndex: idx,
      focusMinutes: day.focus,
      feeling: average(day.feeling),
    }))
    .filter((d) => (d.feeling ?? 0) >= 3.5 && d.focusMinutes >= 60)
    .sort((a, b) => (b.focusMinutes || 0) - (a.focusMinutes || 0))
    .slice(0, 3);

  const avgFeeling = average(completedFeel);
  const positiveVsProductive =
    avgFeeling != null && avgFeeling >= 3.8
      ? 'positivo'
      : avgFeeling != null && avgFeeling < 3
      ? 'productivo'
      : 'balanceado';

  return {
    curve: hours.map((h) => ({ hour: h.hour, score: average(h.feelings) ?? 0 })),
    byCategory: Array.from(byCategory.entries()).map(([category, feelings]) => ({
      category: category as Block['category'],
      feeling: average(feelings),
    })),
    completionCorrelation,
    positiveVsProductive,
    highlightDays,
  };
}

function computeGoalInsight(tasks: Task[], range: RangeBounds): GoalInsight {
  const inRange = tasks.filter((t) => isWithinRange(taskAnchorDate(t), range));
  const total = inRange.length || 1;
  const completed = inRange.filter((t) => t.completed).length;
  const progressPercent = completed / total;
  const dayCount = Math.max(1, (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedRatio = Math.min(1, dayCount ? (Date.now() - range.from.getTime()) / (range.to.getTime() - range.from.getTime()) : 0.5);
  const projectionPercent = elapsedRatio ? Math.min(1, progressPercent / elapsedRatio) : progressPercent;
  let adjustment: GoalInsight['adjustment'] = 'mantener';
  if (projectionPercent > 1.2) adjustment = 'subir';
  else if (projectionPercent < 0.6) adjustment = 'bajar';

  const byCategory = new Map<string, { total: number; completed: number }>();
  for (const task of inRange) {
    const entry = byCategory.get(task.category) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (task.completed) entry.completed += 1;
    byCategory.set(task.category, entry);
  }

  const abandoned = inRange.filter((t) => !t.completed && t.dueDate && t.dueDate < new Date()).map((t) => t.id);

  return {
    progressPercent,
    projectionPercent,
    adjustment,
    byCategory: Array.from(byCategory.entries()).map(([category, val]) => ({
      category: category as Task['category'],
      progress: val.total ? val.completed / val.total : 0,
    })),
    abandoned,
  };
}

function computePlanningInsight(
  abandonment: AbandonmentStats,
  energyCurve: EnergyHourPoint[],
  goals: GoalInsight,
): PlanningInsight {
  const bestHours = [...energyCurve].sort((a, b) => b.score - a.score).slice(0, 2).map((h) => h.hour);
  const goldSlots = bestHours.map((h) => formatSlotLabel(h * 60, SLOT_MINUTES));
  const overloadDays: number[] = [];
  const bundlingSuggested = goals.byCategory.some((g) => g.progress < 0.4) || goals.abandoned.length > 3;
  const suggestedReplans = abandonment.totalAbandoned
    ? abandonment.bySlot.slice(0, 2).map((s) => `Mover bloque pendiente a ${s.slotLabel}`)
    : [];

  return { goldSlots, overloadDays, bundlingSuggested, suggestedReplans };
}

function computeBurnoutRisk(feelings: FeelingInsight, deepFocus: DeepFocusIndex): number {
  const avgFeeling = average(
    feelings.curve.map((p) => p.score).filter((v) => v !== null && v !== undefined) as number[],
  ) ?? 0;
  const risk = Math.max(0, Math.min(1, (deepFocus.score > 0.7 ? 0.3 : 0) + (avgFeeling < 3 ? 0.5 : 0) + (avgFeeling < 2.5 ? 0.2 : 0)));
  return risk;
}

function clusterDays(blocks: Block[], feedback: CompletionFeedback[], range: RangeBounds): { dayIndex: number; label: 'calm' | 'heavy' | 'chaotic' }[] {
  const fbIndex = buildFeedbackIndex(feedback);
  const scores = Array.from({ length: 7 }, () => ({ focus: 0, interruptions: 0 }));
  for (const block of blocks) {
    if (!isWithinRange(block.start, range)) continue;
    const idx = block.start.getDay();
    scores[idx].focus += blockDurationMinutes(block);
    const fb = fbIndex.byBlock.get(block.id) ?? [];
    scores[idx].interruptions += fb.filter((f) => f.interruptions?.hadInterruptions).length;
  }
  return scores.map((s, idx) => {
    const label: 'calm' | 'heavy' | 'chaotic' =
      s.focus > 240 && s.interruptions > 1 ? 'chaotic' : s.focus > 240 ? 'heavy' : 'calm';
    return { dayIndex: idx, label };
  });
}

function computePhase(consistency: ConsistencyMetrics, deepFocus: DeepFocusIndex, goals: GoalInsight): 'inicio' | 'consolidacion' | 'estancamiento' {
  if (consistency.activeDays < 3) return 'inicio';
  if (deepFocus.score > 0.5 && goals.progressPercent > 0.5 && consistency.stable) return 'consolidacion';
  return 'estancamiento';
}

function buildPerceptionVsReality(feelings: FeelingInsight, energyCurve: EnergyHourPoint[]) {
  const bestSlot = energyCurve.slice().sort((a, b) => b.score - a.score)[0]?.hour ?? null;
  return {
    perceivedSlot: null,
    bestSlot: bestSlot != null ? formatSlotLabel(bestSlot * 60, SLOT_MINUTES) : null,
    alignment: false,
  };
}

function computeCategoryHeatmaps(blocks: Block[], range: RangeBounds): CategoryHeatmap[] {
  const byCategory = new Map<string, Block[]>();
  for (const block of blocks) {
    if (!isWithinRange(block.start, range)) continue;
    const arr = byCategory.get(block.category) ?? [];
    arr.push(block);
    byCategory.set(block.category, arr);
  }
  return Array.from(byCategory.entries()).map(([category, items]) => ({
    category: category as Block['category'],
    heatmap: computeFocusHeatmap(items, range.from, range.to),
  }));
}

function computeFocusTrend(blocks: Block[], tasks: Task[], range: RangeBounds): TrendPoint[] {
  const dayMetrics = Array.from({ length: 7 }, () => ({ focusMinutes: 0, completed: 0, planned: 0 }));
  for (const block of blocks) {
    if (!isWithinRange(block.start, range)) continue;
    const idx = block.start.getDay();
    dayMetrics[idx].focusMinutes += blockDurationMinutes(block);
    dayMetrics[idx].planned += 1;
    if (block.completed) dayMetrics[idx].completed += 1;
  }
  return dayMetrics.map((m, idx) => ({
    label: dayNameFromIndex(idx),
    focusMinutes: m.focusMinutes,
    completionRate: m.planned ? m.completed / m.planned : 0,
  }));
}

function computeStackedFocus(blocks: Block[]): CategoryStackBar[] {
  const totals = new Map<string, number>();
  for (const block of blocks) {
    totals.set(block.category, (totals.get(block.category) ?? 0) + blockDurationMinutes(block));
  }
  return Array.from(totals.entries()).map(([category, minutes]) => ({
    category: category as Block['category'],
    minutes,
  }));
}

function buildTimeline(blocks: Block[], feedback: CompletionFeedback[]): TimelineEntry[] {
  const fbIndex = buildFeedbackIndex(feedback);
  return blocks.map<TimelineEntry>((block) => {
    const fb = fbIndex.byBlock.get(block.id) ?? [];
    return {
      blockId: block.id,
      start: block.start,
      end: block.end,
      category: block.category,
      focusMinutes: blockDurationMinutes(block),
      feeling: averageFeeling(fb),
      interruptions: fb.filter((f) => f.interruptions?.hadInterruptions).length,
    };
  });
}

function computeWeeklyComparison(blocks: Block[], range: RangeBounds): WeeklyComparison {
  const midTs = range.from.getTime() + (range.to.getTime() - range.from.getTime()) / 2;
  let firstHalf = 0;
  let secondHalf = 0;
  for (const block of blocks) {
    if (!block.completed) continue;
    const duration = blockDurationMinutes(block);
    if (block.start.getTime() <= midTs) firstHalf += duration;
    else secondHalf += duration;
  }
  const baseline = firstHalf || secondHalf;
  const trendScore = baseline ? (secondHalf - firstHalf) / baseline : 0;
  return {
    currentFocus: secondHalf,
    baselineFocus: firstHalf,
    trendScore,
  };
}

function buildPlanningRecommendations(
  metrics: ExtendedMetrics,
  patterns: { bestFocusSlot: string | null; strongestDay: string | null },
): EngineRecommendationItem[] {
  const recs: EngineRecommendationItem[] = [];
  if (metrics.abandonment.totalAbandoned > 0) {
    recs.push({
      title: 'Reprograma los bloques pendientes',
      description: `Detectamos ${metrics.abandonment.totalAbandoned} bloques sin completar. Llévalos a tu mejor franja ${patterns.bestFocusSlot ?? 'de mayor energia'} y al día ${patterns.strongestDay ?? 'con menos carga'}.`,
      tag: 'plan',
    });
  }
  if (metrics.consistency.stable === false) {
    recs.push({
      title: 'Sube consistencia',
      description: 'Tu variabilidad de foco entre días es alta. Intenta reservar al menos 60 minutos diarios en la misma franja.',
      tag: 'consistencia',
    });
  }
  if (metrics.deepFocus.score < 0.4) {
    recs.push({
      title: 'Practica bloques largos',
      description: 'Pocos bloques alcanzan foco profundo. Agenda 1-2 bloques >40min en tu mejor horario y protégelos de interrupciones.',
      tag: 'deep-focus',
    });
  }
  return recs;
}

function buildInterruptionRecommendations(metrics: ExtendedMetrics): EngineRecommendationItem[] {
  const recs: EngineRecommendationItem[] = [];
  const worstSlot = metrics.abandonment.bySlot.sort((a, b) => b.count - a.count)[0];
  if (worstSlot && worstSlot.count > 1) {
    recs.push({
      title: 'Protege tu horario vulnerable',
      description: `Hay mas abandono/interrupciones en ${worstSlot.slotLabel}. Activa modo foco o cambia tareas exigentes a otro horario.`,
      tag: 'interrupciones',
    });
  }
  if (metrics.plannedVsSpontaneous.plannedRatio < 0.4) {
    recs.push({
      title: 'Planifica antes de empezar',
      description: 'Gran parte de tu foco es espontáneo. Define 2-3 bloques clave el día anterior para reducir interrupciones.',
      tag: 'planificacion',
    });
  }
  return recs;
}

function buildRecoveryRecommendations(metrics: ExtendedMetrics): EngineRecommendationItem[] {
  const recs: EngineRecommendationItem[] = [];
  if (metrics.consistency.daysAboveThreshold >= 5 && metrics.consistency.activeDays >= 6) {
    recs.push({
      title: 'Agenda descanso activo',
      description: 'Llevas muchos días activos. Programa un bloque liviano o de recuperación para evitar sobreesfuerzo.',
      tag: 'recuperacion',
    });
  }
  if (metrics.energyCurve.some((h) => h.score < 0)) {
    recs.push({
      title: 'Cuida tus horas bajas',
      description: 'Identificamos horas con energía negativa. Ubica pausas o tareas triviales ahí.',
      tag: 'energia',
    });
  }
  return recs;
}

function buildHabitRecommendations(metrics: ExtendedMetrics): EngineRecommendationItem[] {
  const recs: EngineRecommendationItem[] = [];
  const weakCategory = metrics.byCategory.sort((a, b) => a.completionRate - b.completionRate)[0];
  if (weakCategory && weakCategory.completionRate < 0.5) {
    recs.push({
      title: `Micro-hábito para ${weakCategory.category}`,
      description: `Empieza con bloques cortos de ${Math.max(15, Math.round(weakCategory.averageDurationMinutes || 20))} minutos en esa categoría para construir racha.`,
      tag: 'habitos',
    });
  }
  if (metrics.deepFocus.score > 0.7) {
    recs.push({
      title: 'Aprovecha tu foco profundo',
      description: 'Tus bloques largos funcionan bien. Usa esa ventana para tareas estratégicas y aprende tu duración ideal.',
      tag: 'fortaleza',
    });
  }
  return recs;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function averageFeeling(list: CompletionFeedback[]): number {
  if (!list.length) return 0;
  return list.reduce((acc, f) => acc + feelingValueSafe(f.feeling), 0) / list.length;
}

function feelingValueSafe(feeling: CompletionFeedback['feeling']): number {
  switch (feeling) {
    case 'excellent':
      return 5;
    case 'good':
      return 4;
    case 'neutral':
      return 3;
    case 'tired':
      return 2;
    case 'frustrated':
      return 1;
    default:
      return 3;
  }
}

function stdDev(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function formatDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function correlation(pos: number[], neg: number[]): number {
  if (!pos.length || !neg.length) return 0;
  const avgPos = average(pos) ?? 0;
  const avgNeg = average(neg) ?? 0;
  return avgPos - avgNeg;
}
