import { AiSettings, ProfileInsightsResult } from './types.js';
import { PatternResults } from './patterns.js';
import { humanizeCategory } from './utils.js';

export function buildProfileInsights(
  patterns: PatternResults,
  settings: AiSettings,
): ProfileInsightsResult {
  const recommendations = buildRecommendations(patterns, settings);
  return {
    bestFocusSlot: patterns.bestFocusSlot,
    strongestDay: patterns.dayPattern.strongestDay,
    weakestDay: patterns.dayPattern.weakestDay,
    topCategories: patterns.topCategories,
    recommendations,
  };
}

function buildRecommendations(patterns: PatternResults, settings: AiSettings) {
  const desired = pickRecommendationCount(settings);
  const recommendations: ProfileInsightsResult['recommendations'] = [];

  if (patterns.bestFocusSlot) {
    recommendations.push({
      title: 'Protegé tu franja fuerte',
      description: `Concentrá tus bloques más exigentes entre ${patterns.bestFocusSlot}, donde mostrás mejor calidad de foco.`,
    });
  }

  if (patterns.dayPattern.strongestDay) {
    recommendations.push({
      title: 'Planifica el día pico',
      description: `Reservá decisiones y tareas estratégicas para ${patterns.dayPattern.strongestDay}, tu día más consistente.`,
    });
  }

  if (patterns.topCategories.length) {
    const mainCategory = patterns.topCategories[0];
    recommendations.push({
      title: 'Apalancá lo que ya funciona',
      description: `Sostené ${mainCategory} como columna vertebral de tu semana y duplicá bloques cuando necesites avanzar rápido.`,
    });
  }

  if (patterns.dayPattern.weakestDay) {
    recommendations.push({
      title: 'Protegé el día flojo',
      description: `Usá ${patterns.dayPattern.weakestDay} para descanso activo o tareas livianas y reducí compromisos de foco largo.`,
    });
  }

  const bias = patterns.estimationBias.find((item) => Math.abs(item.biasPercent) >= 8);
  if (bias) {
    const label = humanizeCategory(bias.category);
    if (bias.biasPercent > 0) {
      recommendations.push({
        title: 'Ajustá tiempos planificados',
        description: `Sueles subestimar ${label} en ~${Math.abs(bias.biasPercent)}%. Proba extender la duración típica de esos bloques.`,
      });
    } else {
      recommendations.push({
        title: 'Compactá cuando sobra tiempo',
        description: `${label} suele terminar ~${Math.abs(bias.biasPercent)}% antes de lo previsto. Acortá la planificación o encadená un bloque breve al cierre.`,
      });
    }
  }

  if (!settings.dailyReflectionQuestionEnabled) {
    recommendations.push({
      title: 'Activa la reflexión rápida',
      description: 'Habilitá la pregunta diaria para capturar aprendizajes y ajustar tus bloques sin fricción.',
    });
  }

  const fallback: ProfileInsightsResult['recommendations'] = [
    {
      title: 'Anclaje de cierre',
      description: 'Escribí una línea al terminar cada bloque con lo que funcionó o falló para acelerar tu curva de aprendizaje.',
    },
    {
      title: 'Bloques sin notificaciones',
      description: 'Definí un modo foco corto (30-45 min) con notificaciones silenciadas y avisos claros a tu entorno.',
    },
    {
      title: 'Agrupá tareas similares',
      description: 'Apila tareas cortas de la misma categoría para reducir el costo de cambio de contexto.',
    },
    {
      title: 'Pulso de energía',
      description: 'Elegí el primer bloque del día para algo que te recargue en menos de 45 minutos.',
    },
  ];

  for (const item of fallback) {
    if (recommendations.length >= desired) break;
    const duplicated = recommendations.some((rec) => rec.title === item.title);
    if (!duplicated) recommendations.push(item);
  }

  return recommendations.slice(0, desired);
}

function pickRecommendationCount(settings: AiSettings): number {
  if (settings.interventionLevel === 'high') return 5;
  if (settings.interventionLevel === 'medium') return 4;
  return 3;
}
