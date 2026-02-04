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
  type BlockCategory,
} from '../../../../lib/agendo-ai-engine/index.js';
import { callGeminiChat } from '../../../../lib/gemini/client.js';
import { getAgendoSystemPrompt, getUserPromptForTone } from '../../../../lib/ollama/personality.js';

type TokenPayload = JwtPayload & { sub?: string; id?: string };

const prisma = new PrismaClient();
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev_secret_cambialo';

export async function POST(req: NextRequest) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { rangeFrom, rangeTo } = await getDateRange(req);
    if (!rangeFrom || !rangeTo) {
      return NextResponse.json({ error: 'Rango de fechas invalido' }, { status: 400 });
    }
    const fromDate = rangeFrom;
    const toDate = rangeTo;

    const fromYmd = formatYmd(fromDate);
    const toYmd = formatYmd(toDate);

    const [blockRecords, taskRecords, checkIns, completionRecords, onboarding] = await Promise.all([
      prisma.block.findMany({ where: { userId, date: { gte: fromYmd, lte: toYmd } } }),
      prisma.task.findMany({ where: { userId, date: { gte: fromYmd, lte: toYmd } } }),
      prisma.dailyMetric.findMany({ where: { userId, date: { gte: fromYmd, lte: toYmd } } }),
      prisma.completionFeedback.findMany({ where: { userId, instanceDate: { gte: fromYmd, lte: toYmd } } }),
      prisma.onboardingState.findUnique({
        where: { userId },
        select: { profileInfo: true, goals: true, aiSettings: true },
      }),
    ]);

    const settings = buildAiSettings(onboarding?.aiSettings);
    const completionByTask = latestCompletionByTask(completionRecords);

    const blocks = blockRecords.map<Block>((item) => ({
      id: item.id,
      userId,
      start: parseDateTime(item.date, item.start),
      end: parseDateTime(item.date, item.end),
      category: inferCategory(item.title, item.color),
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
      category: inferCategory(item.title, item.priority),
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
    const llmData = {
      profileInsights: result.profileInsights,
      weeklySummary: result.weeklySummary,
      focusHeatmap: result.focusHeatmap,
      onboarding: {
        profileInfo: onboarding?.profileInfo ?? null,
        goals: onboarding?.goals ?? null,
        aiSettings: settings,
      },
    };

    const userTone = settings.tone || 'warm';
    const messages = [
      {
        role: 'system' as const,
        content: getAgendoSystemPrompt(userTone),
      },
      {
        role: 'user' as const,
        content: getUserPromptForTone(userTone, settings.dailyReflectionQuestionEnabled).replace('{LLM_DATA}', JSON.stringify(llmData)),
      },
    ];

    const geminiResponse = await callGeminiChat({ messages, stream: false });
    const rawText =
      typeof geminiResponse?.message?.content === 'string'
        ? geminiResponse.message.content
        : geminiResponse?.content ?? '';

    const coach = normalizeCoachPayload(safeParseCoachJson(rawText));
    if (!coach) {
      return NextResponse.json({ message: 'El modelo devolvió un JSON inválido.', raw: rawText }, { status: 500 });
    }

    return NextResponse.json({
      message: 'OK',
      coach,
      engine: result,
    });
  } catch (error) {
    if (error instanceof Error && (error.message?.toLowerCase().includes('gemini') || error.message?.toLowerCase().includes('api'))) {
      return NextResponse.json(
        { message: 'Error al comunicarse con Google AI Studio', error: error.message },
        { status: 502 },
      );
    }
    console.error('[ai/coach] Error', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function getDateRange(req: NextRequest): Promise<{ rangeFrom: Date | null; rangeTo: Date | null }> {
  try {
    const body = await req.json();
    const fromParam = typeof body?.from === 'string' ? body.from : null;
    const toParam = typeof body?.to === 'string' ? body.to : null;
    if (fromParam && toParam) {
      const from = parseDate(fromParam);
      const to = parseDate(toParam);
      return { rangeFrom: from ?? null, rangeTo: to ?? null };
    }
  } catch {
    // ignore parse errors, fallback to current week
  }
  const currentWeek = currentWeekRange();
  return { rangeFrom: currentWeek.from, rangeTo: currentWeek.to };
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

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function inferCategory(title: string, tone?: string | null): BlockCategory {
  const normalized = (title || '').toLowerCase();
  const match = (list: string[]) => list.some((kw) => normalized.includes(kw));

  if (match(['estudio', 'estudiar', 'leer', 'facultad', 'curso', 'examen'])) return 'study';
  if (match(['reunion', 'reunión', 'meeting', 'work', 'trabajo', 'cliente', 'brief', 'proyecto'])) return 'work';
  if (match(['diseño', 'design', 'creativ', 'pintar', 'escribir', 'write', 'musica', 'música', 'video'])) return 'creative';
  if (match(['gym', 'gim', 'ejercicio', 'correr', 'run', 'yoga', 'meditar', 'salud', 'fisioterapia', 'fisio'])) return 'health';
  if (match(['familia', 'amigos', 'casa', 'hogar', 'personal', 'limpieza', 'compras'])) return 'personal';

  const toneHint = (tone || '').toLowerCase();
  if (toneHint.includes('turq') || toneHint.includes('teal')) return 'health';
  if (toneHint.includes('violet') || toneHint.includes('violeta')) return 'work';

  return 'other';
}

type CoachPayload = {
  weeklySummaryText: string;
  insights: string[];
  recommendations: string[];
  reflectionQuestion?: string; // Opcional: solo se incluye si dailyReflectionQuestionEnabled es true
};

function safeParseCoachJson(raw: string): unknown | null {
  const tryParse = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };
  const direct = tryParse(raw);
  if (direct) return direct;

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fencedParsed = tryParse(fencedMatch[1]);
    if (fencedParsed) return fencedParsed;
  }

  const braceMatch = raw.match(/{[\s\S]*}/);
  if (braceMatch?.[0]) {
    const braceParsed = tryParse(braceMatch[0]);
    if (braceParsed) return braceParsed;
  }
  return null;
}

function normalizeCoachPayload(raw: unknown): CoachPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const toText = (val: unknown) => (typeof val === 'string' ? val : '');
  const toList = (val: unknown) => (Array.isArray(val) ? val.map((item) => String(item)).filter(Boolean) : []);
  const result: CoachPayload = {
    weeklySummaryText: toText(obj.weeklySummaryText),
    insights: toList(obj.insights),
    recommendations: toList(obj.recommendations),
  };
  // Solo incluir reflectionQuestion si existe y no está vacío
  const reflectionQuestion = toText(obj.reflectionQuestion);
  if (reflectionQuestion) {
    result.reflectionQuestion = reflectionQuestion;
  }
  return result;
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

function buildAiSettings(raw: unknown): AiSettings {
  const tone = raw && typeof raw === 'object' && 'tone' in raw ? (raw as any).tone : undefined;
  const intervention =
    raw && typeof raw === 'object' && 'interventionLevel' in raw ? (raw as any).interventionLevel : undefined;
  const reflection =
    raw && typeof raw === 'object' && 'dailyReflectionQuestionEnabled' in raw
      ? (raw as any).dailyReflectionQuestionEnabled
      : undefined;

  const validTone: AiSettings['tone'] = tone === 'neutral' || tone === 'direct' ? tone : 'warm';
  const validIntervention: AiSettings['interventionLevel'] =
    intervention === 'low' || intervention === 'high' ? intervention : 'medium';
  const validReflection =
    typeof reflection === 'boolean' ? reflection : getDefaultAiSettings().dailyReflectionQuestionEnabled;

  return {
    tone: validTone,
    interventionLevel: validIntervention,
    dailyReflectionQuestionEnabled: validReflection,
  };
}
