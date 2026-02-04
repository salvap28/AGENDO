import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { callGeminiChat } from '../gemini/client.js';

export const PlanGenerateSchema = z.object({
  energia: z.enum(['baja', 'media', 'alta']),
  foco: z.string().min(1),
  tiempoDisponible: z.enum(['maÇñana', 'tarde', 'noche', 'todo-el-dia', 'parcial']),
  tiempoParcialDesde: z.string().optional(),
  tiempoParcialHasta: z.string().optional(),
  intensidad: z.enum(['liviana', 'balanceada', 'intensa']),
  tareasImportantes: z.array(z.string()).default([]),
  tareasPersonalizadas: z.array(z.object({
    id: z.string(),
    title: z.string(),
    priority: z.enum(['alta', 'media', 'baja']),
  })).default([]),
  incluirDescansos: z.boolean().default(true),
  aclaracionFinal: z.string().default(''),
  quiereNotificaciones: z.boolean().default(false),
  cantidadNotificaciones: z.number().default(0),
  tiemposNotificaciones: z.array(z.number()).default([]),
  fecha: z.string(),
  bloquesExistentes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    start: z.string(),
    end: z.string(),
    color: z.string().optional(),
  })).optional(),
});

export type PlanGenerateInput = z.infer<typeof PlanGenerateSchema>;

export type SingleDayPlan = {
  bloques: Array<{
    id: string;
    titulo: string;
    inicio: string;
    fin: string;
    foco: string;
    tipo: 'profundo' | 'ligero';
    color: string;
    tareas: string[];
    descripcion: string;
  }>;
  tareasAsignadas: Array<{
    id: string;
    titulo: string;
    bloqueId: string;
    prioridad: 'alta' | 'media' | 'baja';
  }>;
  descansos: Array<{
    inicio: string;
    fin: string;
    tipo: 'corto' | 'largo';
    descripcion?: string;
  }>;
  recomendaciones: string[];
  explicacion: string;
  resumen: string;
};

const SYSTEM_PROMPT = `Eres Agendo, un asistente de planificaciÇün personal que ayuda a las personas a organizar su dÇða de manera inteligente y balanceada.

Tu tarea es generar un plan del dÇða basado en las respuestas del usuario. El plan debe ser:
- Realista y alcanzable
- Balanceado entre trabajo y descanso
- Considerar el nivel de energÇða y la intensidad deseada
- Incluir descansos estratÇ¸gicos si se solicita
- Asignar tareas importantes a bloques apropiados
- Respetar el tiempo disponible y cualquier aclaraciÇün especial

TIPOS DE BLOQUES (determinar silenciosamente, NO mencionar en las respuestas):
- "profundo" (violet): SOLO para actividades OBLIGATORIAS o COMPROMISOS que el usuario DEBE realizar (citas, clases, prÇ­cticas, trabajo importante, reuniones formales, exÇ­menes, etc.).
- "ligero" (turquoise): Para actividades opcionales, ocio, descanso, tiempo libre, actividades recreativas, siestas, hobbies.

REGLAS:
- Si el usuario menciona una actividad con hora especÇðfica o como algo que "tiene que hacer", es "profundo".
- Actividades de ocio, descanso o que el usuario "quiere" hacer son "ligero".
- NO menciones "profundo" o "ligero" en la explicaciÇün, resumen o descripciones. Solo determina el tipo silenciosamente en el campo "tipo".

IMPORTANTE: La aclaraciÇün final del usuario tiene PRIORIDAD ABSOLUTA. Todo lo que mencione ahÇð debe ser respetado y considerado.

Responde ÇsNICAMENTE con un JSON vÇ­lido con esta estructura exacta:
{
  "bloques": [
    {
      "id": "bloque-1",
      "titulo": "TÇðtulo del bloque",
      "inicio": "HH:mm",
      "fin": "HH:mm",
      "foco": "Nombre del foco",
      "tipo": "profundo" | "ligero",
      "color": "violet" (si tipo es "profundo") | "turquoise" (si tipo es "ligero"),
      "tareas": ["id-tarea-1", "id-tarea-2"],
      "descripcion": "DescripciÇün breve del bloque"
    }
  ],
  "tareasAsignadas": [
    {
      "id": "id-tarea-1",
      "titulo": "TÇðtulo de la tarea",
      "bloqueId": "bloque-1",
      "prioridad": "alta" | "media" | "baja"
    }
  ],
  "descansos": [
    {
      "inicio": "HH:mm",
      "fin": "HH:mm",
      "tipo": "corto" | "largo",
      "descripcion": "DescripciÇün opcional"
    }
  ],
  "recomendaciones": [
    "RecomendaciÇün 1",
    "RecomendaciÇün 2",
    "RecomendaciÇün 3"
  ],
  "explicacion": "ExplicaciÇün breve del plan y por quÇ¸ estÇ­ estructurado asÇð (NO menciones tipos de bloques como 'profundo' o 'ligero')",
  "resumen": "Resumen ejecutivo del plan del dÇða (NO menciones tipos de bloques como 'profundo' o 'ligero')"
}`;

