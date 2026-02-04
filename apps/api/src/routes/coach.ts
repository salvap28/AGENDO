import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  AiEngineInput,
  AiSettings,
  Block,
  Task,
  CheckIn,
  CompletionFeedback,
  runAgendoAiEngine,
} from '../lib/agendo-ai-engine/index.js';
import { requireAuth } from '../middleware/auth.js';
import { callGeminiChat } from '../lib/gemini/client.js';
import { getAgendoSystemPrompt, getUserPromptForTone } from '../lib/ollama/personality.js';

let prismaClient: PrismaClient = new PrismaClient();
let callChat = callGeminiChat;
const router = Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { from, to } = req.body ?? {};
    const { rangeFrom, rangeTo } = resolveDateRange(from, to);
    if (!rangeFrom || !rangeTo) {
      return res.status(400).json({ error: 'Rango de fechas invalido' });
    }

    const fromYmd = formatYmd(rangeFrom);
    const toYmd = formatYmd(rangeTo);

    const [blockRecords, taskRecords, checkIns, completionRecords, onboarding] = await Promise.all([
      prismaClient.block.findMany({ where: { userId, date: { gte: fromYmd, lte: toYmd } } }),
      prismaClient.task.findMany({ where: { userId, date: { gte: fromYmd, lte: toYmd } } }),
      prismaClient.dailyMetric.findMany({ where: { userId, date: { gte: fromYmd, lte: toYmd } } }),
      prismaClient.completionFeedback.findMany({ where: { userId, instanceDate: { gte: fromYmd, lte: toYmd } } }),
      prismaClient.onboardingState.findUnique({
        where: { userId },
        select: { profileInfo: true, goals: true, aiSettings: true },
      }),
    ]);

    const settings = buildAiSettings(onboarding?.aiSettings);
    const completionByTask = latestCompletionByTask(completionRecords);

    const blocks = mapBlocks(blockRecords, userId);
    const tasks = mapTasks(taskRecords, completionByTask, userId);
    const mappedCheckIns = mapCheckIns(checkIns, userId);
    const feedback = mapFeedback(completionRecords);

    const engineInput: AiEngineInput = {
      blocks,
      tasks,
      checkIns: mappedCheckIns,
      feedback,
      settings,
      from: rangeFrom,
      to: rangeTo,
    };

    const engineResult = runAgendoAiEngine(engineInput);
    const llmData = buildCompactLlmData(engineResult, onboarding, settings);

    const messages = buildCoachMessages(llmData, settings.tone, settings.dailyReflectionQuestionEnabled);
    const ollamaResponse = await callChat({ messages, stream: false });
    const rawText =
      typeof ollamaResponse?.message?.content === 'string'
        ? ollamaResponse.message.content
        : ollamaResponse?.content ?? '';

    const coach = await parseOrRepairCoach(rawText, settings.dailyReflectionQuestionEnabled);
    if (!coach) {
      return res.status(500).json({ message: 'El modelo devolvio un JSON invalido.', raw: rawText });
    }

    return res.json({ message: 'OK', coach, engine: engineResult });
  } catch (error) {
    console.error('[ai/coach] Error', error);
    if (error instanceof Error && (error.message?.toLowerCase().includes('gemini') || error.message?.toLowerCase().includes('api'))) {
      return res.status(502).json({ message: 'Error al comunicarse con Google AI Studio', error: error.message });
    }
    return res.status(500).json({ error: 'Error interno' });
  }
});

function buildCoachMessages(llmData: Record<string, unknown>, tone: 'warm' | 'neutral' | 'direct' = 'warm', reflectionEnabled: boolean = true) {
  const onboardingData = (llmData.onboarding as any) || {};
  const aiSettings = onboardingData.aiSettings || {};
  const userTone = aiSettings.tone || tone;
  
  return [
    {
      role: 'system' as const,
      content: getAgendoSystemPrompt(userTone),
    },
    {
      role: 'user' as const,
      content: getUserPromptForTone(userTone, reflectionEnabled).replace('{LLM_DATA}', JSON.stringify(llmData)),
    },
  ];
}

function resolveDateRange(fromParam?: string | null, toParam?: string | null): { rangeFrom: Date | null; rangeTo: Date | null } {
  if (fromParam && toParam) {
    const from = parseDate(fromParam);
    const to = parseDate(toParam);
    return { rangeFrom: from ?? null, rangeTo: to ?? null };
  }
  const currentWeek = currentWeekRange();
  return { rangeFrom: currentWeek.from, rangeTo: currentWeek.to };
}

