import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { Prisma } from '@prisma/client';
import { requireAuth } from './auth.js';
import { invalidateCoachCacheIfNeeded } from '../lib/coach-cache.js';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const RepeatRuleSchema = z
  .object({
    kind: z.enum(['daily', 'weekly', 'custom']),
    interval: z.number().int().min(1).default(1),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    endDate: z.string().regex(DATE_RE).optional(),
    count: z.number().int().min(1).optional(),
  })
  .strict();

const NotificationSchema = z.object({
  minutesBefore: z.union([z.number().int().min(0), z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) throw new Error('Invalid minutesBefore');
    return num;
  })]).pipe(z.number().int().min(0)),
});

const TaskCreateSchema = z.object({
  date: z.string().regex(DATE_RE),
  title: z.string().min(1).max(120),
  priority: z.string().max(40).optional(),
  repeatRule: RepeatRuleSchema.optional(),
  notifications: z.array(NotificationSchema).optional(),
});

const TaskUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  priority: z.string().max(40).optional(),
  done: z.boolean().optional(),
  repeatRule: RepeatRuleSchema.optional(),
  notifications: z.array(NotificationSchema).optional(),
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    
    // Primero, arreglar cualquier JSON inválido en la base de datos
    try {
      // Verificar si la columna existe antes de intentar actualizarla
      const tableInfo = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM pragma_table_info('Task') WHERE name = 'notifications'
      `;
      if (tableInfo.length > 0) {
        await prisma.$executeRaw`UPDATE "Task" SET notifications = NULL WHERE notifications IS NOT NULL AND notifications != '[]' AND json_valid(notifications) = 0`;
      }
    } catch (e) {
      // Ignorar errores silenciosamente - la columna puede no existir aún
      console.warn('[tasks GET] Could not fix invalid JSON:', e);
    }
    
    const where: any = { userId };
    if (from && to && DATE_RE.test(from) && DATE_RE.test(to)) {
      where.date = { gte: from, lte: to };
    }
    
    const items = await prisma.task.findMany({ 
      where, 
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] 
    });
    
    // Normalizar los items
    const normalizedItems = items.map((item: any) => {
      let notifications = null;
      if (item.notifications) {
        try {
          const notificationsStr = typeof item.notifications === 'string' ? item.notifications : JSON.stringify(item.notifications);
          const parsed = JSON.parse(notificationsStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            notifications = parsed;
          }
        } catch (e) {
          console.warn('[tasks GET] Error parsing notifications for task', item.id, e);
        }
      }
      
      let repeatRule = null;
      if (item.repeatRule) {
        try {
          const repeatRuleStr = typeof item.repeatRule === 'string' ? item.repeatRule : JSON.stringify(item.repeatRule);
          repeatRule = JSON.parse(repeatRuleStr);
        } catch (e) {
          console.warn('[tasks GET] Error parsing repeatRule for task', item.id, e);
        }
      }
      
      let repeatExceptions: string[] = [];
      if (item.repeatExceptions) {
        try {
          const exceptionsStr = typeof item.repeatExceptions === 'string' ? item.repeatExceptions : JSON.stringify(item.repeatExceptions);
          const parsed = JSON.parse(exceptionsStr);
          if (Array.isArray(parsed)) {
            repeatExceptions = parsed;
          }
        } catch (e) {
          console.warn('[tasks GET] Error parsing repeatExceptions for task', item.id, e);
        }
      }
      
      return {
        id: item.id,
        userId: item.userId,
        date: item.date,
        title: item.title,
        priority: item.priority,
        done: typeof item.done === 'boolean' ? item.done : Boolean(item.done),
        repeatRule,
        repeatExceptions,
        notifications,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });
    
    res.json({ items: normalizedItems });
  } catch (error) {
    console.error('[tasks GET] Error:', error);
    if (error instanceof Error) {
      console.error('[tasks GET] Error stack:', error.stack);
    }
    res.status(500).json({ 
      error: 'Error al obtener tareas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const parsed = TaskCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('[tasks POST] Validation error:', parsed.error);
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    
    // Normalizar notifications: array vacío o null se convierte en null para SQLite
    const notificationsData = parsed.data.notifications && parsed.data.notifications.length > 0
      ? parsed.data.notifications
      : null;

    const item = await prisma.task.create({
      data: {
        userId,
        date: parsed.data.date,
        title: parsed.data.title,
        priority: parsed.data.priority ?? null,
        repeatRule: (parsed.data.repeatRule ?? null) as any,
        repeatExceptions: [],
        notifications: notificationsData as any,
      },
    });
    // Invalidar cache del coach si la fecha está en el rango
    await invalidateCoachCacheIfNeeded(prisma, userId, parsed.data.date);
    res.json({ item });
  } catch (error) {
    console.error('[tasks POST] Error:', error);
    if (error instanceof Error) {
      console.error('[tasks POST] Error stack:', error.stack);
    }
    res.status(500).json({ 
      error: 'Error al crear la tarea',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const parsed = TaskUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const found = await prisma.task.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  const { repeatRule, notifications, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (repeatRule !== undefined) updateData.repeatRule = repeatRule as any;
  if (notifications !== undefined) {
    // Normalizar notifications: array vacío o null se convierte en null para SQLite
    updateData.notifications = notifications && notifications.length > 0
      ? notifications as any
      : null;
  }
  const item = await prisma.task.update({
    where: { id },
    data: updateData,
  });
  // Invalidar cache del coach si la fecha está en el rango
  await invalidateCoachCacheIfNeeded(prisma, userId, found.date);
  res.json({ item });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const found = await prisma.task.findUnique({ where: { id } });
  if (!found || found.userId !== userId) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  const taskDate = found.date;
  await prisma.task.delete({ where: { id } });
  // Invalidar cache del coach si la fecha está en el rango
  await invalidateCoachCacheIfNeeded(prisma, userId, taskDate);
  res.json({ ok: true });
});

const DeleteSeriesSchema = z.object({
  scope: z.enum(['single', 'count', 'all']),
  dates: z.array(z.string().regex(DATE_RE)).optional(),
});

router.post('/:id/delete', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const parsed = DeleteSeriesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const found = await prisma.task.findUnique({ where: { id } });
  if (!found || found.userId !== userId) return res.status(404).json({ error: 'No encontrado' });
  if (parsed.data.scope === 'all' || !found.repeatRule) {
    const taskDate = found.date;
    await prisma.task.delete({ where: { id } });
    // Invalidar cache del coach si la fecha está en el rango
    await invalidateCoachCacheIfNeeded(prisma, userId, taskDate);
    return res.json({ ok: true });
  }
  const dates = Array.from(
    new Set([...(found.repeatExceptions as string[] | null ?? []), ...(parsed.data.dates ?? [])]),
  );
  const item = await prisma.task.update({
    where: { id },
    data: { repeatExceptions: dates },
  });
  // Si alguna de las fechas eliminadas está en el rango, invalidar cache
  if (parsed.data.dates) {
    for (const date of parsed.data.dates) {
      await invalidateCoachCacheIfNeeded(prisma, userId, date);
    }
  }
  res.json({ item });
});

// Endpoint para eliminar todas las tareas de una fecha específica
router.delete('/date/:date/all', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { date } = req.params;
    
    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }
    
    // Eliminar todas las tareas del usuario para la fecha especificada
    const result = await prisma.task.deleteMany({
      where: {
        userId,
        date,
      },
    });
    
    // Invalidar cache del coach
    await invalidateCoachCacheIfNeeded(prisma, userId, date);
    
    console.log(`[tasks DELETE /date/:date/all] Eliminadas ${result.count} tareas para el usuario ${userId} en la fecha ${date}`);
    
    res.json({
      success: true,
      message: `Se eliminaron ${result.count} tarea(s)`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('[tasks DELETE /date/:date/all] Error:', error);
    res.status(500).json({
      error: 'Error al eliminar las tareas',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

export default router;
