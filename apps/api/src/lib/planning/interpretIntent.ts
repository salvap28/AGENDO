import { callGeminiChat } from '../gemini/client.js';
import type { PlanIntent, PlanIntentTask } from './types.js';

const normalizeText = (value: string): string => (
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

const trimJsonPayload = (value: string): string => {
  let trimmed = value.trim();
  if (trimmed.startsWith('```json')) {
    trimmed = trimmed.replace(/^```json\s*/i, '');
  } else if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```\s*/, '');
  }
  if (trimmed.endsWith('```')) {
    trimmed = trimmed.replace(/\s*```$/i, '');
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    trimmed = trimmed.substring(firstBrace, lastBrace + 1);
  }
  return trimmed.trim();
};

const parseJsonPayload = (value: string): any | null => {
  const candidates = [
    value,
    value.replace(/,\s*([}\]])/g, '$1'),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      continue;
    }
  }
  return null;
};

const buildFallbackIntent = (input: string): PlanIntent => {
  const normalized = normalizeText(input);
  const tasks: PlanIntentTask[] = [];

  if (/\bestudi|programacion|repasar|curso\b/.test(normalized)) {
    tasks.push({
      title: 'Estudiar',
      taskType: 'STUDY',
      confidence: 0.5,
    });
  }
  if (/\bentren|gimnas|ejercicio\b/.test(normalized)) {
    tasks.push({
      title: 'Entrenar',
      taskType: 'PHYSICAL',
      confidence: 0.5,
    });
  }
  if (/\bagendo\b/.test(normalized)) {
    tasks.push({
      title: 'Avanzar en Agendo',
      taskType: 'WORK',
      confidence: 0.5,
    });
  }

  const horizonDaysMatch = normalized.match(/\b(\d+)\s*dias?\b/);
  const horizonDays = horizonDaysMatch ? parseInt(horizonDaysMatch[1], 10) : undefined;
  const horizon: PlanIntent['horizon'] = horizonDays && horizonDays > 1
    ? 'multi_day'
    : /\bhoy\b/.test(normalized)
      ? 'single_day'
      : 'ambiguous';

  return {
    horizon,
    horizonDays,
    tasks,
    preferences: {
      energyPattern: 'unknown',
      heavyTasksTime: 'unknown',
      dayScope: 'unknown',
      fixedCommitments: 'unknown',
      trainingSpacing: 'unknown',
      agendoDistribution: 'unknown',
      agendoFocus: 'unknown',
    },
    emotionalConstraints: [],
    confidence: 0.3,
  };
};

export async function interpretUserIntent(input: string): Promise<PlanIntent> {
  const systemPrompt = `Sos el parser de intencion de Agendo. Converti el texto del usuario a JSON estructurado.
No planifiques, no asignes horarios, no inventes tareas.
Si algo no se menciona, dejalo en null/unknown y baja confidence.
Responde SOLO con JSON valido, sin markdown ni explicaciones.`;

  const userPrompt = `Extrae la intencion del usuario en este formato JSON:
{
  "horizon": "single_day|multi_day|ambiguous",
  "horizonDays": number | null,
  "dateRange": { "start": "YYYY-MM-DD" | null, "end": "YYYY-MM-DD" | null } | null,
  "tasks": [
    {
      "title": "string",
      "taskType": "STUDY|WORK|PHYSICAL|PERSONAL|OTHER",
      "estimatedTotalMinutes": number | null,
      "frequency": number | null,
      "frequencyUnit": "times|days|week" | null,
      "confidence": number
    }
  ],
  "preferences": {
    "energyPattern": "low|medium|high|unknown",
    "heavyTasksTime": "morning|afternoon|evening|any|unknown",
    "dayScope": "weekdays|all|unknown",
    "fixedCommitments": "yes|no|unknown",
    "trainingSpacing": "alternating|non_consecutive|unknown",
    "agendoDistribution": "even|focused|unknown",
    "agendoFocus": "frontend|ai|both|unknown"
  },
  "emotionalConstraints": ["string"],
  "confidence": number
}

Texto: "${input}"`;

  const response = await callGeminiChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
  });

  const rawText = response?.content || response?.message?.content || '';
  const payload = parseJsonPayload(trimJsonPayload(rawText));

  if (!payload || typeof payload !== 'object') {
    return buildFallbackIntent(input);
  }

  const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  const intent: PlanIntent = {
    horizon: payload.horizon || 'ambiguous',
    horizonDays: typeof payload.horizonDays === 'number' ? payload.horizonDays : undefined,
    dateRange: payload.dateRange && typeof payload.dateRange === 'object'
      ? {
          start: payload.dateRange.start || undefined,
          end: payload.dateRange.end || undefined,
        }
      : undefined,
    tasks: tasks.map((task: any) => ({
      title: String(task.title || '').trim() || 'Tarea',
      taskType: task.taskType,
      estimatedTotalMinutes: typeof task.estimatedTotalMinutes === 'number' ? task.estimatedTotalMinutes : undefined,
      frequency: typeof task.frequency === 'number' ? task.frequency : undefined,
      frequencyUnit: task.frequencyUnit,
      confidence: typeof task.confidence === 'number' ? task.confidence : 0.5,
    })),
    preferences: {
      energyPattern: payload.preferences?.energyPattern || 'unknown',
      heavyTasksTime: payload.preferences?.heavyTasksTime || 'unknown',
      dayScope: payload.preferences?.dayScope || 'unknown',
      fixedCommitments: payload.preferences?.fixedCommitments || 'unknown',
      trainingSpacing: payload.preferences?.trainingSpacing || 'unknown',
      agendoDistribution: payload.preferences?.agendoDistribution || 'unknown',
      agendoFocus: payload.preferences?.agendoFocus || 'unknown',
    },
    emotionalConstraints: Array.isArray(payload.emotionalConstraints) ? payload.emotionalConstraints : [],
    confidence: typeof payload.confidence === 'number' ? payload.confidence : 0.5,
  };

  if (!intent.tasks.length) {
    return buildFallbackIntent(input);
  }

  return intent;
}
