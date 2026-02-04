import { callGeminiChat } from '../gemini/client.js';
import type { PlanningGap, PlanningSession, QuestionOption } from './types.js';

const normalizeText = (value: string): string => (
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

export const defaultQuestions: Record<PlanningGap['key'], string> = {
  HORIZON_CLARITY: 'Para cuantos dias queres el plan?',
  DATE_RANGE: 'Desde que dia queres empezar el plan?',
  DAY_SCOPE: 'Estos dias incluyen fin de semana o solo dias habiles?',
  FIXED_COMMITMENTS: 'Tenes horarios fijos o compromisos inamovibles en esos dias?',
  ENERGY_PATTERN: 'Como esta tu energia general en estos dias?',
  STUDY_WINDOW: 'En que momento del dia rendis mejor para estudiar?',
  TRAINING_SPACING: 'Para entrenar, preferis dias alternados o solo evitar dias consecutivos?',
  AGENDO_DISTRIBUTION: 'Sobre Agendo, queres repartir el avance cada dia o concentrarlo en algunos dias?',
};

const defaultOptions: Record<PlanningGap['key'], string[]> = {
  HORIZON_CLARITY: ['3 dias', '4 dias', 'Una semana', 'No estoy seguro'],
  DATE_RANGE: ['Empieza hoy', 'Empieza manana', 'Este fin de semana', 'Tengo fecha exacta'],
  DAY_SCOPE: ['Incluye fin de semana', 'Solo dias habiles', 'Me da igual'],
  FIXED_COMMITMENTS: ['Si, tengo compromisos', 'No, nada fijo', 'No estoy seguro'],
  ENERGY_PATTERN: ['Alta', 'Media', 'Baja', 'Variable'],
  STUDY_WINDOW: ['Manana', 'Tarde', 'Noche', 'Me da igual'],
  TRAINING_SPACING: ['Dias alternados', 'Solo no consecutivos', 'Me da igual'],
  AGENDO_DISTRIBUTION: ['Repartir igual cada dia', 'Concentrar mas en algunos dias', 'Alternar frontend/IA'],
};

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

const isMicroScheduleQuestion = (text: string): boolean => {
  const normalized = normalizeText(text);
  if (/\b\d{1,2}:\d{2}\b/.test(normalized)) return true;
  if (/(a que hora|horario exacto|hora exacta)/.test(normalized)) return true;
  return false;
};

const isMicroScheduleOption = (text: string): boolean => {
  const normalized = normalizeText(text);
  if (/\b\d{1,2}:\d{2}\b/.test(normalized)) return true;
  if (/(a las|horario exacto|hora exacta)/.test(normalized)) return true;
  return false;
};

const buildOptions = (labels: string[]): QuestionOption[] => {
  const seen = new Set<string>();
  const options: QuestionOption[] = [];
  labels.forEach((label, index) => {
    const trimmed = String(label || '').trim();
    const normalized = normalizeText(trimmed);
    if (!trimmed || isMicroScheduleOption(trimmed)) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    options.push({ id: `opt_${index + 1}`, label: trimmed });
  });
  return options;
};

const ensureCustomOption = (options: QuestionOption[]): QuestionOption[] => {
  const customLabelPattern = /\b(otro|otra|personalizad|custom)\b/;
  const existing = options.map((opt) => ({
    ...opt,
    allowsCustomValue: opt.allowsCustomValue || customLabelPattern.test(normalizeText(opt.label)),
  }));
  const hasCustom = existing.some((opt) => opt.allowsCustomValue);
  if (hasCustom) return existing;
  return [...existing, { id: `opt_custom_${existing.length + 1}`, label: 'Otro', allowsCustomValue: true }];
};

export async function selectNextQuestion(params: {
  session: PlanningSession;
  gaps: PlanningGap[];
}): Promise<{ gapKey: PlanningGap['key']; text: string; options: QuestionOption[] } | null> {
  const { session, gaps } = params;
  if (gaps.length === 0) return null;

  const askedGapKeys = new Set(session.questions.map((q) => q.gapKey));

  const prompt = `Sos el redactor de preguntas de Agendo. Tenes que elegir 1 gap y redactar 1 pregunta clara.
No preguntes horarios exactos ni micro-detalles. No inventes informacion.
Responde SOLO con JSON en este formato:
{
  "gapKey": "GAP_KEY",
  "questionText": "Pregunta",
  "options": ["Opcion 1", "Opcion 2", "Opcion 3"]
}
Las opciones deben ser cortas y sin horarios exactos. Inclui una opcion tipo "Otro".

GAPS:
${gaps.map((gap) => `- ${gap.key}: ${gap.reason} (severity: ${gap.severity})`).join('\n')}

PREGUNTAS YA HECHAS:
${session.questions.map((q) => `- ${q.text}`).join('\n') || '- ninguna'}

INPUT USUARIO:
${session.userInput}`;

  const response = await callGeminiChat({
    messages: [
      { role: 'system', content: 'Sos un asistente que redacta preguntas breves y humanas.' },
      { role: 'user', content: prompt },
    ],
    stream: false,
  });

  const rawText = response?.content || response?.message?.content || '';
  const payload = parseJsonPayload(trimJsonPayload(rawText));

  const candidateGapKey = payload?.gapKey as PlanningGap['key'] | undefined;
  const candidateText = typeof payload?.questionText === 'string' ? payload.questionText.trim() : '';
  const rawOptions = Array.isArray(payload?.options) ? payload.options : [];
  const candidateOptions = ensureCustomOption(buildOptions(rawOptions));

  const isValidGap = candidateGapKey && gaps.some((gap) => gap.key === candidateGapKey);
  const isNotAsked = candidateGapKey && !askedGapKeys.has(candidateGapKey);
  const validQuestion = candidateText && !isMicroScheduleQuestion(candidateText);
  const validOptions = candidateOptions.length >= 2;

  if (isValidGap && isNotAsked && validQuestion && validOptions) {
    return { gapKey: candidateGapKey, text: candidateText, options: candidateOptions };
  }

  const fallbackGap = gaps.find((gap) => !askedGapKeys.has(gap.key)) || gaps[0];
  const fallbackOptions = ensureCustomOption(buildOptions(defaultOptions[fallbackGap.key]));
  return { gapKey: fallbackGap.key, text: defaultQuestions[fallbackGap.key], options: fallbackOptions };
}
