/**
 * Implementación del cliente de IA de Agendo usando Ollama
 */

import { callOllamaChat } from '../ollama/client.js';
import { AGENDO_SYSTEM_PROMPT } from '../ollama/personality.js';
import type { WeeklyInsights } from './types.js';
import type { AiSettings } from '../agendo-ai-engine/types.js';

/**
 * Modelo de IA a usar. Puede cambiarse mediante la variable de entorno AGENDO_AI_MODEL.
 *
 * Por defecto usa deepseek-v3.1:671b-cloud (modelo cloud).
 *
 * Si el modelo no está disponible, puedes:
 * 1. Verificar modelos disponibles: ollama list
 * 2. Instalar el modelo: ollama pull deepseek-v3.1:671b-cloud
 * 3. O usar un modelo local alternativo cambiando AGENDO_AI_MODEL (ej: llama3.2:3b)
 *
 * Nota: El nombre exacto del modelo puede variar. Verifica con `ollama list`.
 */
const AGENDO_AI_MODEL = process.env.AGENDO_AI_MODEL || 'deepseek-v3.1:671b-cloud';

/**
 * Tipo para las métricas semanales que devuelve calculateWeeklyMetrics
 */
export type WeeklyMetrics = {
  periodo: {
    desde: string;
    hasta: string;
  };
  metricas_7d: {
    checkins_realizados: number;
    checkins_omitidos: number;
    tareas_totales: number;
    tareas_completadas: number;
    bloques_totales: number;
    bloques_completados: number;
    promedio_satisfaccion?: number;
    promedio_energia?: number;
  };
  datos_detallados: {
    bloques: Array<{
      fecha: string;
      titulo: string;
      hora_inicio: string;
      hora_fin: string;
      completado: boolean;
    }>;
    tareas: Array<{
      fecha: string;
      titulo: string;
      completada: boolean;
    }>;
    checkins: Array<{
      fecha: string;
      energia?: number;
      mood?: string;
      sleepDuration?: number;
      stress?: number;
      focus?: number;
    }>;
    encuestas: Array<{
      fecha: string;
      feeling: string;
      focus: string;
      interrupted: boolean;
      interruptionReason?: string;
      timeDelta?: number;
      nota?: string;
    }>;
  };
  patrones_7d: {
    dias_mas_productivos?: string[];
    horas_mas_productivas?: string[];
    tipos_tarea_con_mas_abandono?: string[];
    motivos_frecuentes?: string[];
  };
  perfil_largo_plazo: {
    semanas_usando_agendo: number;
    tendencia_consistencia: 'sube' | 'baja' | 'estable';
  };
};

/**
 * Implementación de AgendoAIClient usando Ollama
 *
 * Nota: La URL de Ollama se configura mediante OLLAMA_HOST o OLLAMA_URL
 * en las variables de entorno (el cliente de Ollama usa OLLAMA_HOST internamente).
 */
export class OllamaAgendoAIClient {
  private model: string;

  constructor(model?: string) {
    this.model = model || AGENDO_AI_MODEL;
  }

