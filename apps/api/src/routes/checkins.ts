import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);

const CheckInSchema = z.object({
  date: z.string().regex(DATE_RE),
  sleepDuration: z.number().min(0).max(24),
  sleepQuality: z.number().int().min(1).max(5),
  energyLevel: z.number().int().min(1).max(5),
  mood: z.enum(['LOW', 'NEUTRAL', 'GOOD', 'EXCELLENT']),
  stress: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  focus: z.enum(['ESTUDIO', 'TRABAJO', 'SALUD', 'DESCANSO', 'CREATIVIDAD', 'PROYECTO', 'ORDEN', 'SOCIAL']),
});

router.get('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const queryDate = typeof req.query.date === 'string' ? req.query.date : undefined;
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;

  if (from || to) {
    if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
      return res.status(400).json({ error: "Parametros 'from' y 'to' requeridos (YYYY-MM-DD)" });
    }
    if (from > to) {
      return res.status(400).json({ error: "'from' no puede ser mayor que 'to'" });
    }

    const items = await prisma.dailyMetric.findMany({
      where: { userId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });

    return res.json({ items, range: { from, to } });
  }

  const date = queryDate && DATE_RE.test(queryDate) ? queryDate : today();

  const item = await prisma.dailyMetric.findUnique({
    where: { userId_date: { userId, date } },
  });

  res.json({ item, date });
});

router.put('/', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = CheckInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { date, ...data } = parsed.data;

  const item = await prisma.dailyMetric.upsert({
    where: { userId_date: { userId, date } },
    update: data,
    create: { userId, date, ...data },
  });

  res.json({ item });
});

export default router;
