import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import {
  AiEngineInput,
  AiSettings,
  Block,
  Task,
  CheckIn,
  CompletionFeedback,
  runAgendoAiEngine,
} from '../lib/agendo-ai-engine/index.js';

const router = Router();
const prisma = new PrismaClient();

function isDebug(req: any) {
  const flag = process.env.AGENDO_AI_DEBUG;
  if (flag === 'true' || flag === '1') return true;
  const q = typeof req?.query?.debug === 'string' ? req.query.debug : undefined;
  return q === '1' || q === 'true';
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { rangeFrom, rangeTo, error } = getDateRange(req.query);
    if (error || !rangeFrom || !rangeTo) {
      return res.status(400).json({ error: 'Parǭmetros from/to invǭlidos. Usa ISO o no envíes ninguno para la semana actual.' });
    }

    const fromYmd = formatYmd(rangeFrom);
    const toYmd = formatYmd(rangeTo);

    const [blockRecords, taskRecords, checkIns, completionRecords] = await Promise.all([
      prisma.block.findMany({
        where: { userId, date: { gte: fromYmd, lte: toYmd } },
      }),
      prisma.task.findMany({
        where: { userId, date: { gte: fromYmd, lte: toYmd } },
      }),
      prisma.dailyMetric.findMany({
        where: { userId, date: { gte: fromYmd, lte: toYmd } },
      }),
      prisma.completionFeedback.findMany({
        where: { userId, instanceDate: { gte: fromYmd, lte: toYmd } },
      }),
    ]);

    const settings = getDefaultAiSettings();
    const completionByTask = latestCompletionByTask(completionRecords);

    const blocks: Block[] = blockRecords.map((item) => ({
      id: item.id,
      userId,
      start: parseDateTime(item.date, item.start),
      end: parseDateTime(item.date, item.end),
      category: 'other',
      plannedDurationMinutes: durationMinutes(item.start, item.end),
      actualDurationMinutes: undefined,
      completed: item.completed,
    }));

    const tasks: Task[] = taskRecords.map((item) => ({
      id: item.id,
      userId,
      createdAt: item.createdAt,
      dueDate: parseDate(item.date),
      completedAt: completionByTask.get(item.id) ?? (item.done ? parseDate(item.date) : undefined),
      category: 'other',
      completed: item.done,
    }));

    const mappedCheckIns: CheckIn[] = checkIns.map((item) => ({
      id: item.id,
      userId,
      date: item.date,
      completed: true,
    }));

    const feedback: CompletionFeedback[] = completionRecords.map((item) => ({
      blockId: item.blockId ?? undefined,
      taskId: item.taskId ?? undefined,
      completedAt: item.completedAt,
      feeling: normalizeFeeling(item.feeling),
      focus: normalizeFocus(item.focus),
      interruptions: {
        hadInterruptions: item.interrupted,
        cause: normalizeInterruptionCause(item.interruptionReason),
      },
      timeComparison: normalizeTimeComparison(item.timeDelta),
      note: item.note ?? undefined,
    }));

    const input: AiEngineInput = {
      blocks,
      tasks,
      checkIns: mappedCheckIns,
      feedback,
      settings,
      from: rangeFrom,
      to: rangeTo,
    };

    const result = runAgendoAiEngine(input);

    if (isDebug(req)) {
      console.log(
        `[aiSummary] user=${userId} range=${fromYmd}..${toYmd} blocks=${blocks.length} tasks=${tasks.length} checkIns=${mappedCheckIns.length} feedback=${feedback.length}`,
      );
    }

    res.json({
      profileInsights: result.profileInsights,
      weeklySummary: result.weeklySummary,
      focusHeatmap: result.focusHeatmap,
      extendedMetrics: result.extendedMetrics,
      recommendations: result.recommendations,
      trends: result.trends,
    });
  } catch (err) {
    console.error('[ai/summary] Error', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

function getDateRange(query: Record<string, any>): { rangeFrom?: Date; rangeTo?: Date; error?: boolean } {
  const fromParam = typeof query.from === 'string' ? query.from : undefined;
  const toParam = typeof query.to === 'string' ? query.to : undefined;

  if (fromParam && toParam) {
    const from = parseDate(fromParam);
    const to = parseDate(toParam);
    if (!from || !to) return { error: true };
    return { rangeFrom: from, rangeTo: to };
  }

  if ((fromParam && !toParam) || (!fromParam && toParam)) {
    return { error: true };
  }

  const week = lastWeekRange();
  return { rangeFrom: week.from, rangeTo: week.to };
}

function parseDate(value: string): Date | undefined {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function durationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function currentWeekRange(): { from: Date; to: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - diffToMonday);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function lastWeekRange(): { from: Date; to: Date } {
  const { from: thisMonday } = currentWeekRange();
  const from = new Date(thisMonday);
  from.setDate(from.getDate() - 7);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}


function normalizeFeeling(value: string): CompletionFeedback['feeling'] {
  if (value === 'excellent' || value === 'good' || value === 'neutral' || value === 'tired' || value === 'frustrated') {
    return value;
  }
  return 'neutral';
}

function normalizeFocus(value: string): CompletionFeedback['focus'] {
  if (value === 'yes' || value === 'partial' || value === 'no') return value;
  return 'partial';
}

function normalizeTimeComparison(value: string): CompletionFeedback['timeComparison'] {
  if (value === 'more' || value === 'equal' || value === 'less') return value;
  return 'equal';
}

function normalizeInterruptionCause(
  value: string | null | undefined,
): CompletionFeedback['interruptions']['cause'] {
  switch (value) {
    case 'notifications':
    case 'people':
    case 'fatigue':
      return value;
    case 'self':
      return 'self-distraction';
    default:
      return undefined;
  }
}

function latestCompletionByTask(records: { taskId: string | null; completedAt: Date }[]): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const item of records) {
    if (!item.taskId) continue;
    const existing = map.get(item.taskId);
    if (!existing || existing.getTime() < item.completedAt.getTime()) {
      map.set(item.taskId, item.completedAt);
    }
  }
  return map;
}

function getDefaultAiSettings(): AiSettings {
  return {
    tone: 'warm',
    interventionLevel: 'medium',
    dailyReflectionQuestionEnabled: true,
  };
}

export default router;
