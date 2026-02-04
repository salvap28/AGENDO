/**
 * Endpoint para obtener insights semanales generados por IA
 */

import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import { createAgendoAIClient } from '../lib/agendo-ai/client.js';
import { calculateWeeklyMetrics } from '../lib/agendo-ai/metrics.js';
import { WeeklyInsights } from '../lib/agendo-ai/types.js';
import { AiSettings } from '../lib/agendo-ai-engine/types.js';

const router = Router();

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD
 */
function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * POST /api/ai/weekly-insights
 * 
 * Genera insights semanales basados en los datos de los últimos 7 días del usuario.
 * 
 * La respuesta se cachea por día: la misma respuesta se devuelve durante todo el día,
 * y cambia al día siguiente.
 * 
 * Requiere autenticación (Bearer token).
 * 
 * Respuesta:
 * {
 *   "analisis": "string",
 *   "recomendaciones": ["string", "string", "string"],
 *   "mantener": "string" (opcional),
 *   "preguntaReflexion": "string"
 * }
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const today = getTodayDate();

    // Verificar si ya hay un cache para hoy
    const cached = await prisma.weeklyInsightsCache.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    // Si existe cache para hoy, devolverlo
    if (cached && cached.insights) {
      const cachedInsights = cached.insights as unknown as WeeklyInsights;
      return res.json(cachedInsights);
    }

    // Si no hay cache, generar nuevos insights
    const metrics = await calculateWeeklyMetrics(prisma, userId);
    
    // Obtener settings del usuario para respetar dailyReflectionQuestionEnabled
    const onboarding = await prisma.onboardingState.findUnique({
      where: { userId },
      select: { aiSettings: true },
    });
    
    const aiSettings = buildAiSettings(onboarding?.aiSettings);
    const aiClient = createAgendoAIClient();
    const insights = await aiClient.getWeeklyInsights(metrics, aiSettings);

    // Guardar en cache para hoy
    await prisma.weeklyInsightsCache.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      create: {
        userId,
        date: today,
        insights: insights as any,
      },
      update: {
        insights: insights as any,
      },
    });

    return res.json(insights);
  } catch (error) {
    console.error('[weekly-insights] Error:', error);

    if (error instanceof Error) {
      // Errores de modelo no encontrado
      if (error.message.includes('no encontrado') || error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Modelo de IA no encontrado',
          message: error.message,
        });
      }

      // Errores de comunicación con Google AI Studio
      if (error.message.includes('Gemini') || error.message.includes('Google AI Studio') || error.message.includes('fetch') || error.message.includes('timeout') || error.message.includes('API')) {
        return res.status(502).json({
          error: 'Error al comunicarse con el servicio de IA',
          message: error.message,
        });
      }

      // Errores de parseo de JSON
      if (error.message.includes('JSON') || error.message.includes('parsear')) {
        return res.status(500).json({
          error: 'Error al procesar la respuesta del modelo de IA',
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      error: 'Error interno al generar insights semanales',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

function getDefaultAiSettings(): AiSettings {
  return {
    tone: 'warm',
    interventionLevel: 'medium',
    dailyReflectionQuestionEnabled: true,
  };
}

function buildAiSettings(raw: unknown): AiSettings {
  const tone = raw && typeof raw === 'object' && 'tone' in raw ? (raw as any).tone : undefined;
  const intervention =
    raw && typeof raw === 'object' && 'interventionLevel' in raw ? (raw as any).interventionLevel : undefined;
  const reflection =
    raw && typeof raw === 'object' && 'dailyReflectionQuestionEnabled' in raw
      ? (raw as any).dailyReflectionQuestionEnabled
      : undefined;

  const validTone: AiSettings['tone'] = tone === 'neutral' || tone === 'direct' ? tone : 'warm';
  const validIntervention: AiSettings['interventionLevel'] =
    intervention === 'low' || intervention === 'high' ? intervention : 'medium';
  const validReflection =
    typeof reflection === 'boolean' ? reflection : getDefaultAiSettings().dailyReflectionQuestionEnabled;

  return {
    tone: validTone,
    interventionLevel: validIntervention,
    dailyReflectionQuestionEnabled: validReflection,
  };
}

export default router;

