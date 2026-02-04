import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { invalidateCoachCacheIfNeeded } from '../lib/coach-cache.js';
import { createPlanningSession, getPlanningSession, savePlanningSession, deletePlanningSession, addQuestion, addAnswer } from '../lib/planning/planningSession.js';
import { interpretUserIntent } from '../lib/planning/interpretIntent.js';
import { detectPlanningGaps, applyAnswerToIntent } from '../lib/planning/gaps.js';
import { selectNextQuestion } from '../lib/planning/questionSelector.js';
import { buildMultiDayStrategy } from '../lib/planning/multiDayStrategy.js';
import { buildMultiDayPlan } from '../lib/planning/multiDayOrchestrator.js';
import type { PlanningSession } from '../lib/planning/types.js';

const router = Router();
const prisma = new PrismaClient();

const MAX_QUESTIONS = 4;
type GeminiErrorPayload = { status: number; message: string; retryAfterSeconds?: number };

const getGeminiErrorPayload = (error: unknown): GeminiErrorPayload | null => {
  if (!(error instanceof Error)) return null;
  const message = error.message || '';
  const lower = message.toLowerCase();
  const isQuota =
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('429');
  if (!isQuota) return null;
  const retryMatch = lower.match(/retry in\s+([\d.]+)s/);
  const retryAfterSeconds = retryMatch ? Math.ceil(Number(retryMatch[1])) : undefined;
  const retrySuffix = retryAfterSeconds ? ` Reintenta en ~${retryAfterSeconds}s.` : '';
  return {
    status: 429,
    message: `Se excedio la cuota de Gemini.${retrySuffix} Intenta mas tarde o ajusta tu pedido.`,
    retryAfterSeconds,
  };
};

/**
 * POST /api/ai/intelligent-planning
 * Endpoint principal para la planeación inteligente 2.0
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { mode, rawText, contextDate, sessionId, questionId, answer, history } = req.body;

    if (mode === 'start') {
      return await handleStartSession(req, res, userId, rawText, contextDate);
    } else if (mode === 'continue') {
      return await handleContinueSession(req, res, userId, sessionId, questionId, answer, history);
    } else if (mode === 'finalize') {
      return await handleFinalizeSession(req, res, userId, sessionId, history);
    } else {
      return res.status(400).json({ error: 'Modo inválido' });
    }
  } catch (error) {
    console.error('[intelligent-planning] Error:', error);
    const geminiError = getGeminiErrorPayload(error);
    if (geminiError) {
      if (geminiError.retryAfterSeconds) {
        res.set('Retry-After', String(geminiError.retryAfterSeconds));
      }
      return res.status(geminiError.status).json({
        error: geminiError.message,
        retryAfterSeconds: geminiError.retryAfterSeconds,
      });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/ai/intelligent-planning/confirm
 * Confirmar y guardar el plan en el calendario
 * IMPORTANTE: Esta ruta debe ir ANTES de las rutas dinámicas
 */