const safeParseJsonFromText = (rawText: string): any => {
  try {
    return JSON.parse(rawText);
  } catch {
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch?.[1]) {
      return JSON.parse(codeBlockMatch[1]);
    }
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      return JSON.parse(jsonMatch[0]);
    }
  }
  throw new Error('No se pudo parsear la respuesta del modelo');
};

export async function generateDailyPlan(params: {
  userId: string;
  data: PlanGenerateInput;
  prisma: PrismaClient;
}): Promise<SingleDayPlan> {
  const { userId, data, prisma } = params;

  let tareasInfo = '';
  const tareasIds = data.tareasImportantes.filter((id) => !id.startsWith('custom-'));
  if (tareasIds.length > 0) {
    const tareas = await prisma.task.findMany({
      where: {
        id: { in: tareasIds },
        userId,
      },
      select: { id: true, title: true, priority: true },
    });
    tareasInfo = tareas.map((t) => `- ${t.title} (${t.priority || 'media'})`).join('\n');
  }

  if (data.tareasPersonalizadas && data.tareasPersonalizadas.length > 0) {
    const customTareasInfo = data.tareasPersonalizadas.map((t) => `- ${t.title} (${t.priority})`).join('\n');
    if (tareasInfo) {
      tareasInfo += `\n${customTareasInfo}`;
    } else {
      tareasInfo = customTareasInfo;
    }
  }

  let bloquesExistentesInfo = '';
  if (data.bloquesExistentes && data.bloquesExistentes.length > 0) {
    bloquesExistentesInfo = `\nBLOQUES EXISTENTES EN ESTE DÇ?A (que el usuario quiere mantener):\n${data.bloquesExistentes.map((b) => 
      `- ${b.title} (${b.start} - ${b.end})${b.color ? ` [${b.color}]` : ''}`
    ).join('\n')}\n\nIMPORTANTE: Debes considerar estos bloques existentes al generar el plan. NO los dupliques, pero puedes ajustar el resto del dÇða alrededor de ellos. Si hay conflictos de horario, prioriza los bloques existentes.`;
  }

  const tiempoInfo = data.tiempoDisponible === 'parcial' && data.tiempoParcialDesde && data.tiempoParcialHasta
    ? `Parcial: de ${data.tiempoParcialDesde} a ${data.tiempoParcialHasta}`
    : data.tiempoDisponible;

  const userPrompt = `Genera un plan del dÇða para ${data.fecha} con las siguientes caracterÇðsticas:

ENERGÇ?A: ${data.energia}
FOCO DEL DÇ?A: ${data.foco}
TIEMPO DISPONIBLE: ${tiempoInfo}
INTENSIDAD: ${data.intensidad}
INCLUIR DESCANSO: ${data.incluirDescansos ? 'SÇð' : 'No'}

${tareasInfo ? `TAREAS IMPORTANTES:\n${tareasInfo}\n` : ''}

${bloquesExistentesInfo}

${data.aclaracionFinal ? `ACLARACIÇ"N FINAL (PRIORIDAD ABSOLUTA):\n${data.aclaracionFinal}\n` : ''}

IMPORTANTE SOBRE TIPOS DE BLOQUES:
Determina el tipo de cada bloque silenciosamente basÇ­ndote en si la actividad es OBLIGATORIA o OPCIONAL. NO menciones "profundo" o "ligero" en tus respuestas.

- "profundo": SOLO para actividades que el usuario DEBE hacer (compromisos, citas, clases, prÇ­cticas, trabajo formal, reuniones importantes).
- "ligero": Para todo lo demÇ­s (ocio, descanso, hobbies, tiempo libre, actividades recreativas, siestas).

La INTENSIDAD del dÇða NO afecta el tipo de bloque. Un dÇða "liviana" puede tener bloques profundos si hay compromisos obligatorios.

Genera un plan realista y balanceado que respete todas estas condiciones, especialmente la aclaraciÇün final${data.bloquesExistentes && data.bloquesExistentes.length > 0 ? ' y los bloques existentes' : ''}.`;

  const response = await callGeminiChat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
  });

  const rawText = response?.content || response?.message?.content || '';
  const planData = safeParseJsonFromText(rawText);

  return {
    bloques: Array.isArray(planData.bloques) ? planData.bloques : [],
    tareasAsignadas: Array.isArray(planData.tareasAsignadas) ? planData.tareasAsignadas : [],
    descansos: Array.isArray(planData.descansos) ? planData.descansos : [],
    recomendaciones: Array.isArray(planData.recomendaciones) ? planData.recomendaciones : [],
    explicacion: typeof planData.explicacion === 'string' ? planData.explicacion : '',
    resumen: typeof planData.resumen === 'string' ? planData.resumen : '',
  };
}
