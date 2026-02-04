/**
 * Tipos e interfaces para la capa de IA de Agendo
 */

export interface WeeklyInsights {
  analisis: string;
  recomendaciones: [string, string, string];
  mantener?: string;
  preguntaReflexion: string;
}
