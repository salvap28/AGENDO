import { filterInputByRange } from './aggregation.js';
import { buildProfileInsights } from './insights.js';
import { computeFocusHeatmap, computePatterns } from './patterns.js';
import { buildWeeklySummary } from './weekly.js';
import { AgendoAiEngineResult, AiEngineInput } from './types.js';
import { buildEngineRecommendations, buildEngineTrends, computeExtendedMetrics } from './advanced.js';

export function runAgendoAiEngine(input: AiEngineInput): AgendoAiEngineResult {
  const filtered = filterInputByRange(input);
  const patterns = computePatterns(filtered.blocks, filtered.tasks, filtered.feedback, filtered.range);

  const profileInsights = buildProfileInsights(patterns, input.settings);
  const weeklySummary = buildWeeklySummary({
    blocks: filtered.blocks,
    tasks: filtered.tasks,
    feedback: filtered.feedback,
    range: filtered.range,
    patterns,
    settings: input.settings,
  });

  const focusHeatmap = computeFocusHeatmap(filtered.blocks, filtered.range.from, filtered.range.to);
  const extendedMetrics = computeExtendedMetrics(filtered.blocks, filtered.tasks, filtered.feedback, filtered.range);
  const trends = buildEngineTrends(filtered.blocks, filtered.tasks, filtered.feedback, filtered.range);
  const recommendations = buildEngineRecommendations(extendedMetrics, {
    bestFocusSlot: patterns.bestFocusSlot,
    strongestDay: patterns.dayPattern.strongestDay,
  });

  return {
    profileInsights,
    weeklySummary,
    focusHeatmap,
    extendedMetrics,
    recommendations,
    trends,
  };
}

export * from './types.js';
export * from './patterns.js';