router.post('/confirm', requireAuth, async (req, res) => {
  console.log('[intelligent-planning/confirm] Endpoint llamado');
  try {
    const userId = (req as any).userId as string;
    const { sessionId } = req.body;
    console.log('[intelligent-planning/confirm] sessionId:', sessionId);
    console.log('[intelligent-planning/confirm] userId:', userId);

    if (!sessionId) {
      console.log('[intelligent-planning/confirm] Error: sessionId no proporcionado');
      return res.status(400).json({ error: 'sessionId es requerido' });
    }

    const session = getPlanningSession(sessionId);
    console.log('[intelligent-planning/confirm] Sesion encontrada:', !!session);
    if (!session) {
      console.log('[intelligent-planning/confirm] Error: Sesion no encontrada');
      return res.status(404).json({ error: 'Sesion no encontrada' });
    }

    if (!session.multiDayPlan) {
      console.log('[intelligent-planning/confirm] Error: No hay plan en la sesion');
      return res.status(400).json({ error: 'No hay un plan para confirmar. Genera el plan primero.' });
    }
    console.log('[intelligent-planning/confirm] Plan encontrado, procesando...');

    const planDates = session.multiDayPlan.days.map((day: any) => day.date);
    const minDate = planDates.length > 0 ? planDates.sort()[0] : formatYmd(new Date());
    const maxDate = planDates.length > 0 ? planDates.sort().reverse()[0] : formatYmd(new Date());

    const existingBlocks = await prisma.block.findMany({
      where: {
        userId,
        date: {
          gte: minDate,
          lte: maxDate,
        },
      },
    });

    const existingBlocksMap = new Map<string, Set<string>>();
    existingBlocks.forEach((block) => {
      const key = block.date;
      if (!existingBlocksMap.has(key)) {
        existingBlocksMap.set(key, new Set());
      }
      existingBlocksMap.get(key)!.add(`${block.start}-${block.end}`);
    });

    const hasTimeConflict = (date: string, start: string, end: string): boolean => {
      const existingRanges = existingBlocksMap.get(date);
      if (!existingRanges) return false;

      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      const newStartMinutes = startH * 60 + startM;
      const newEndMinutes = endH * 60 + endM;

      for (const range of existingRanges) {
        const [existingStart, existingEnd] = range.split('-');
        const [existingStartH, existingStartM] = existingStart.split(':').map(Number);
        const [existingEndH, existingEndM] = existingEnd.split(':').map(Number);
        const existingStartMinutes = existingStartH * 60 + existingStartM;
        const existingEndMinutes = existingEndH * 60 + existingEndM;

        if (
          (newStartMinutes >= existingStartMinutes && newStartMinutes < existingEndMinutes) ||
          (newEndMinutes > existingStartMinutes && newEndMinutes <= existingEndMinutes) ||
          (newStartMinutes <= existingStartMinutes && newEndMinutes >= existingEndMinutes)
        ) {
          return true;
        }
      }

      return false;
    };

    const createdBlocks: any[] = [];
    const skippedBlocks: any[] = [];

    for (const day of session.multiDayPlan.days) {
      for (const block of day.plan.bloques) {
        const eventDate = day.date;
        const eventStartTime = block.inicio;
        const eventEndTime = block.fin;

        if (hasTimeConflict(eventDate, eventStartTime, eventEndTime)) {
          skippedBlocks.push({
            title: block.titulo,
            date: eventDate,
            start: eventStartTime,
            end: eventEndTime,
            reason: 'Conflicto con bloque existente',
          });
          continue;
        }

        try {
          const created = await prisma.block.create({
            data: {
              date: eventDate,
              start: eventStartTime,
              end: eventEndTime,
              title: block.titulo,
              color: block.color || null,
              userId,
              repeatRule: undefined,
              repeatExceptions: [],
              notifications: undefined,
            },
          });

          createdBlocks.push(created);
          await invalidateCoachCacheIfNeeded(prisma, userId, eventDate);
        } catch (error) {
          console.error(`[intelligent-planning/confirm] Error creando bloque para ${block.titulo}:`, error);
          skippedBlocks.push({
            title: block.titulo,
            date: eventDate,
            start: eventStartTime,
            end: eventEndTime,
            reason: 'Error al crear el bloque',
          });
        }
      }
    }

    deletePlanningSession(sessionId);

    console.log('[intelligent-planning/confirm] Plan confirmado exitosamente');
    console.log('[intelligent-planning/confirm] Bloques creados:', createdBlocks.length);
    console.log('[intelligent-planning/confirm] Bloques omitidos:', skippedBlocks.length);

    return res.json({
      success: true,
      created: createdBlocks.length,
      skipped: skippedBlocks.length,
      createdBlocks: createdBlocks.map((b) => ({
        id: b.id,
        title: b.title,
        date: b.date,
        start: b.start,
        end: b.end,
      })),
      skippedBlocks,
    });
  } catch (error) {
    console.error('[intelligent-planning/confirm] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/ai/intelligent-planning/step
 * Endpoint para el flujo de preguntas paso a paso
 */
router.post('/step', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { sessionId, lastQuestionId, lastAnswerOptionId, lastAnswerCustomValue, lastAnswerFreeText } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId es requerido' });
    }

    const session = getPlanningSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sesion no encontrada' });
    }

    if (!session.intent) {
      return res.status(400).json({ error: 'Sesion incompleta' });
    }

    const responseText = String(lastAnswerFreeText || lastAnswerCustomValue || lastAnswerOptionId || '').trim();

    if (lastQuestionId) {
      const question = session.questions.find((q) => q.id === lastQuestionId);
      const gapKey = question?.gapKey || session.gaps[0]?.key;
      if (gapKey && responseText) {
        addAnswer(session, lastQuestionId, gapKey, responseText);
        session.intent = applyAnswerToIntent(session.intent, gapKey, responseText);
      }
    }

    session.gaps = detectPlanningGaps(session.intent);

    const pendingQuestion = session.questions.find((q) => !session.answers.some((a) => a.questionId === q.id));
    if (!lastQuestionId && pendingQuestion) {
      return res.json({
        status: 'need_question',
        sessionId,
        question: buildFreeTextQuestionPayload({ id: pendingQuestion.id, text: pendingQuestion.text, options: pendingQuestion.options }),
        questionsAsked: session.questions.length,
        maxQuestions: MAX_QUESTIONS,
      });
    }

    if (session.gaps.length === 0 || session.questions.length >= MAX_QUESTIONS) {
      session.stage = 'planning';
      const plan = await finalizePlanningSession(session, userId);
      return res.json({
        status: 'final_plan',
        sessionId,
        plan,
      });
    }

    const nextQuestion = await selectNextQuestion({ session, gaps: session.gaps });
    if (nextQuestion) {
      addQuestion(session, nextQuestion.gapKey, nextQuestion.text, nextQuestion.options);
      const lastQuestion = session.questions[session.questions.length - 1];
      return res.json({
        status: 'need_question',
        sessionId,
        question: buildFreeTextQuestionPayload({ id: lastQuestion.id, text: lastQuestion.text, options: lastQuestion.options }),
        questionsAsked: session.questions.length,
        maxQuestions: MAX_QUESTIONS,
      });
    }

    const plan = await finalizePlanningSession(session, userId);
    return res.json({
      status: 'final_plan',
      sessionId,
      plan,
    });
  } catch (error) {
    console.error('[intelligent-planning/step] Error:', error);
    const geminiError = getGeminiErrorPayload(error);
    if (geminiError) {
      if (geminiError.retryAfterSeconds) {
        res.set('Retry-After', String(geminiError.retryAfterSeconds));
      }
      return res.status(geminiError.status).json({
        error: geminiError.message,
        retryAfterSeconds: geminiError.retryAfterSeconds,
      });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});


/**
 * GET /api/ai/intelligent-planning/:sessionId/plan
 * Obtener el plan final de una sesión
 * IMPORTANTE: Las rutas dinámicas deben ir DESPUÉS de las rutas específicas
 */
router.get('/:sessionId/plan', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = getPlanningSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sesion no encontrada' });
    }

    return res.json({ plan: session.multiDayPlan });
  } catch (error) {
    console.error('[intelligent-planning] Error obteniendo plan:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/ai/intelligent-planning/:sessionId/plan
 * Actualizar el plan de una sesión
 */
router.put('/:sessionId/plan', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'plan es requerido' });
    }

    const session = getPlanningSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sesion no encontrada' });
    }

    session.multiDayPlan = plan;
    savePlanningSession(session);

    return res.json({ success: true, plan });
  } catch (error) {
    console.error('[intelligent-planning] Error actualizando plan:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function handleStartSession(
  req: any,
  res: any,
  userId: string,
  rawText: string,
  contextDate?: string
) {
  const resolvedDate = contextDate || formatYmd(new Date());
  const session = createPlanningSession(rawText, resolvedDate);

  try {
    const intent = await interpretUserIntent(rawText);
    session.intent = intent;
    session.gaps = detectPlanningGaps(intent);

    if (intent.horizon === 'single_day') {
      deletePlanningSession(session.id);
      return res.json({ status: 'redirect_single_day', sessionId: session.id });
    }

    if (session.gaps.length === 0) {
      session.stage = 'planning';
      const plan = await finalizePlanningSession(session, userId);
      return res.json({
        status: 'final_plan',
        sessionId: session.id,
        plan,
      });
    }

    const nextQuestion = await selectNextQuestion({ session, gaps: session.gaps });
    if (nextQuestion) {
      addQuestion(session, nextQuestion.gapKey, nextQuestion.text, nextQuestion.options);
      session.stage = 'clarifying';
      savePlanningSession(session);
      const lastQuestion = session.questions[session.questions.length - 1];
      return res.json({
        status: 'need_question',
        sessionId: session.id,
        tasksPreview: buildTasksPreviewFromSession(session),
        question: buildFreeTextQuestionPayload({ id: lastQuestion.id, text: lastQuestion.text, options: lastQuestion.options }),
        questionsAsked: session.questions.length,
        maxQuestions: MAX_QUESTIONS,
      });
    }

    const plan = await finalizePlanningSession(session, userId);
    return res.json({
      status: 'final_plan',
      sessionId: session.id,
      plan,
    });
  } catch (error) {
    console.error('[intelligent-planning/start] Error:', error);
    deletePlanningSession(session.id);
    const geminiError = getGeminiErrorPayload(error);
    if (geminiError) {
      if (geminiError.retryAfterSeconds) {
        res.set('Retry-After', String(geminiError.retryAfterSeconds));
      }
      return res.status(geminiError.status).json({
        error: geminiError.message,
        retryAfterSeconds: geminiError.retryAfterSeconds,
      });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function handleContinueSession(
  req: any,
  res: any,
  userId: string,
  sessionId: string,
  questionId: string,
  answer: any,
  history: any
) {
  const session = getPlanningSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Sesion no encontrada' });
  }

  if (!session.intent) {
    return res.status(400).json({ error: 'Sesion incompleta' });
  }

  const responseText = typeof answer === 'string'
    ? answer
    : String(answer?.freeText || answer?.customValue || answer?.optionId || '').trim();

  if (questionId && responseText) {
    const question = session.questions.find((q) => q.id === questionId);
    const gapKey = question?.gapKey || session.gaps[0]?.key;
    if (gapKey) {
      addAnswer(session, questionId, gapKey, responseText);
      session.intent = applyAnswerToIntent(session.intent, gapKey, responseText);
    }
  }

  session.gaps = detectPlanningGaps(session.intent);

  if (session.gaps.length === 0 || session.questions.length >= MAX_QUESTIONS) {
    session.stage = 'planning';
    const plan = await finalizePlanningSession(session, userId);
    return res.json({
      status: 'final_plan',
      sessionId,
      plan,
    });
  }

  const nextQuestion = await selectNextQuestion({ session, gaps: session.gaps });
  if (nextQuestion) {
    addQuestion(session, nextQuestion.gapKey, nextQuestion.text, nextQuestion.options);
    const lastQuestion = session.questions[session.questions.length - 1];
    return res.json({
      status: 'need_question',
      sessionId,
      question: buildFreeTextQuestionPayload({ id: lastQuestion.id, text: lastQuestion.text, options: lastQuestion.options }),
      questionsAsked: session.questions.length,
      maxQuestions: MAX_QUESTIONS,
    });
  }

  const plan = await finalizePlanningSession(session, userId);
  return res.json({
    status: 'final_plan',
    sessionId,
    plan,
  });
}

async function finalizePlanningSession(session: PlanningSession, userId: string) {
  const existingCalendar = await getExistingCalendar(userId, session.contextDate);
  const strategy = buildMultiDayStrategy(session);
  session.meta.assumptions = [...session.meta.assumptions, ...strategy.assumptions];
  session.meta.ruleDecisions = [...session.meta.ruleDecisions, ...strategy.ruleDecisions];
  const plan = await buildMultiDayPlan({
    session,
    strategy,
    existingCalendar,
    userId,
    prisma,
  });
  session.multiDayPlan = plan;
  session.stage = 'final';
  savePlanningSession(session);
  return plan;
}

async function handleFinalizeSession(
  req: any,
  res: any,
  userId: string,
  sessionId: string,
  history: any
) {
  const session = getPlanningSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Sesion no encontrada' });
  }

  if (!session.intent) {
    return res.status(400).json({ error: 'Sesion incompleta' });
  }

  const plan = await finalizePlanningSession(session, userId);
  return res.json({ status: 'final_plan', sessionId, plan });
}

async function getExistingCalendar(userId: string, contextDate?: string) {
  const today = contextDate ? new Date(contextDate) : new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 1);
  const toDate = new Date(today);
  toDate.setDate(today.getDate() + 14); // Proximos 14 dias

  const blocks = await prisma.block.findMany({
    where: {
      userId,
      date: {
        gte: formatYmd(fromDate),
        lte: formatYmd(toDate),
      },
    },
    orderBy: { date: 'asc' },
  });

  return blocks.map((block) => ({
    id: block.id,
    date: block.date,
    start: block.start,
    end: block.end,
    title: block.title,
  }));
}

function buildTasksPreviewFromSession(session: PlanningSession): any[] {
  const intent = session.intent;
  if (!intent) return [];
  return intent.tasks.map((task, idx) => ({
    id: `intent_${idx + 1}`,
    title: task.title,
    detectedDate: undefined,
    taskType: task.taskType || 'OTHER',
    estimatedDuration: task.estimatedTotalMinutes ? Math.max(30, Math.round(task.estimatedTotalMinutes)) : undefined,
    priority: 'medium',
    confidence: typeof task.confidence === 'number' ? task.confidence : 0.6,
  }));
}

function buildFreeTextQuestionPayload(question: { id: string; text: string; options?: Array<{ id: string; label: string; allowsCustomValue?: boolean }> }) {
  return {
    id: question.id,
    text: question.text,
    relatedTaskId: null,
    options: question.options || [],
    canSkip: false,
    allowFreeTextAlone: true,
    freeTextPlaceholder: 'Escribi tu respuesta...',
  };
}

function formatYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default router;