function mapBlocks(records: any[], userId: string): Block[] {
  return records.map((item) => ({
    id: item.id,
    userId,
    start: parseDateTime(item.date, item.start),
    end: parseDateTime(item.date, item.end),
    category: 'other',
    plannedDurationMinutes: durationMinutes(item.start, item.end),
    actualDurationMinutes: undefined,
    completed: item.completed,
  }));
}

function mapTasks(records: any[], completionByTask: Map<string, Date>, userId: string): Task[] {
  return records.map((item) => ({
    id: item.id,
    userId,
    createdAt: item.createdAt,
    dueDate: parseDate(item.date),
    completedAt: completionByTask.get(item.id) ?? undefined,
    category: 'other',
    completed: item.done,
  }));
}

function mapCheckIns(records: any[], userId: string): CheckIn[] {
  return records.map((item) => ({
    id: item.id,
    userId,
    date: item.date,
    completed: true,
  }));
}

function mapFeedback(records: any[]): CompletionFeedback[] {
  return records.map((item) => ({
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

type CoachPayload = {
  weeklySummaryText: string;
  insights: string[];
  recommendations: string[];
  reflectionQuestion?: string; // Opcional: solo se incluye si dailyReflectionQuestionEnabled es true
};

function normalizeCoachPayload(raw: unknown): CoachPayload {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
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

export function __setCoachDeps(deps: { prisma?: PrismaClient; callGeminiChat?: typeof callGeminiChat }) {
  if (deps.prisma) prismaClient = deps.prisma;
  if (deps.callGeminiChat) callChat = deps.callGeminiChat;
}

function buildCompactLlmData(
  engineResult: ReturnType<typeof runAgendoAiEngine>,
  onboarding: { profileInfo: unknown; goals: unknown; aiSettings: unknown } | null,
  settings: AiSettings,
) {
  const compactProfileInsights = {
    bestFocusSlot: engineResult.profileInsights.bestFocusSlot,
    strongestDay: engineResult.profileInsights.strongestDay,
    weakestDay: engineResult.profileInsights.weakestDay,
    topCategories: (engineResult.profileInsights.topCategories ?? []).slice(0, 3),
    recommendations: (engineResult.profileInsights.recommendations ?? []).slice(0, 3),
  };

  const compactWeeklySummary = {
    weekRangeLabel: engineResult.weeklySummary.weekRangeLabel,
    totalFocusMinutes: engineResult.weeklySummary.totalFocusMinutes,
    completedBlocks: engineResult.weeklySummary.completedBlocks,
    completedTasks: engineResult.weeklySummary.completedTasks,
    completionRatePercent: engineResult.weeklySummary.completionRatePercent,
    highlight: engineResult.weeklySummary.highlight,
    lowlight: engineResult.weeklySummary.lowlight,
    suggestions: (engineResult.weeklySummary.suggestions ?? []).slice(0, 3),
  };

  return {
    profileInsights: compactProfileInsights,
    weeklySummary: compactWeeklySummary,
    onboarding: {
      profileInfo: onboarding?.profileInfo ?? null,
      goals: onboarding?.goals ?? null,
      aiSettings: settings,
    },
  };
}

async function parseOrRepairCoach(rawText: string, reflectionEnabled: boolean = true): Promise<CoachPayload | null> {
  const parsed = safeParseCoachJson(rawText);
  if (parsed) return normalizeCoachPayload(parsed);

  // Reintenta una sola vez pidiendo al LLM que envíe JSON válido a partir de su salida previa.
  const repairMessages = buildRepairMessages(rawText, reflectionEnabled);
  try {
    const repaired = await callChat({ messages: repairMessages, stream: false });
    const repairedText =
      typeof repaired?.message?.content === 'string'
        ? repaired.message.content
        : repaired?.content ?? '';
    const repairedParsed = safeParseCoachJson(repairedText);
    return repairedParsed ? normalizeCoachPayload(repairedParsed) : null;
  } catch (error) {
    console.error('[ai/coach] Reparacion de JSON fallo', error);
    return null;
  }
}

function buildRepairMessages(rawText: string, reflectionEnabled: boolean = true) {
  const reflectionField = reflectionEnabled ? `
  "reflectionQuestion": ""` : '';
  return [
    {
      role: 'system' as const,
      content:
        'Eres un asistente que repara la salida previa del modelo para que sea un JSON EXACTO con el esquema solicitado. Solo responde el JSON, sin texto extra.',
    },
    {
      role: 'user' as const,
      content: `
Repara la siguiente salida para que sea JSON valido y cumpla exactamente este esquema:
{
  "weeklySummaryText": "",
  "insights": ["", "", ""],
  "recommendations": ["", "", ""]${reflectionField}
}

Salida previa a reparar:
${rawText}

Devuelve unicamente el JSON valido, sin comentarios ni texto adicional.
      `.trim(),
    },
  ];
}

export default router;
