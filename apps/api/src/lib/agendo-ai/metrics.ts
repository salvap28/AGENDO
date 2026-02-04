/**
 * Funciones para calcular métricas semanales desde la base de datos
 */

import type { PrismaClient } from '@prisma/client';

export interface Last7DaysWindow {
  desde: string;
  hasta: string;
}

/**
 * Calcula la ventana de 7 días anteriores (desde hace 7 días hasta ayer)
 * @returns Objeto con fechas desde y hasta en formato YYYY-MM-DD
 */
export function getLast7DaysWindow(): Last7DaysWindow {
  const ahora = new Date();
  // Normalizar a inicio de día en la zona local del servidor
  ahora.setHours(0, 0, 0, 0);

  // Hasta: ayer (último día completo)
  const hasta = new Date(ahora);
  hasta.setDate(hasta.getDate() - 1);

  // Desde: hace 7 días (desde el inicio del día)
  const desde = new Date(hasta);
  desde.setDate(desde.getDate() - 6);

  return {
    desde: formatYmd(desde),
    hasta: formatYmd(hasta),
  };
}

/**
 * Formatea una fecha a YYYY-MM-DD
 */
function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Obtiene el nombre del día de la semana en español
 */
function getDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;
  return days[date.getDay()] ?? 'desconocido';
}

/**
 * Calcula las métricas semanales para un usuario
 */
