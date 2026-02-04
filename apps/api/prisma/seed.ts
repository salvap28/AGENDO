import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type TaskSeed = { title: string; date: string; priority?: string; done?: boolean; repeatRule?: any };
type BlockSeed = {
  title: string;
  date: string;
  start: string;
  end: string;
  color?: string;
  completed?: boolean;
  repeatRule?: any;
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday);
  return d;
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

async function cleanupUserData(userId: string) {
  await prisma.completionFeedback.deleteMany({ where: { userId } });
  await prisma.dailyMetric.deleteMany({ where: { userId } });
  await prisma.dayState.deleteMany({ where: { userId } });
  await prisma.block.deleteMany({ where: { userId } });
  await prisma.task.deleteMany({ where: { userId } });
  await prisma.onboardingState.deleteMany({ where: { userId } });
}

async function seedDemoUser() {
  const demoEmail = 'demo@agendo.test';
  const passwordHash = await bcrypt.hash('demo123', 10);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { name: 'Agendo Demo' },
    create: { email: demoEmail, name: 'Agendo Demo', passwordHash },
  });

  await cleanupUserData(user.id);

  const profileInfo = {
    mainContext: 'work',
    mainGoal: 'Probar Agendo con una semana corta',
    bestPerceivedSlot: 'morning',
    desiredDailyFocusHours: 3,
    struggles: ['focus', 'prioritization'],
  };
  const goals = {
    weeklyFocusMinutesGoal: 3 * 7 * 60,
    weeklyBlocksGoal: 10,
    weeklyCheckInDaysGoal: 4,
    goalsEnabled: true,
  };
  const aiSettings = { tone: 'warm', interventionLevel: 'medium', dailyReflectionQuestionEnabled: true };

  await prisma.onboardingState.upsert({
    where: { userId: user.id },
    update: { completed: true, profileInfo, goals, aiSettings },
    create: { userId: user.id, completed: true, profileInfo, goals, aiSettings },
  });

  const baseMonday = startOfWeek(new Date());
  baseMonday.setDate(baseMonday.getDate() - 7); // inicio de la semana pasada
  const shift = (days: number) => iso(addDays(baseMonday, days));

  const blocks: BlockSeed[] = [
    { title: 'Sprint backend', date: shift(0), start: '09:00', end: '11:30', color: 'violet', completed: true },
    { title: 'UX review', date: shift(1), start: '14:00', end: '15:00', color: 'turquoise', completed: true },
    { title: 'Enfoque profundo', date: shift(2), start: '09:30', end: '12:00', color: 'violet', completed: true },
    {
      title: 'Bloque aireado',
      date: shift(3),
      start: '16:00',
      end: '17:00',
      color: 'turquoise',
      repeatRule: { kind: 'weekly', interval: 1, daysOfWeek: [new Date(baseMonday).getDay()] },
      completed: false,
    },
    { title: 'Planeacion ligera', date: shift(4), start: '10:00', end: '11:00', color: 'turquoise', completed: true },
  ];

  const tasks: TaskSeed[] = [
    { title: 'Refinar metricas', date: shift(0), priority: 'alta', done: true },
    { title: 'Documentar API', date: shift(2), priority: 'media', done: true },
    { title: 'Explorar graficos', date: shift(3), priority: 'media', done: false },
    { title: 'Responder feedback', date: shift(4), priority: 'baja', done: false },
    { title: 'Rutina diaria', date: shift(0), priority: 'baja', repeatRule: { kind: 'daily', interval: 1 }, done: true },
  ];

  const blockRecords = [];
  for (const block of blocks) {
    blockRecords.push(
      await prisma.block.create({
        data: {
          userId: user.id,
          date: block.date,
          start: block.start,
          end: block.end,
          title: block.title,
          color: block.color,
          completed: block.completed ?? false,
          repeatRule: (block.repeatRule ?? null) as any,
          repeatExceptions: [],
        },
      }),
    );
  }

  const taskRecords = [];
  for (const task of tasks) {
    taskRecords.push(
      await prisma.task.create({
        data: {
          userId: user.id,
          date: task.date,
          title: task.title,
          priority: task.priority,
          done: task.done ?? false,
          repeatRule: (task.repeatRule ?? null) as any,
          repeatExceptions: [],
        },
      }),
    );
  }

  const daily = [
    { date: shift(0), sleepDuration: 7.5, sleepQuality: 4, energyLevel: 4, mood: 'GOOD', stress: 'LOW', focus: 'TRABAJO' },
    { date: shift(1), sleepDuration: 6, sleepQuality: 3, energyLevel: 3, mood: 'NEUTRAL', stress: 'MEDIUM', focus: 'PROYECTO' },
    { date: shift(2), sleepDuration: 8, sleepQuality: 5, energyLevel: 5, mood: 'EXCELLENT', stress: 'LOW', focus: 'CREATIVIDAD' },
  ];

  for (const check of daily) {
    await prisma.dailyMetric.upsert({
      where: { userId_date: { userId: user.id, date: check.date } },
      update: check,
      create: { userId: user.id, ...check },
    });
  }

  const dayStates = [
    { date: shift(0), note: 'Dia solido, buen enfoque tecnico.', tags: [{ label: 'Flow', tone: 'violet' }] },
    { date: shift(1), note: 'Un poco de fatiga, pero avance estable.', tags: [{ label: 'Mindful', tone: 'neutral' }] },
  ];
  for (const state of dayStates) {
    await prisma.dayState.upsert({
      where: { userId_date: { userId: user.id, date: state.date } },
      update: state,
      create: { userId: user.id, ...state },
    });
  }

  const feedbackSamples = [
    {
      blockTitle: 'Sprint backend',
      feeling: 'good',
      focus: 'yes',
      interrupted: false,
      timeDelta: 'more',
      note: 'Refactor mas largo de lo esperado.',
      instanceDate: shift(0),
    },
    {
      blockTitle: 'Enfoque profundo',
      feeling: 'excellent',
      focus: 'yes',
      interrupted: false,
      timeDelta: 'equal',
      note: 'Flow continuo.',
      instanceDate: shift(2),
    },
    {
      taskTitle: 'Refinar metricas',
      feeling: 'neutral',
      focus: 'partial',
      interrupted: true,
      interruptionReason: 'notifications' as const,
      timeDelta: 'less',
      note: 'Se resolvio antes por simplificacion.',
      instanceDate: shift(0),
    },
  ];

  for (const feedback of feedbackSamples) {
    const block = feedback.blockTitle ? blockRecords.find((b) => b.title === feedback.blockTitle) : null;
    const task = feedback.taskTitle ? taskRecords.find((t) => t.title === feedback.taskTitle) : null;

    await prisma.completionFeedback.create({
      data: {
        userId: user.id,
        blockId: block?.id ?? null,
        taskId: task?.id ?? null,
        instanceDate: feedback.instanceDate,
        completedAt: new Date(),
        feeling: feedback.feeling as any,
        focus: feedback.focus as any,
        interrupted: feedback.interrupted,
        interruptionReason: (feedback as any).interruptionReason ?? null,
        timeDelta: feedback.timeDelta as any,
        note: feedback.note,
      },
    });
  }
}