  async getWeeklyInsights(metrics: WeeklyMetrics, settings?: AiSettings): Promise<WeeklyInsights> {
    const userPrompt = this.buildWeeklyInsightsPrompt(metrics, settings);
    try {
      const response = await callOllamaChat({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: AGENDO_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        stream: false,
      });

      const rawText = response?.message?.content || response?.content || '';
      const insights = this.parseWeeklyInsightsResponse(rawText, settings);
      return insights;
    } catch (error) {
      console.error('[AgendoAI] Error al llamar a Ollama:', error);

      // Verificar si es un error de modelo no encontrado
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (
        errorMessage.includes('model') &&
        (errorMessage.includes('not found') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('404') ||
          errorMessage.includes('pull'))
      ) {
        throw new Error(
          `Modelo "${this.model}" no encontrado en Ollama. ` +
            `Asegúrate de que el modelo esté disponible. ` +
            `Puedes cambiarlo con la variable de entorno AGENDO_AI_MODEL ` +
            `o instalarlo con: ollama pull ${this.model}`
        );
      }

      // Si falla el parseo, intentamos una vez más
      if (error instanceof Error && error.message.includes('JSON')) {
        throw new Error('El modelo devolvió una respuesta inválida. Por favor, intenta de nuevo.');
      }

      // Si es un error de red, lo propagamos con un mensaje claro
      if (
        error instanceof Error &&
        (errorMessage.includes('ollama') || errorMessage.includes('fetch') || errorMessage.includes('timeout'))
      ) {
        throw new Error(`Error al comunicarse con Ollama: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Construye el prompt para insights semanales
   * Nota: La personalidad de Agendo ya está definida en AGENDO_SYSTEM_PROMPT (mensaje de sistema)
   */
  private buildWeeklyInsightsPrompt(metrics: WeeklyMetrics, settings?: AiSettings): string {
    const metricsJson = JSON.stringify(metrics, null, 2);
    // Construir un resumen legible de los datos para el prompt
    const resumenDatos = this.buildDataSummary(metrics);

    // Determinar si se debe incluir la pregunta de reflexión según settings
    const includeReflectionQuestion = settings?.dailyReflectionQuestionEnabled !== false;

    return `Recibís métricas y datos detallados del comportamiento de un usuario en los últimos 7 días (en JSON). 

IMPORTANTE: Usá los datos específicos del usuario para hacer tu análisis más concreto y personalizado. Mencioná actividades, tareas o bloques específicos cuando sea relevante, pero siempre de forma cálida y sin juicio.

RESUMEN DE DATOS:
${resumenDatos}

DATOS COMPLETOS (JSON):
${metricsJson}

INSTRUCCIONES:
- Respondé EXCLUSIVAMENTE con un JSON válido.
- El JSON debe tener exactamente estas claves:
  - "analisis": string (2 a 4 oraciones breves en español, siguiendo la personalidad de Agendo: cálida, empática, sin juicio). 
    * Usá datos específicos: mencioná tareas o bloques concretos si son relevantes (ej: "Completaste [título de tarea/bloque]").
    * Mencioná patrones específicos de energía, mood o sentimientos si hay datos de check-ins o encuestas.
    * Sé específico pero cálido: no enumeres, solo destacá lo más relevante de forma natural.
  - "recomendaciones": array de 3 strings, cada una una acción muy concreta y suave (modo sugerencia, no orden).
    * Basá las recomendaciones en los datos reales: si hubo interrupciones frecuentes, sugerí algo relacionado.
    * Si hay patrones de energía o horarios, usalos para sugerencias específicas.
  - "mantener": string opcional con algo positivo que el usuario debería seguir haciendo.
    * Basá esto en datos específicos: si completó ciertos bloques o tareas, mencioná eso.
${includeReflectionQuestion ? `  - "preguntaReflexion": string con una pregunta breve, emocionalmente amable y sin juicio, PERSONALIZADA para este usuario.
    * La pregunta debe estar relacionada con los datos específicos del usuario (energía, interrupciones, patrones, tareas, etc.).
    * Debe ser una pregunta que invite a la reflexión sobre algo concreto de su semana.
    * Ejemplos personalizados:
      - Si hubo interrupciones frecuentes: "¿Qué pequeño cambio podrías hacer para proteger mejor tus momentos de foco?"
      - Si la energía fue baja: "¿Qué te ayudó a sentirte con más energía esta semana?"
      - Si completó muchas tareas: "¿Qué te permitió avanzar con tanta claridad?"
      - Si hubo pocos datos: "¿Qué pequeño paso te gustaría dar mañana para acompañarte mejor?"
    * La pregunta debe ser breve (máximo 15 palabras), cálida, sin juicio, y relacionada con los datos reales del usuario.` : ''}

Recordá:
- Seguí la personalidad de Agendo: acompañar, sugerir, validar. Nunca exigir ni diagnosticar.
- Usá los datos específicos (bloques, tareas, check-ins, encuestas) para hacer el análisis más concreto.
- Si hay pocos datos, validá con suavidad ("Fue una semana tranquila").
- Las recomendaciones deben ser pequeñas, suaves y accionables, basadas en los datos reales.
${includeReflectionQuestion ? `- La pregunta de reflexión debe ser PERSONALIZADA según los datos del usuario:
  * Si hubo interrupciones frecuentes: pregunta sobre cómo proteger mejor sus momentos de foco.
  * Si la energía fue baja: pregunta sobre qué le ayudó a sentirse mejor.
  * Si completó muchas tareas: pregunta sobre qué le permitió avanzar con claridad.
  * Si hubo patrones de horarios: pregunta sobre cómo aprovechar mejor esos momentos.
  * Si hubo sentimientos específicos en encuestas: pregunta sobre cómo mantener o mejorar esos estados.
  * Si hay pocos datos: usa la pregunta por defecto pero adaptada.
  * La pregunta debe ser breve (máximo 15 palabras), cálida, sin juicio, y relacionada con algo específico de su semana.` : ''}
- Respondé SOLO con JSON válido, sin texto adicional antes o después.`;
  }

  /**
   * Construye un resumen legible de los datos para ayudar al modelo
   */
  private buildDataSummary(metrics: WeeklyMetrics): string {
    const { datos_detallados, metricas_7d, patrones_7d } = metrics;
    let summary = `Período: ${metrics.periodo.desde} a ${metrics.periodo.hasta}\n\n`;

    // Resumen de métricas
    summary += `Métricas generales:\n`;
    summary += `- Check-ins: ${metricas_7d.checkins_realizados} de 7 días\n`;
    summary += `- Tareas: ${metricas_7d.tareas_completadas} completadas de ${metricas_7d.tareas_totales} totales\n`;
    summary += `- Bloques: ${metricas_7d.bloques_completados} completados de ${metricas_7d.bloques_totales} totales\n`;
    if (metricas_7d.promedio_energia) {
      summary += `- Energía promedio: ${metricas_7d.promedio_energia}/5\n`;
    }
    if (metricas_7d.promedio_satisfaccion) {
      summary += `- Satisfacción promedio: ${metricas_7d.promedio_satisfaccion}/5\n`;
    }

    // Bloques específicos (últimos 5)
    if (datos_detallados.bloques.length > 0) {
      summary += `\nBloques recientes (últimos 5):\n`;
      datos_detallados.bloques.slice(-5).forEach((b) => {
        summary += `- ${b.fecha} ${b.hora_inicio}-${b.hora_fin}: "${b.titulo}" ${b.completado ? '✓' : '✗'}\n`;
      });
    }

    // Tareas específicas (últimas 5)
    if (datos_detallados.tareas.length > 0) {
      summary += `\nTareas recientes (últimas 5):\n`;
      datos_detallados.tareas.slice(-5).forEach((t) => {
        summary += `- ${t.fecha}: "${t.titulo}" ${t.completada ? '✓' : '✗'}\n`;
      });
    }

    // Check-ins con energía/mood
    if (datos_detallados.checkins.length > 0) {
      summary += `\nCheck-ins:\n`;
      datos_detallados.checkins.forEach((c) => {
        const parts: string[] = [];
        if (c.energia !== undefined) parts.push(`energía: ${c.energia}/5`);
        if (c.mood) parts.push(`mood: ${c.mood}`);
        if (c.sleepDuration) parts.push(`sueño: ${c.sleepDuration}h`);
        if (parts.length > 0) {
          summary += `- ${c.fecha}: ${parts.join(', ')}\n`;
        }
      });
    }

    // Encuestas con sentimientos
    if (datos_detallados.encuestas.length > 0) {
      summary += `\nEncuestas post-actividad:\n`;
      datos_detallados.encuestas.forEach((e) => {
        const parts = [`feeling: ${e.feeling}`, `focus: ${e.focus}`];
        if (e.interrupted) parts.push(`interrumpido: ${e.interruptionReason || 'sí'}`);
        summary += `- ${e.fecha}: ${parts.join(', ')}\n`;
      });
    }

    // Patrones
    if (patrones_7d.dias_mas_productivos && patrones_7d.dias_mas_productivos.length > 0) {
      summary += `\nDías más productivos: ${patrones_7d.dias_mas_productivos.join(', ')}\n`;
    }
    if (patrones_7d.horas_mas_productivas && patrones_7d.horas_mas_productivas.length > 0) {
      summary += `Horas más productivas: ${patrones_7d.horas_mas_productivas.join(', ')}\n`;
    }
    if (patrones_7d.motivos_frecuentes && patrones_7d.motivos_frecuentes.length > 0) {
      summary += `Motivos de interrupción frecuentes: ${patrones_7d.motivos_frecuentes.join(', ')}\n`;
    }

    return summary;
  }

  /**
   * Parsea la respuesta del modelo y la convierte en WeeklyInsights
   */
  private parseWeeklyInsightsResponse(rawText: string, settings?: AiSettings): WeeklyInsights {
    // Intentar parsear directamente
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Intentar extraer JSON de bloques de código
      const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch?.[1]) {
        try {
          parsed = JSON.parse(codeBlockMatch[1]);
        } catch {
          // Continuar con otros métodos
        }
      }

      // Si aún no funciona, buscar el primer objeto JSON válido
      if (!parsed) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch?.[0]) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            // Fallar
          }
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('No se pudo parsear la respuesta del modelo como JSON válido');
    }

    // Normalizar la respuesta
    const analisis = typeof parsed.analisis === 'string' ? parsed.analisis : '';
    const recomendaciones = Array.isArray(parsed.recomendaciones)
      ? parsed.recomendaciones.filter((r: any) => typeof r === 'string').slice(0, 3)
      : [];
    const mantener = typeof parsed.mantener === 'string' ? parsed.mantener : undefined;

    // Validar y normalizar la pregunta de reflexión (solo si está habilitada)
    const includeReflectionQuestion = settings?.dailyReflectionQuestionEnabled !== false;
    let preguntaReflexion = '¿Qué pequeño gesto podrías darte mañana para acompañarte mejor?';

    if (includeReflectionQuestion) {
      preguntaReflexion =
        typeof parsed.preguntaReflexion === 'string' ? parsed.preguntaReflexion.trim() : preguntaReflexion;

      // Asegurar que sea una pregunta (termina con ?)
      if (!preguntaReflexion.endsWith('?')) {
        preguntaReflexion = preguntaReflexion + '?';
      }

      // Si está vacía o es muy genérica, usar la pregunta por defecto
      if (preguntaReflexion.length < 10) {
        preguntaReflexion = '¿Qué pequeño gesto podrías darte mañana para acompañarte mejor?';
      }
    }

    // Validar que tenemos al menos análisis y recomendaciones
    if (!analisis || recomendaciones.length === 0) {
      throw new Error('La respuesta del modelo no contiene los campos requeridos');
    }

    // Asegurar que tenemos exactamente 3 recomendaciones
    while (recomendaciones.length < 3) {
      recomendaciones.push('Continúa con tu rutina actual.');
    }

    return {
      analisis,
      recomendaciones: recomendaciones.slice(0, 3) as [string, string, string],
      mantener: mantener || undefined,
      preguntaReflexion,
    };
  }

  /**
   * Genera un plan para el día siguiente (a futuro)
   * TODO: Implementar cuando se necesite
   */
  async planTomorrow(context: unknown): Promise<unknown> {
    // TODO: Implementar cuando se necesite
    throw new Error('planTomorrow no está implementado aún');
  }
}

/**
 * Factory function para crear una instancia del cliente
 */
export function createAgendoAIClient(): OllamaAgendoAIClient {
  return new OllamaAgendoAIClient();
}
