import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireAuth } from './auth.js';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const TagSchema = z.object({
  label: z.string().min(1).max(80),
  tone: z.enum(['violet', 'turquoise', 'neutral']),
});

const UpsertSchema = z.object({
  date: z.string().regex(DATE_RE),
  note: z.string().max(1000).optional(),
  tags: z.array(TagSchema).optional(),
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;

    if (from && to && DATE_RE.test(from) && DATE_RE.test(to)) {
      const rows = await prisma.dayState.findMany({
        where: { userId, date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      });
      return res.json({ items: rows });
    }

    const date = typeof req.query.date === 'string' && DATE_RE.test(req.query.date) ? req.query.date : null;
    if (!date) {
      return res.status(400).json({ error: "Parametro 'date' requerido" });
    }
    const item = await prisma.dayState.findUnique({ where: { userId_date: { userId, date } } });
    res.json({ item });
  } catch (error) {
    console.error('[day-state GET] Error:', error);
    res.status(500).json({ 
      error: 'Error al obtener estados del día',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

router.put('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = UpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { date, ...data } = parsed.data;
  const payload: any = {};
  if ('note' in data) payload.note = data.note ?? null;
  if ('tags' in data) payload.tags = data.tags ?? [];
  const item = await prisma.dayState.upsert({
    where: { userId_date: { userId, date } },
    update: payload,
    create: { userId, date, ...payload },
  });
  res.json({ item });
});

export default router;