async function seedPowerUser() {
  const email = 'power@agendo.test';
  const passwordHash = await bcrypt.hash('power123', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: 'Agendo Power' },
    create: { email, name: 'Agendo Power', passwordHash },
  });

  await cleanupUserData(user.id);

  const profileInfo = {
    mainContext: 'work',
    mainGoal: 'Lanzar el MVP de un producto de analytics personal',
    bestPerceivedSlot: 'morning',
    desiredDailyFocusHours: 4,
    struggles: ['focus', 'prioritization', 'time_estimation'],
  };
  const goals = {
    weeklyFocusMinutesGoal: profileInfo.desiredDailyFocusHours * 7 * 60,
    weeklyBlocksGoal: 14,
    weeklyCheckInDaysGoal: 6,
    goalsEnabled: true,
  };
  const aiSettings = { tone: 'warm', interventionLevel: 'high', dailyReflectionQuestionEnabled: true };
  const notificationPreferences = { preBlockReminderMinutes: 10, dailyCheckInReminderTime: '20:30' };

  await prisma.onboardingState.upsert({
    where: { userId: user.id },
    update: { completed: true, profileInfo, goals, aiSettings, notificationPreferences },
    create: { userId: user.id, completed: true, profileInfo, goals, aiSettings, notificationPreferences },
  });

  const baseMonday = startOfWeek(new Date());
  baseMonday.setDate(baseMonday.getDate() - 63); // 9 semanas hacia atras para cubrir 2 meses largos

  for (let offset = 0; offset < 63; offset++) {
    const current = addDays(baseMonday, offset);
    const date = iso(current);
    const dayOfWeek = current.getDay(); // 0 domingo - 6 sabado
    const weekIndex = Math.floor(offset / 7);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // --- Daily metric ---
    const sleepDuration = Math.min(8.5, Math.max(6, 6.5 + ((weekIndex + dayOfWeek) % 3) * 0.5));
    const sleepQuality = 3 + ((weekIndex + dayOfWeek) % 3);
    const energyLevel = Math.min(5, 3 + ((weekIndex + dayOfWeek) % 3));
    const mood = energyLevel >= 5 ? 'EXCELLENT' : energyLevel === 4 ? 'GOOD' : 'NEUTRAL';
    const stress = energyLevel >= 5 ? 'LOW' : energyLevel === 3 ? 'MEDIUM' : 'LOW';
    const focusTopic = dayOfWeek === 2 ? 'CONTENIDO' : dayOfWeek === 4 ? 'PRODUCTO' : 'CLIENTES';

    await prisma.dailyMetric.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: { sleepDuration, sleepQuality, energyLevel, mood, stress, focus: focusTopic },
      create: { userId: user.id, date, sleepDuration, sleepQuality, energyLevel, mood, stress, focus: focusTopic },
    });

    // --- Blocks ---
    const blocks: BlockSeed[] = [];
    if (isWeekend && dayOfWeek === 6) {
      blocks.push(
        { title: 'Revision semanal', date, start: '10:00', end: '11:00', color: 'violet', completed: true },
        { title: 'Plan de la semana', date, start: '11:15', end: '12:00', color: 'violet', completed: true },
        { title: 'Caminata larga', date, start: '17:00', end: '18:00', color: 'turquoise', completed: true },
      );
    } else if (isWeekend && dayOfWeek === 0) {
      blocks.push(
        { title: 'Recuperacion activa', date, start: '10:00', end: '10:45', color: 'turquoise', completed: true },
        { title: 'Lectura liviana', date, start: '11:15', end: '12:00', color: 'violet', completed: true },
      );
    } else {
      blocks.push(
        { title: 'Deep work producto', date, start: '08:30', end: '10:30', color: 'violet', completed: true },
        { title: 'Discovery clientes', date, start: '11:00', end: '12:00', color: 'violet', completed: dayOfWeek !== 2 },
        { title: 'Movimiento y estiramientos', date, start: '18:00', end: '18:30', color: 'turquoise', completed: true },
      );
      if (dayOfWeek === 1 || dayOfWeek === 3) {
        blocks.push({ title: 'Bloque contenido', date, start: '15:00', end: '16:00', color: 'violet', completed: true });
      }
    }

    const createdBlocks = [];
    for (const block of blocks) {
      createdBlocks.push(
        await prisma.block.create({
          data: {
            userId: user.id,
            date: block.date,
            start: block.start,
            end: block.end,
            title: block.title,
            color: block.color,
            completed: block.completed ?? false,
            repeatRule: (block.repeatRule ?? null) as any,
            repeatExceptions: [],
          },
        }),
      );
    }

    // --- Tasks ---
    const tasks: TaskSeed[] = [];
    if (isWeekend) {
      tasks.push(
        { title: `Plan semanal W${weekIndex + 1}`, date, priority: 'media', done: true },
        { title: 'Revisar backlog y priorizar', date, priority: 'baja', done: dayOfWeek === 6 },
      );
    } else {
      tasks.push(
        { title: `Entrega feature W${weekIndex + 1}.${dayOfWeek}`, date, priority: 'alta', done: dayOfWeek <= 4 },
        { title: `Seguimiento clientes W${weekIndex + 1}.${dayOfWeek}`, date, priority: 'media', done: dayOfWeek <= 3 },
        { title: 'Nota de cierre diaria', date, priority: 'baja', done: true },
      );
    }

    const createdTasks = [];
    for (const task of tasks) {
      createdTasks.push(
        await prisma.task.create({
          data: {
            userId: user.id,
            date: task.date,
            title: task.title,
            priority: task.priority,
            done: task.done ?? false,
            repeatRule: (task.repeatRule ?? null) as any,
            repeatExceptions: [],
          },
        }),
      );
    }

    // --- Feedback ---
    for (const block of createdBlocks) {
      if (!block.completed) continue;
      const feeling = energyLevel >= 5 ? 'excellent' : energyLevel === 4 ? 'good' : 'neutral';
      const focus = energyLevel <= 3 && block.title.includes('Discovery') ? 'partial' : 'yes';
      const timeDelta = block.title.includes('Deep work') ? 'more' : 'equal';
      await prisma.completionFeedback.create({
        data: {
          userId: user.id,
          blockId: block.id,
          taskId: null,
          instanceDate: date,
          completedAt: new Date(`${date}T${block.end}:00Z`),
          feeling,
          focus: focus as any,
          interrupted: block.title.includes('Discovery') && energyLevel <= 3,
          interruptionReason: block.title.includes('Discovery') && energyLevel <= 3 ? 'notifications' : null,
          timeDelta: timeDelta as any,
          note: `Sesion ${block.title.toLowerCase()} semana ${weekIndex + 1}`,
        },
      });
    }

    for (const task of createdTasks) {
      if (!task.done) continue;
      await prisma.completionFeedback.create({
        data: {
          userId: user.id,
          blockId: null,
          taskId: task.id,
          instanceDate: date,
          completedAt: new Date(`${date}T20:00:00Z`),
          feeling: 'good',
          focus: 'yes',
          interrupted: false,
          interruptionReason: null,
          timeDelta: 'equal',
          note: `Cierre de ${task.title}`,
        },
      });
    }

    // --- Day states semanales ---
    if (dayOfWeek === 0) {
      await prisma.dayState.upsert({
        where: { userId_date: { userId: user.id, date } },
        update: {
          note: `Balance semana ${weekIndex + 1}: energia ${energyLevel}/5, foco ${focusTopic.toLowerCase()}.`,
          tags: [{ label: 'Review', tone: 'violet' }],
        },
        create: {
          userId: user.id,
          date,
          note: `Balance semana ${weekIndex + 1}: energia ${energyLevel}/5, foco ${focusTopic.toLowerCase()}.`,
          tags: [{ label: 'Review', tone: 'violet' }],
        },
      });
    }
  }
}

async function main() {
  await seedDemoUser();
  await seedPowerUser();
  console.log('Seed completado: demo + power user con historial de 2+ meses.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
