
import { Router } from 'express';
import { prisma } from '../index.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireAuth } from './auth.js';
import { invalidateCoachCacheIfNeeded } from '../lib/coach-cache.js';

const router = Router();

const RepeatRuleSchema = z
  .object({
    kind: z.enum(['daily', 'weekly', 'custom']),
    interval: z.number().int().min(1).default(1),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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

const BlockCreate = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  title: z.string().min(1),
  color: z.string().optional(),
  repeatRule: RepeatRuleSchema.optional(),
  notifications: z.array(NotificationSchema).optional(),
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    
    // Primero, arreglar cualquier JSON inválido en la base de datos
    try {
      // Verificar si la columna existe antes de intentar actualizarla
      const tableInfo = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM pragma_table_info('Block') WHERE name = 'notifications'
      `;
      if (tableInfo.length > 0) {
        await prisma.$executeRaw`UPDATE "Block" SET notifications = NULL WHERE notifications IS NOT NULL AND notifications != '[]' AND json_valid(notifications) = 0`;
      }
    } catch (e) {
      // Ignorar errores silenciosamente - la columna puede no existir aún
      console.warn('[blocks GET] Could not fix invalid JSON:', e);
    }
    
    const where: any = { userId };
    if (from && to && DATE_RE.test(from) && DATE_RE.test(to)) {
      where.date = { gte: from, lte: to };
    }
    
    const items = await prisma.block.findMany({ 
      where, 
      orderBy: [{ date: 'asc' }, { start: 'asc' }] 
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
          console.warn('[blocks GET] Error parsing notifications for block', item.id, e);
        }
      }
      
      let repeatRule = null;
      if (item.repeatRule) {
        try {
          const repeatRuleStr = typeof item.repeatRule === 'string' ? item.repeatRule : JSON.stringify(item.repeatRule);
          repeatRule = JSON.parse(repeatRuleStr);
        } catch (e) {
          console.warn('[blocks GET] Error parsing repeatRule for block', item.id, e);
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
          console.warn('[blocks GET] Error parsing repeatExceptions for block', item.id, e);
        }
      }
      
      return {
        id: item.id,
        userId: item.userId,
        date: item.date,
        start: item.start,
        end: item.end,
        title: item.title,
        color: item.color,
        completed: typeof item.completed === 'boolean' ? item.completed : Boolean(item.completed),
        repeatRule,
        repeatExceptions,
        notifications,
        createdAt: item.createdAt,
      };
    });
    
    res.json({ items });
  } catch (error) {
    console.error('[blocks GET] Error:', error);
    if (error instanceof Error) {
      console.error('[blocks GET] Error stack:', error.stack);
    }
    res.status(500).json({ 
      error: 'Error al obtener bloques',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const parsed = BlockCreate.safeParse(req.body);
    if (!parsed.success) {
      console.error('[blocks POST] Validation error:', parsed.error);
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    
    // Normalizar notifications: array vacío o null se convierte en null para SQLite
    const notificationsData = parsed.data.notifications && parsed.data.notifications.length > 0
      ? parsed.data.notifications
      : null;

    const created = await prisma.block.create({
      data: {
        date: parsed.data.date,
        start: parsed.data.start,
        end: parsed.data.end,
        title: parsed.data.title,
        color: parsed.data.color ?? null,
        userId,
        repeatRule: (parsed.data.repeatRule ?? null) as any,
        repeatExceptions: [],
        notifications: notificationsData as any,
      },
    });
    // Invalidar cache del coach si la fecha está en el rango
    await invalidateCoachCacheIfNeeded(prisma, userId, parsed.data.date);
    res.json({ item: created });
  } catch (error) {
    console.error('[blocks POST] Error:', error);
    if (error instanceof Error) {
      console.error('[blocks POST] Error stack:', error.stack);
    }
    res.status(500).json({ 
      error: 'Error al crear el bloque',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para eliminar todos los bloques de hoy
router.delete('/today/all', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    
    // Obtener la fecha de hoy en formato YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    // Eliminar todos los bloques del usuario para hoy
    const result = await prisma.block.deleteMany({
      where: {
        userId,
        date: todayStr,
      },
    });
    
    console.log(`[blocks DELETE /today/all] Eliminados ${result.count} bloques para el usuario ${userId} en la fecha ${todayStr}`);
    
    res.json({
      success: true,
      message: `Se eliminaron ${result.count} bloque(s) de hoy`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('[blocks DELETE /today/all] Error:', error);
    res.status(500).json({
      error: 'Error al eliminar los bloques',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

// Endpoint para eliminar todos los bloques de una fecha específica
router.delete('/date/:date/all', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { date } = req.params;
    
    if (!DATE_RE.test(date)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }
    
    // Eliminar todos los bloques del usuario para la fecha especificada
    const result = await prisma.block.deleteMany({
      where: {
        userId,
        date,
      },
    });
    
    // Invalidar cache del coach
    await invalidateCoachCacheIfNeeded(prisma, userId, date);
    
    console.log(`[blocks DELETE /date/:date/all] Eliminados ${result.count} bloques para el usuario ${userId} en la fecha ${date}`);
    
    res.json({
      success: true,
      message: `Se eliminaron ${result.count} bloque(s)`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('[blocks DELETE /date/:date/all] Error:', error);
    res.status(500).json({
      error: 'Error al eliminar los bloques',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const found = await prisma.block.findUnique({ where: { id } });
  if (!found || found.userId !== userId) return res.status(404).json({ error: 'No encontrado' });
  const blockDate = found.date;
  await prisma.block.delete({ where: { id } });
  // Invalidar cache del coach si la fecha está en el rango
  await invalidateCoachCacheIfNeeded(prisma, userId, blockDate);
  res.json({ ok: true });
});

const DeleteSeriesSchema = z.object({
  scope: z.enum(['single', 'count', 'all']),
  dates: z.array(z.string().regex(DATE_RE)).optional(),
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const id = req.params.id;
    const parsed = BlockCreate.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const block = await prisma.block.findUnique({ where: { id } });
    if (!block || block.userId !== userId) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    // Normalizar notifications: array vacío o null se convierte en null para SQLite
    const notificationsData = parsed.data.notifications && parsed.data.notifications.length > 0
      ? parsed.data.notifications
      : null;

    const updated = await prisma.block.update({
      where: { id },
      data: {
        title: parsed.data.title,
        start: parsed.data.start,
        end: parsed.data.end,
        color: parsed.data.color ?? null,
        repeatRule: (parsed.data.repeatRule ?? null) as any,
        notifications: notificationsData as any,
      },
    });
    // Invalidar cache del coach si la fecha está en el rango
    await invalidateCoachCacheIfNeeded(prisma, userId, block.date);
    res.json({ item: updated });
  } catch (error) {
    console.error('[blocks PUT] Error:', error);
    res.status(500).json({ 
      error: 'Error al actualizar el bloque',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

router.post('/:id/delete', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const parsed = DeleteSeriesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const block = await prisma.block.findUnique({ where: { id } });
  if (!block || block.userId !== userId) return res.status(404).json({ error: 'No encontrado' });
  if (parsed.data.scope === 'all' || !block.repeatRule) {
    const blockDate = block.date;
    await prisma.block.delete({ where: { id } });
    // Invalidar cache del coach si la fecha está en el rango
    await invalidateCoachCacheIfNeeded(prisma, userId, blockDate);
    return res.json({ ok: true });
  }
  const dates = Array.from(new Set([...(block.repeatExceptions as string[] | null ?? []), ...(parsed.data.dates ?? [])]));
  const updated = await prisma.block.update({
    where: { id },
    data: { repeatExceptions: dates },
  });
  // Si alguna de las fechas eliminadas está en el rango, invalidar cache
  if (parsed.data.dates) {
    for (const date of parsed.data.dates) {
      await invalidateCoachCacheIfNeeded(prisma, userId, date);
    }
  }
  res.json({ item: updated });
});

export default router;
