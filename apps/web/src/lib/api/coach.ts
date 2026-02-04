import { API_BASE } from '@/lib/api';

export type CoachResponse = {
  weeklySummaryText: string;
  insights: string[];
  recommendations: string[];
  reflectionQuestion?: string; // Opcional: solo se incluye si dailyReflectionQuestionEnabled es true
};

/**
 * Respuesta del nuevo endpoint de insights semanales
 */
export type WeeklyInsightsResponse = {
  analisis: string;
  recomendaciones: string[];
  mantener?: string;
  preguntaReflexion?: string; // Opcional: solo se incluye si dailyReflectionQuestionEnabled es true
};

export async function getCoachSummary(from?: string, to?: string): Promise<CoachResponse> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const body: Record<string, string> = {};
  if (from) body.from = from;
  if (to) body.to = to;

  const endpoints = [
    `${API_BASE}/api/ai/coach`,
    'http://localhost:4000/api/ai/coach',
  ];

  let lastError: Error | null = null;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { coach?: CoachResponse };
      if (json.coach) return json.coach;
      throw new Error('Respuesta sin campo coach');
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Error desconocido');
    }
  }

  throw new Error(`Error obteniendo coach summary${lastError ? `: ${lastError.message}` : ''}`);
}

/**
 * Obtiene insights semanales del nuevo endpoint /api/ai/weekly-insights
 */
export async function getWeeklyInsights(): Promise<WeeklyInsightsResponse> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const endpoints = [
    `${API_BASE}/api/ai/weekly-insights`,
    'http://localhost:4000/api/ai/weekly-insights',
  ];

  let lastError: Error | null = null;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as WeeklyInsightsResponse;
      return json;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Error desconocido');
    }
  }

  throw new Error(`Error obteniendo weekly insights${lastError ? `: ${lastError.message}` : ''}`);
}

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('agendo_token');
  }
  return null;
}
