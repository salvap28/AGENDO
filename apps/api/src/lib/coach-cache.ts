/**
 * Utilidades para manejar el cache del coach AI
 */

import { PrismaClient } from '@prisma/client';
import { getLast7DaysWindow } from './agendo-ai/metrics.js';

/**
 * Verifica si una fecha está dentro del rango utilizado por el coach (últimos 7 días)
 * @param dateString Fecha en formato YYYY-MM-DD
 * @returns true si la fecha está dentro del rango
 */
export function isDateInCoachRange(dateString: string): boolean {
  const { desde, hasta } = getLast7DaysWindow();
  return dateString >= desde && dateString <= hasta;
}

/**
 * Invalida el cache del coach para un usuario si la fecha está dentro del rango
 * @param prisma Instancia de PrismaClient
 * @param userId ID del usuario
 * @param dateString Fecha del cambio en formato YYYY-MM-DD (opcional, si no se proporciona invalida siempre)
 * @returns true si se invalidó el cache, false si no era necesario
 */
export async function invalidateCoachCacheIfNeeded(
  prisma: PrismaClient,
  userId: string,
  dateString?: string
): Promise<boolean> {
  // Si no se proporciona fecha, invalidar siempre (por seguridad)
  if (!dateString) {
    await invalidateCoachCache(prisma, userId);
    return true;
  }

  // Verificar si la fecha está dentro del rango
  if (isDateInCoachRange(dateString)) {
    await invalidateCoachCache(prisma, userId);
    return true;
  }

  return false;
}

/**
 * Invalida todo el cache del coach para un usuario
 * Elimina todos los registros de WeeklyInsightsCache para el usuario
 * @param prisma Instancia de PrismaClient
 * @param userId ID del usuario
 */
export async function invalidateCoachCache(prisma: PrismaClient, userId: string): Promise<void> {
  try {
    await prisma.weeklyInsightsCache.deleteMany({
      where: { userId },
    });
  } catch (error) {
    // Log el error pero no fallar la operación principal
    console.error('[coach-cache] Error al invalidar cache:', error);
  }
}

