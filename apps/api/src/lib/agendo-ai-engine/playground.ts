import {
  AiEngineInput,
  AiSettings,
  Block,
  Task,
  CheckIn,
  CompletionFeedback,
  runAgendoAiEngine,
} from './index.js';

function buildMockInput(): AiEngineInput {
  const now = new Date();
  const monday = startOfWeek(now);
  const tuesday = addDays(monday, 1);
  const wednesday = addDays(monday, 2);

  const blocks: Block[] = [
    createBlock('b1', monday, '19:00', '21:00', 'study', true, 120),
    createBlock('b2', tuesday, '08:00', '09:00', 'work', true, 60),
    createBlock('b3', wednesday, '21:00', '22:00', 'creative', false, 60),
  ];

  const tasks: Task[] = [
    createTask('t1', monday, 'study', true, addHours(monday, 21)),
    createTask('t2', tuesday, 'work', false),
  ];

  const checkIns: CheckIn[] = [
    { id: 'c1', userId: 'user-demo', date: formatYmd(monday), completed: true },
    { id: 'c2', userId: 'user-demo', date: formatYmd(tuesday), completed: true },
  ];

  const feedback: CompletionFeedback[] = [
    {
      blockId: 'b1',
      completedAt: addHours(monday, 21),
      feeling: 'good',
      focus: 'yes',
      interruptions: { hadInterruptions: false },
      timeComparison: 'equal',
      note: 'Bloque nocturno sólido.',
    },
    {
      taskId: 't1',
      completedAt: addHours(monday, 21),
      feeling: 'excellent',
      focus: 'yes',
      interruptions: { hadInterruptions: false },
      timeComparison: 'less',
    },
  ];

  const settings: AiSettings = {
    tone: 'warm',
    interventionLevel: 'medium',
    dailyReflectionQuestionEnabled: true,
  };

  const from = monday;
  const to = addDays(monday, 6);

  return {
    blocks,
    tasks,
    checkIns,
    feedback,
    settings,
    from,
    to,
  };
}

function createBlock(
  id: string,
  day: Date,
  start: string,
  end: string,
  category: Block['category'],
  completed: boolean,
  actualDurationMinutes?: number,
): Block {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startDate = new Date(day);
  startDate.setHours(sh, sm, 0, 0);
  const endDate = new Date(day);
  endDate.setHours(eh, em, 0, 0);
  const plannedDurationMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  return {
    id,
    userId: 'user-demo',
    start: startDate,
    end: endDate,
    category,
    plannedDurationMinutes,
    actualDurationMinutes,
    completed,
  };
}

function createTask(
  id: string,
  day: Date,
  category: Task['category'],
  completed: boolean,
  completedAt?: Date,
): Task {
  return {
    id,
    userId: 'user-demo',
    createdAt: day,
    dueDate: day,
    completedAt,
    category,
    completed,
  };
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday as first day
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const input = buildMockInput();
const result = runAgendoAiEngine(input);

console.log('Agendo AI Engine Playground Result:');
console.dir(result, { depth: null });
console.log('Focus heatmap preview (days x slots):');
console.dir(result.focusHeatmap, { depth: null });
console.log('Extended metrics preview:');
console.dir(result.extendedMetrics, { depth: null });
console.log('Recommendations preview:');
console.dir(result.recommendations, { depth: null });
console.log('Trends preview:');
console.dir(result.trends, { depth: null });
