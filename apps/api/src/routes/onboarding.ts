import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireAuth } from './auth.js';

const router = Router();

const ProfileInfoSchema = z.object({
  mainContext: z.enum(['study', 'work', 'both', 'personal_projects', 'other']),
  mainGoal: z.string().min(1),
  bestPerceivedSlot: z.enum(['morning', 'afternoon', 'evening', 'unknown']),
  desiredDailyFocusHours: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  struggles: z.array(z.enum(['start', 'focus', 'prioritization', 'time_estimation', 'memory'])).default([]),
});

const GoalsSchema = z.object({
  weeklyFocusMinutesGoal: z.number().int().min(0),
  weeklyBlocksGoal: z.number().int().min(0).optional(),
  weeklyCheckInDaysGoal: z.number().int().min(0).optional(),
  goalsEnabled: z.boolean(),
});

const AiSettingsSchema = z.object({
  tone: z.enum(['warm', 'neutral', 'direct']),
  interventionLevel: z.enum(['low', 'medium', 'high']),
  dailyReflectionQuestionEnabled: z.boolean(),
});

const NotificationPreferencesSchema = z.object({
  preBlockReminderMinutes: z
    .union([z.literal(0), z.literal(5), z.literal(10), z.literal(15)])
    .default(0),
  dailyCheckInReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const PayloadSchema = z.object({
  profileInfo: ProfileInfoSchema,
  goals: GoalsSchema,
  aiSettings: AiSettingsSchema,
  notificationPreferences: NotificationPreferencesSchema.optional(),
});

router.get('/state', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const prismaAny = prisma as any;
  const state = await prismaAny.onboardingState.findUnique({ where: { userId } });
  res.json({ completed: Boolean(state?.completed) });
});

router.get('/data', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const prismaAny = prisma as any;
  const state = await prismaAny.onboardingState.findUnique({ where: { userId } });
  if (!state) {
    return res.json({ completed: false, profileInfo: null, goals: null, aiSettings: null, notificationPreferences: null });
  }
  res.json({
    completed: state.completed,
    profileInfo: state.profileInfo,
    goals: state.goals,
    aiSettings: state.aiSettings,
    notificationPreferences: state.notificationPreferences,
  });
});

router.post('/complete', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = PayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const prismaAny = prisma as any;

  const data = parsed.data;
  const goals = data.goals ?? {
    weeklyFocusMinutesGoal: data.profileInfo.desiredDailyFocusHours * 7 * 60,
    goalsEnabled: true,
  };

  const saved = await prismaAny.onboardingState.upsert({
    where: { userId },
    create: {
      userId,
      completed: true,
      profileInfo: data.profileInfo,
      goals,
      aiSettings: data.aiSettings,
      notificationPreferences: data.notificationPreferences ?? null,
    },
    update: {
      completed: true,
      profileInfo: data.profileInfo,
      goals,
      aiSettings: data.aiSettings,
      notificationPreferences: data.notificationPreferences ?? null,
    },
  });

  // Sincronizar las preferencias de notificaciones con User.preferences
  if (data.notificationPreferences) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const currentPrefs = (user?.preferences as any) || {};
    const newPrefs = {
      ...currentPrefs,
      notifications: {
        ...(currentPrefs.notifications || {}),
        preBlockReminderMinutes: data.notificationPreferences.preBlockReminderMinutes || 10,
        dailyCheckInReminderTime: data.notificationPreferences.dailyCheckInReminderTime || '22:00',
        nudgeStyle: currentPrefs.notifications?.nudgeStyle || 'motivational',
      },
    };

    await prisma.user.update({
      where: { id: userId },
      data: { preferences: newPrefs },
    });
  }

  res.json({ ok: true, onboarding: { completed: true, profileInfo: saved.profileInfo } });
});

router.put('/goals', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = GoalsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const prismaAny = prisma as any;
  const state = await prismaAny.onboardingState.findUnique({ where: { userId } });
  if (!state) {
    return res.status(404).json({ error: 'Onboarding no encontrado' });
  }
  await prismaAny.onboardingState.update({
    where: { userId },
    data: { goals: parsed.data },
  });
  res.json({ ok: true });
});

router.put('/ai-settings', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = AiSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const prismaAny = prisma as any;
  const state = await prismaAny.onboardingState.findUnique({ where: { userId } });
  if (!state) {
    return res.status(404).json({ error: 'Onboarding no encontrado' });
  }
  await prismaAny.onboardingState.update({
    where: { userId },
    data: { aiSettings: parsed.data },
  });
  res.json({ ok: true });
});

router.post('/reset', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const prismaAny = prisma as any;
  await prismaAny.onboardingState.upsert({
    where: { userId },
    create: {
      userId,
      completed: false,
      profileInfo: null,
      goals: null,
      aiSettings: null,
      notificationPreferences: null,
    },
    update: {
      completed: false,
      profileInfo: null,
      goals: null,
      aiSettings: null,
      notificationPreferences: null,
    },
  });
  res.json({ ok: true });
});

export default router;