export async function calculateWeeklyMetrics(prisma: PrismaClient, userId: string) {
  const { desde, hasta } = getLast7DaysWindow();

  // Consultar todos los datos en paralelo
  const [checkIns, tareas, bloques, encuestas, user] = await Promise.all([
    prisma.dailyMetric.findMany({
      where: { userId, date: { gte: desde, lte: hasta } },
      orderBy: { date: 'asc' },
    }),
    prisma.task.findMany({
      where: { userId, date: { gte: desde, lte: hasta } },
    }),
    prisma.block.findMany({
      where: { userId, date: { gte: desde, lte: hasta } },
    }),
    prisma.completionFeedback.findMany({
      where: { userId, instanceDate: { gte: desde, lte: hasta } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
  ]);

  // Calcular días esperados (7 días)
  const diasEsperados = 7;
  const checkinsRealizados = checkIns.length;
  const checkinsOmitidos = Math.max(0, diasEsperados - checkinsRealizados);

  // Métricas de tareas
  const tareasTotales = tareas.length;
  const tareasCompletadas = tareas.filter((t) => t.done).length;

  // Métricas de bloques
  const bloquesTotales = bloques.length;
  const bloquesCompletados = bloques.filter((b) => b.completed).length;

  // Promedios de satisfacción y energía
  const satisfacciones: number[] = [];
  const energias: number[] = [];

  // Mapear feeling a número (1-5)
  const feelingToNumber = (feeling: string | null): number | null => {
    if (!feeling) return null;
    const map: Record<string, number> = {
      excellent: 5,
      good: 4,
      neutral: 3,
      tired: 2,
      frustrated: 1,
    };
    return map[feeling] ?? null;
  };

  encuestas.forEach((e) => {
    const sat = feelingToNumber(e.feeling as string | null);
    if (sat !== null) satisfacciones.push(sat);
  });

  checkIns.forEach((c) => {
    if (c.energyLevel !== null && c.energyLevel !== undefined) {
      energias.push(c.energyLevel);
    }
  });

  const promedioSatisfaccion =
    satisfacciones.length > 0
      ? Number((satisfacciones.reduce((a, b) => a + b, 0) / satisfacciones.length).toFixed(2))
      : undefined;

  const promedioEnergia =
    energias.length > 0
      ? Number((energias.reduce((a, b) => a + b, 0) / energias.length).toFixed(2))
      : undefined;

  // Patrones: días más productivos
  const productividadPorDia: Record<string, number> = {};
  bloques.forEach((b) => {
    if (b.completed) {
      const dia = getDayName(b.date);
      productividadPorDia[dia] = (productividadPorDia[dia] || 0) + 1;
    }
  });

  const diasMasProductivos = Object.entries(productividadPorDia)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dia]) => dia);

  // Patrones: horas más productivas
  const productividadPorHora: Record<string, number> = {};
  bloques.forEach((b) => {
    if (b.completed) {
      const horaInicio = b.start.split(':')[0];
      const horaFin = b.end.split(':')[0];
      const rango = `${horaInicio}:00-${horaFin}:00`;
      productividadPorHora[rango] = (productividadPorHora[rango] || 0) + 1;
    }
  });

  const horasMasProductivas = Object.entries(productividadPorHora)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hora]) => hora);

  // Patrones: tipos de tarea con más abandono
  // Por ahora, no tenemos categorías en el schema, así que esto queda vacío
  const tiposTareaConMasAbandono: string[] = [];

  // Patrones: motivos frecuentes de encuesta
  const motivosFrecuentes: string[] = [];
  const motivosCount: Record<string, number> = {};
  encuestas.forEach((e) => {
    if (e.interruptionReason) {
      motivosCount[e.interruptionReason] = (motivosCount[e.interruptionReason] || 0) + 1;
    }
  });

  const motivosOrdenados = Object.entries(motivosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([motivo]) => motivo);

  motivosFrecuentes.push(...motivosOrdenados);

  // Perfil a largo plazo
  const semanasUsandoAgendo = user
    ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 7))
    : 0;

  // Calcular tendencia de consistencia (comparar primera mitad vs segunda mitad de la semana)
  const fechasOrdenadas = [...new Set(bloques.map((b) => b.date))].sort();
  const mitad = Math.floor(fechasOrdenadas.length / 2);
  const primeraMitad = fechasOrdenadas.slice(0, mitad);
  const segundaMitad = fechasOrdenadas.slice(mitad);

  const bloquesPrimeraMitad = bloques.filter((b) => primeraMitad.includes(b.date)).length;
  const bloquesSegundaMitad = bloques.filter((b) => segundaMitad.includes(b.date)).length;

  let tendenciaConsistencia: 'sube' | 'baja' | 'estable' = 'estable';
  if (bloquesSegundaMitad > bloquesPrimeraMitad * 1.1) {
    tendenciaConsistencia = 'sube';
  } else if (bloquesSegundaMitad < bloquesPrimeraMitad * 0.9) {
    tendenciaConsistencia = 'baja';
  }

  // Preparar datos detallados
  const bloquesDetallados = bloques.map((b) => ({
    fecha: b.date,
    titulo: b.title,
    hora_inicio: b.start,
    hora_fin: b.end,
    completado: b.completed,
  }));

  const tareasDetalladas = tareas.map((t) => ({
    fecha: t.date,
    titulo: t.title,
    completada: t.done,
  }));

  const checkinsDetallados = checkIns.map((c) => ({
    fecha: c.date,
    energia: c.energyLevel ?? undefined,
    mood: c.mood ?? undefined,
    sleepDuration: c.sleepDuration ?? undefined,
    stress: c.stress ?? undefined,
    focus: c.focus ?? undefined,
  }));

  const encuestasDetalladas = encuestas.map((e) => ({
    fecha: e.instanceDate,
    feeling: e.feeling,
    focus: e.focus,
    interrupted: e.interrupted,
    interruptionReason: e.interruptionReason ?? undefined,
    timeDelta: e.timeDelta ?? undefined,
    nota: e.note ?? undefined,
  }));

  return {
    periodo: {
      desde,
      hasta,
    },
    metricas_7d: {
      checkins_realizados: checkinsRealizados,
      checkins_omitidos: checkinsOmitidos,
      tareas_totales: tareasTotales,
      tareas_completadas: tareasCompletadas,
      bloques_totales: bloquesTotales,
      bloques_completados: bloquesCompletados,
      promedio_satisfaccion: promedioSatisfaccion,
      promedio_energia: promedioEnergia,
    },
    datos_detallados: {
      bloques: bloquesDetallados,
      tareas: tareasDetalladas,
      checkins: checkinsDetallados,
      encuestas: encuestasDetalladas,
    },
    patrones_7d: {
      dias_mas_productivos: diasMasProductivos.length > 0 ? diasMasProductivos : undefined,
      horas_mas_productivas: horasMasProductivas.length > 0 ? horasMasProductivas : undefined,
      tipos_tarea_con_mas_abandono:
        tiposTareaConMasAbandono.length > 0 ? tiposTareaConMasAbandono : undefined,
      motivos_frecuentes: motivosFrecuentes.length > 0 ? motivosFrecuentes : undefined,
    },
    perfil_largo_plazo: {
      semanas_usando_agendo: semanasUsandoAgendo,
      tendencia_consistencia: tendenciaConsistencia,
    },
  };
}


