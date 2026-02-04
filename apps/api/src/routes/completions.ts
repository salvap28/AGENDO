import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireAuth } from './auth.js';
import { invalidateCoachCacheIfNeeded } from '../lib/coach-cache.js';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const CompletionSchema = z
  .object({
    taskId: z.string().cuid().optional(),
    blockId: z.string().cuid().optional(),
    instanceDate: z.string().regex(DATE_RE),
    feeling: z.enum(['excellent', 'good', 'neutral', 'tired', 'frustrated']),
    focus: z.enum(['yes', 'partial', 'no']),
    interrupted: z.boolean(),
    interruptionReason: z.enum(['notifications', 'people', 'fatigue', 'self', 'other']).optional().nullable(),
    timeDelta: z.enum(['more', 'equal', 'less']),
    note: z.string().max(80).optional().nullable(),
  })
  .strict();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const taskId = typeof req.query.taskId === 'string' ? req.query.taskId : undefined;
    const blockId = typeof req.query.blockId === 'string' ? req.query.blockId : undefined;

    if ((from && !to) || (!from && to)) {
      return res.status(400).json({ error: "Parámetros 'from' y 'to' requeridos juntos (YYYY-MM-DD)" });
    }
    if (from && to && (!DATE_RE.test(from) || !DATE_RE.test(to))) {
      return res.status(400).json({ error: "Formato de fecha inválido para 'from' o 'to'" });
    }

    const where: any = { userId };
    if (from && to) where.instanceDate = { gte: from, lte: to };
    if (taskId) where.taskId = taskId;
    if (blockId) where.blockId = blockId;

    const items = await prisma.completionFeedback.findMany({
      where,
      orderBy: [{ instanceDate: 'desc' }, { completedAt: 'desc' }],
    });
    res.json({ items });
  } catch (error) {
    console.error('[completions GET] Error:', error);
    res.status(500).json({ 
      error: 'Error al obtener completiones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = CompletionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { taskId, blockId, ...data } = parsed.data;
  if (!taskId && !blockId) {
    return res.status(400).json({ error: 'Debes enviar taskId o blockId' });
  }
  if (taskId && blockId) {
    return res.status(400).json({ error: 'Solo se puede finalizar una entidad a la vez' });
  }

  const task = taskId ? await prisma.task.findUnique({ where: { id: taskId } }) : null;
  if (taskId && (!task || task.userId !== userId)) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  const block = blockId ? await prisma.block.findUnique({ where: { id: blockId } }) : null;
  if (blockId && (!block || block.userId !== userId)) {
    return res.status(404).json({ error: 'Bloque no encontrado' });
  }

  const whereExisting = {
    userId,
    instanceDate: data.instanceDate,
    ...(taskId ? { taskId } : { blockId }),
  };

  const payload = {
    ...data,
    userId,
    taskId: taskId ?? null,
    blockId: blockId ?? null,
    note: data.note?.trim() || null,
    interruptionReason: data.interrupted ? data.interruptionReason ?? null : null,
    completedAt: new Date(),
  };

  const existing = await prisma.completionFeedback.findFirst({ where: whereExisting });
  const item = existing
    ? await prisma.completionFeedback.update({ where: { id: existing.id }, data: payload })
    : await prisma.completionFeedback.create({ data: payload });

  if (taskId && !task?.repeatRule) {
    await prisma.task.update({ where: { id: taskId }, data: { done: true } });
  }
  if (blockId && !block?.repeatRule) {
    await prisma.block.update({ where: { id: blockId }, data: { completed: true } });
  }

  // Invalidar cache del coach si la fecha está en el rango
  await invalidateCoachCacheIfNeeded(prisma, userId, data.instanceDate);

  res.json({ item });
});

export default router;
