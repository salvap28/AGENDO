import { NextRequest, NextResponse } from 'next/server';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import {
  AiEngineInput,
  AiSettings,
  Block,
  Task,
  CheckIn,
  CompletionFeedback,
  runAgendoAiEngine,
} from '../../../../lib/agendo-ai-engine/index.js';

type TokenPayload = JwtPayload & { sub?: string; id?: string };

const prisma = new PrismaClient();
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev_secret_cambialo';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { rangeFrom, rangeTo } = getDateRange(req);
    if (!rangeFrom || !rangeTo) {
      return NextResponse.json({ error: 'Rango de fechas inv\xE1lido' }, { status: 400 });
    }
    const fromDate = rangeFrom;
    const toDate = rangeTo;

    const fromYmd = formatYmd(fromDate);
    const toYmd = formatYmd(toDate);

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

    const blocks = blockRecords.map<Block>((item) => ({
      id: item.id,
      userId,
      start: parseDateTime(item.date, item.start),
      end: parseDateTime(item.date, item.end),
      category: 'other',
      plannedDurationMinutes: durationMinutes(item.start, item.end),
      actualDurationMinutes: undefined,
      completed: item.completed,
    }));

    const tasks = taskRecords.map<Task>((item) => ({
      id: item.id,
      userId,
      createdAt: item.createdAt,
      dueDate: parseDate(item.date),
      completedAt: completionByTask.get(item.id) ?? undefined,
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
      from: fromDate,
      to: toDate,
    };

    const result = runAgendoAiEngine(input);
    return NextResponse.json({
      profileInsights: result.profileInsights,
      weeklySummary: result.weeklySummary,
      focusHeatmap: result.focusHeatmap,
      extendedMetrics: result.extendedMetrics,
      recommendations: result.recommendations,
      trends: result.trends,
    });
  } catch (error) {
    console.error('[ai/summary] Error', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function getUserIdFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload.sub ?? payload.id ?? null;
  } catch {
    return null;
  }
}

function getDateRange(req: NextRequest): { rangeFrom: Date | null; rangeTo: Date | null } {
  const params = req.nextUrl.searchParams;
  const fromParam = params.get('from');
  const toParam = params.get('to');

  if (fromParam && toParam) {
    const from = parseDate(fromParam);
    const to = parseDate(toParam);
    return { rangeFrom: from ?? null, rangeTo: to ?? null };
  }

  if ((fromParam && !toParam) || (!fromParam && toParam)) {
    return { rangeFrom: null, rangeTo: null };
  }

  const currentWeek = currentWeekRange();
  return { rangeFrom: currentWeek.from, rangeTo: currentWeek.to };
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
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

function normalizeInterruptionCause(value: string | null | undefined): CompletionFeedback['interruptions']['cause'] {
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
