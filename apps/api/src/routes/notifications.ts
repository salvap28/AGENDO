import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from './auth.js';
import webpush from 'web-push';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// Configurar VAPID
const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const contact = process.env.VAPID_CONTACT_EMAIL || 'mailto:example@example.com';

console.log('[notifications] VAPID configuration check:');
console.log('[notifications] - Public key present:', !!publicKey);
console.log('[notifications] - Private key present:', !!privateKey);
console.log('[notifications] - Contact:', contact);

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(contact, publicKey, privateKey);
    console.log('[notifications] ✓ VAPID details configured successfully');
  } catch (e) {
    console.error('[notifications] ✗ Failed to set VAPID details:', e);
  }
} else {
  console.warn('[notifications] ⚠ VAPID keys missing! Notifications will fail to send.');
  console.warn('[notifications] Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
}

interface NotificationConfig {
  minutesBefore: number;
}

function formatTimeBefore(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    if (hours > 0) {
      return `${days}d ${hours}h`;
    }
    return `${days}d`;
  }
}

async function getSubscriptions(): Promise<any[]> {
  try {
    // Buscar el archivo de suscripciones en diferentes ubicaciones posibles
    // No usar __dirname ya que puede no estar disponible en todos los entornos
    const possiblePaths = [
      path.join(process.cwd(), 'apps', 'web', 'subscriptions.json'),
      path.join(process.cwd(), 'subscriptions.json'),
      path.join(process.cwd(), '..', 'web', 'subscriptions.json'),
      path.join(process.cwd(), '..', 'apps', 'web', 'subscriptions.json'),
    ];

    console.log('[notifications] Looking for subscriptions file...');
    console.log('[notifications] process.cwd():', process.cwd());

    for (const subsPath of possiblePaths) {
      try {
        console.log(`[notifications] Trying path: ${subsPath}`);
        const raw = await fs.readFile(subsPath, { encoding: 'utf-8' });
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.subscriptions)) {
          console.log(`[notifications] ✓ Found ${parsed.subscriptions.length} subscription(s) at ${subsPath}`);
          return parsed.subscriptions;
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.warn(`[notifications] Error reading subscriptions from ${subsPath}:`, err);
        } else {
          console.log(`[notifications] File not found at ${subsPath}`);
        }
      }
    }

    console.warn('[notifications] No subscriptions file found in any of the expected locations');
    return [];
  } catch (error) {
    console.error('[notifications] Error getting subscriptions:', error);
    return [];
  }
}

async function sendNotificationToUser(
  userId: string,
  title: string,
  message: string,
): Promise<boolean> {
  try {
    // Obtener solo las suscripciones del usuario específico desde la base de datos
    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
    });
    
    console.log(`[notifications] Attempting to send notification to user ${userId}, found ${subs.length} subscription(s)`);
    
    if (subs.length === 0) {
      console.log(`[notifications] No subscriptions found for user ${userId}`);
      return false;
    }

    const payload = JSON.stringify({ title, body: message });
    let sent = false;
    let successCount = 0;
    let failCount = 0;

    for (const sub of subs) {
      try {
        // Convertir el modelo de Prisma al formato que espera web-push
        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        
        console.log(`[notifications] Sending to subscription: ${sub.endpoint?.substring(0, 50) || 'unknown'}...`);
        const result = await webpush.sendNotification(subscription, payload, { TTL: 86400 });
        console.log(`[notifications] ✓ Notification sent successfully to ${sub.endpoint?.substring(0, 50) || 'unknown'}...`);
        console.log(`[notifications] Response status: ${result?.statusCode || 'unknown'}`);
        sent = true;
        successCount++;
      } catch (err: any) {
        console.error(`[notifications] ✗ Failed to send notification to ${sub.endpoint?.substring(0, 50) || 'unknown'}:`, err.message || err);
        console.error(`[notifications] Error details:`, {
          statusCode: err.statusCode,
          body: err.body,
          headers: err.headers,
        });
        failCount++;
        // Si la suscripción es inválida (404, 410), eliminarla de la base de datos
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.warn(`[notifications] Subscription appears to be invalid (${err.statusCode}), removing it from database`);
          try {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
            console.log(`[notifications] ✓ Removed invalid subscription ${sub.id}`);
          } catch (deleteErr) {
            console.error(`[notifications] Failed to remove subscription:`, deleteErr);
          }
        }
        // Si el error es 401, las claves VAPID no coinciden
        if (err.statusCode === 401) {
          console.error(`[notifications] ⚠ VAPID keys mismatch! The subscription was created with different VAPID keys.`);
        }
      }
    }

    console.log(`[notifications] Send results: ${successCount} successful, ${failCount} failed`);
    return sent;
  } catch (error) {
    console.error(`[notifications] Error sending notification to user ${userId}:`, error);
    return false;
  }
}

function computeOccurrences(
  baseDate: string,
  repeatRule: any,
  startDate: Date,
  endDate: Date,
): string[] {
  if (!repeatRule) {
    return [baseDate];
  }

  const occurrences: string[] = [];
  const base = new Date(baseDate + 'T00:00:00');
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (repeatRule.kind === 'daily') {
    const interval = repeatRule.interval || 1;
    let current = new Date(base);
    while (current <= end) {
      if (current >= start) {
        const dateKey = current.toISOString().slice(0, 10);
        occurrences.push(dateKey);
      }
      current.setDate(current.getDate() + interval);
    }
  } else if (repeatRule.kind === 'weekly') {
    const interval = repeatRule.interval || 1;
    const daysOfWeek = repeatRule.daysOfWeek || [];
    const baseDayOfWeek = base.getDay();
    
    // Calcular todas las ocurrencias en el rango
    let currentWeek = 0;
    const maxWeeks = 52; // Límite de seguridad
    
    while (currentWeek < maxWeeks) {
      for (const targetDayOfWeek of daysOfWeek) {
        const daysToAdd = (targetDayOfWeek - baseDayOfWeek + 7) % 7 + (currentWeek * 7 * interval);
        const candidate = new Date(base);
        candidate.setDate(base.getDate() + daysToAdd);
        
        if (candidate >= start && candidate <= end) {
          const dateKey = candidate.toISOString().slice(0, 10);
          if (!occurrences.includes(dateKey)) {
            occurrences.push(dateKey);
          }
        } else if (candidate > end) {
          // Si ya pasamos el rango, salir
          break;
        }
      }
      currentWeek++;
      if (currentWeek * 7 * interval > (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) {
        break;
      }
    }
  }

  return occurrences.length > 0 ? occurrences : [baseDate];
}

// Endpoint para verificar y enviar notificaciones programadas
router.post('/check', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const now = new Date();
    
    // Usar la zona horaria local del servidor para calcular la fecha de hoy
    // Esto evita problemas con UTC que puede estar en un día diferente
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    console.log(`[notifications/check] ========================================`);
    console.log(`[notifications/check] Checking notifications for user ${userId}`);
    console.log(`[notifications/check] Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`[notifications/check] Current time: ${nowTimeStr} (${nowMinutes}min) on ${today}`);
    console.log(`[notifications/check] Date object: ${now.toString()}`);
    console.log(`[notifications/check] ISO string: ${now.toISOString()}`);
    console.log(`[notifications/check] ========================================`);

    // Obtener todos los bloques y tareas del usuario actual
    // Filtrar aquellos que tienen notificaciones configuradas
    const allBlocks = await prisma.block.findMany({
      where: {
        userId,
      },
      include: { user: true },
    });

    const allTasks = await prisma.task.findMany({
      where: {
        userId,
      },
      include: { user: true },
    });

    // Filtrar bloques y tareas que tienen notificaciones configuradas
    const blocks = allBlocks.filter(block => {
      if (!block.notifications) return false;
      try {
        const notifData = typeof block.notifications === 'string' 
          ? JSON.parse(block.notifications) 
          : block.notifications;
        return Array.isArray(notifData) && notifData.length > 0;
      } catch {
        return false;
      }
    });

    const tasks = allTasks.filter(task => {
      if (!task.notifications) return false;
      try {
        const notifData = typeof task.notifications === 'string' 
          ? JSON.parse(task.notifications) 
          : task.notifications;
        return Array.isArray(notifData) && notifData.length > 0;
      } catch {
        return false;
      }
    });

    console.log(`[notifications/check] Found ${blocks.length} blocks and ${tasks.length} tasks with notifications`);

    const notificationsToSend: Array<{
      id: string;
      userId: string;
      title: string;
      message: string;
    }> = [];

    // Procesar bloques
    for (const block of blocks) {
      let notifications: NotificationConfig[] = [];
      try {
        const notifData = block.notifications;
        if (typeof notifData === 'string') {
          notifications = JSON.parse(notifData);
        } else if (Array.isArray(notifData)) {
          notifications = notifData;
        }
      } catch (e) {
        console.warn(`[notifications/check] Error parsing notifications for block ${block.id}:`, e);
        continue;
      }
      
      if (notifications.length === 0) continue;

      const blockDate = new Date(block.date + 'T' + block.start);
      const blockMinutes = blockDate.getHours() * 60 + blockDate.getMinutes();
      const blockDateKey = block.date;

      console.log(`[notifications/check] Processing block "${block.title}" on ${blockDateKey} at ${block.start} with ${notifications.length} notification(s)`);
      console.log(`[notifications/check] Block date: ${blockDateKey}, Today: ${today}, Comparison: ${blockDateKey < today ? 'BLOCKED (past date)' : blockDateKey === today ? 'TODAY' : 'FUTURE'}`);

      // Verificar si el bloque es hoy o en el futuro
      // Usar comparación de strings (YYYY-MM-DD) que funciona correctamente
      if (blockDateKey < today) {
        console.log(`[notifications/check] ✗ Skipping block "${block.title}" - date ${blockDateKey} is in the past (today is ${today})`);
        continue;
      }
      
      console.log(`[notifications/check] ✓ Block "${block.title}" date ${blockDateKey} is valid (today or future)`);

      // Calcular ocurrencias si hay repeatRule
      const occurrences = computeOccurrences(
        block.date,
        block.repeatRule as any,
        new Date(today),
        new Date(new Date(today).getTime() + 7 * 24 * 60 * 60 * 1000), // Próximos 7 días
      );

      console.log(`[notifications/check] Computing occurrences for block "${block.title}"...`);
      console.log(`[notifications/check] Base date: ${block.date}, Repeat rule:`, block.repeatRule);
      
      for (const occurrenceDate of occurrences) {
        console.log(`[notifications/check] Checking occurrence on ${occurrenceDate}...`);
        if (occurrenceDate < today) {
          console.log(`[notifications/check] ✗ Skipping occurrence ${occurrenceDate} - in the past`);
          continue;
        }

        // Parsear la hora de inicio correctamente (formato HH:mm)
        const [startHour, startMin] = block.start.split(':').map(Number);
        const occurrenceDateObj = new Date(occurrenceDate + 'T00:00:00');
        occurrenceDateObj.setHours(startHour, startMin, 0, 0);
        const occurrenceMinutes = occurrenceDateObj.getHours() * 60 + occurrenceDateObj.getMinutes();

        for (const notif of notifications) {
          // Si minutesBefore es 0, la notificación es "al inicio"
          const notificationTime = notif.minutesBefore === 0 
            ? occurrenceMinutes 
            : occurrenceMinutes - notif.minutesBefore;
          const timeDiff = Math.abs(nowMinutes - notificationTime);
          
          const occurrenceTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
          const notificationTimeStr = `${String(Math.floor(notificationTime / 60)).padStart(2, '0')}:${String(notificationTime % 60).padStart(2, '0')}`;
          const nowTimeStr = `${String(Math.floor(nowMinutes / 60)).padStart(2, '0')}:${String(nowMinutes % 60).padStart(2, '0')}`;
          
          const notificationType = notif.minutesBefore === 0 ? 'al inicio' : `${notif.minutesBefore}min antes`;
          
          console.log(`[notifications/check] Block "${block.title}" on ${occurrenceDate}:`);
          console.log(`  - Occurrence time: ${occurrenceTimeStr} (${occurrenceMinutes}min)`);
          console.log(`  - Notification time: ${notificationTimeStr} (${notificationTime}min, ${notificationType})`);
          console.log(`  - Current time: ${nowTimeStr} (${nowMinutes}min)`);
          console.log(`  - Time difference: ${timeDiff}min`);
          
          // Verificar si es el momento exacto de enviar la notificación
          // Usar un margen dinámico: ±1 minuto para notificaciones cercanas, ±2 minutos para notificaciones más lejanas
          // IMPORTANTE: No enviar si el evento ya pasó
          const isToday = occurrenceDate === today;
          const isTimeValid = notificationTime >= 0;
          // Margen dinámico: si la notificación es para más de 5 minutos antes, usar margen de ±2 minutos
          const margin = notif.minutesBefore > 5 ? 2 : 1;
          const isWithinMargin = timeDiff <= margin;
          const eventNotPassed = occurrenceMinutes >= nowMinutes; // El evento no debe haber pasado aún
          
          // Crear un ID único para esta notificación específica (bloque + fecha + minutos antes)
          const notificationId = `${block.id}-${occurrenceDate}-${notif.minutesBefore}`;
          
          console.log(`[notifications/check] Conditions check for notification ID: ${notificationId}:`);
          console.log(`  - Is today? ${isToday} (${occurrenceDate} === ${today})`);
          console.log(`  - Time valid? ${isTimeValid} (${notificationTime}min >= 0)`);
          console.log(`  - Within margin? ${isWithinMargin} (${timeDiff}min <= ${margin}min, margin=${margin}min)`);
          console.log(`  - Event not passed? ${eventNotPassed} (${occurrenceMinutes}min >= ${nowMinutes}min)`);
          
          if (isToday && isTimeValid && isWithinMargin && eventNotPassed) {
            // Verificar si ya enviamos esta notificación antes (en la base de datos)
            const alreadySent = await prisma.sentNotification.findUnique({
              where: { notificationId },
            });
            
            if (!alreadySent && !notificationsToSend.find(n => n.id === notificationId)) {
              const timeBefore = formatTimeBefore(notif.minutesBefore);
              const message = notif.minutesBefore === 0
                ? `Tu bloque "${block.title}" está comenzando ahora`
                : `Dentro de ${timeBefore} tenés agendado: "${block.title}"`;
              console.log(`[notifications/check] ✓ Scheduling notification for block "${block.title}": ${notif.minutesBefore === 0 ? 'al inicio' : timeBefore}`);
              notificationsToSend.push({
                id: notificationId,
                userId: block.userId,
                title: notif.minutesBefore === 0 ? 'Bloque iniciado' : 'Recordatorio de bloque',
                message,
              });
            } else {
              if (alreadySent) {
                console.log(`[notifications/check] ✗ Notification ${notificationId} already sent at ${alreadySent.sentAt}`);
              } else {
                console.log(`[notifications/check] ✗ Notification ${notificationId} already scheduled in this check`);
              }
            }
          } else {
            const reasons = [];
            if (!isToday) reasons.push(`not today (${occurrenceDate} vs ${today})`);
            if (!isTimeValid) reasons.push(`time invalid (${notificationTime}min < 0)`);
            if (!isWithinMargin) reasons.push(`outside margin (${timeDiff}min > 1min)`);
            if (!eventNotPassed) reasons.push(`event already passed (${occurrenceMinutes}min < ${nowMinutes}min)`);
            console.log(`[notifications/check] ✗ Not time yet or event passed: ${reasons.join(', ')}`);
          }
        }
      }
    }

    // Procesar tareas
    for (const task of tasks) {
      let notifications: NotificationConfig[] = [];
      try {
        const notifData = task.notifications;
        if (typeof notifData === 'string') {
          notifications = JSON.parse(notifData);
        } else if (Array.isArray(notifData)) {
          notifications = notifData;
        }
      } catch (e) {
        console.warn(`[notifications/check] Error parsing notifications for task ${task.id}:`, e);
        continue;
      }
      
      if (notifications.length === 0) continue;

      const taskDate = new Date(task.date + 'T09:00'); // Asumir 9 AM para tareas sin hora específica
      const taskMinutes = taskDate.getHours() * 60 + taskDate.getMinutes();
      const taskDateKey = task.date;

      // Verificar si la tarea es hoy o en el futuro
      if (taskDateKey < today) continue;

      // Calcular ocurrencias si hay repeatRule
      const occurrences = computeOccurrences(
        task.date,
        task.repeatRule as any,
        new Date(today),
        new Date(new Date(today).getTime() + 7 * 24 * 60 * 60 * 1000), // Próximos 7 días
      );

      for (const occurrenceDate of occurrences) {
        if (occurrenceDate < today) continue;

        // Para tareas, asumir 9 AM
        const occurrenceDateObj = new Date(occurrenceDate + 'T00:00:00');
        occurrenceDateObj.setHours(9, 0, 0, 0);
        const occurrenceMinutes = occurrenceDateObj.getHours() * 60 + occurrenceDateObj.getMinutes();

        for (const notif of notifications) {
          // Si minutesBefore es 0, la notificación es "al inicio"
          const notificationTime = notif.minutesBefore === 0 
            ? occurrenceMinutes 
            : occurrenceMinutes - notif.minutesBefore;
          const timeDiff = Math.abs(nowMinutes - notificationTime);
          
          const notificationTimeStr = `${String(Math.floor(notificationTime / 60)).padStart(2, '0')}:${String(notificationTime % 60).padStart(2, '0')}`;
          const nowTimeStr = `${String(Math.floor(nowMinutes / 60)).padStart(2, '0')}:${String(nowMinutes % 60).padStart(2, '0')}`;
          
          const notificationType = notif.minutesBefore === 0 ? 'al inicio' : `${notif.minutesBefore}min antes`;
          
          console.log(`[notifications/check] Task "${task.title}" on ${occurrenceDate}:`);
          console.log(`  - Occurrence time: 09:00 (${occurrenceMinutes}min)`);
          console.log(`  - Notification time: ${notificationTimeStr} (${notificationTime}min, ${notificationType})`);
          console.log(`  - Current time: ${nowTimeStr} (${nowMinutes}min)`);
          console.log(`  - Time difference: ${timeDiff}min`);
          
          // Verificar si es el momento exacto de enviar la notificación
          // Usar un margen dinámico: ±1 minuto para notificaciones cercanas, ±2 minutos para notificaciones más lejanas
          // IMPORTANTE: No enviar si el evento ya pasó
          const isToday = occurrenceDate === today;
          const isTimeValid = notificationTime >= 0;
          // Margen dinámico: 
          // - Si es "al inicio" (minutesBefore === 0), usar margen de ±1 minuto
          // - Si la notificación es para más de 5 minutos antes, usar margen de ±2 minutos
          // - Para otras notificaciones cercanas, usar margen de ±1 minuto
          const margin = notif.minutesBefore === 0 ? 1 : (notif.minutesBefore > 5 ? 2 : 1);
          const isWithinMargin = timeDiff <= margin;
          // Para notificaciones "al inicio", permitir que se envíen incluso si el evento ya comenzó (hasta 5 minutos después)
          const eventNotPassed = notif.minutesBefore === 0 
            ? (occurrenceMinutes + 5) >= nowMinutes 
            : occurrenceMinutes >= nowMinutes;
          
          // Crear un ID único para esta notificación específica (tarea + fecha + minutos antes)
          const notificationId = `${task.id}-${occurrenceDate}-${notif.minutesBefore}`;
          
          console.log(`[notifications/check] Conditions check for notification ID: ${notificationId}:`);
          console.log(`  - Is today? ${isToday} (${occurrenceDate} === ${today})`);
          console.log(`  - Time valid? ${isTimeValid} (${notificationTime}min >= 0)`);
          console.log(`  - Within margin? ${isWithinMargin} (${timeDiff}min <= ${margin}min, margin=${margin}min)`);
          console.log(`  - Event not passed? ${eventNotPassed} (${occurrenceMinutes}min >= ${nowMinutes}min)`);
          
          if (isToday && isTimeValid && isWithinMargin && eventNotPassed) {
            // Verificar si ya enviamos esta notificación antes (en la base de datos)
            const alreadySent = await prisma.sentNotification.findUnique({
              where: { notificationId },
            });
            
            if (!alreadySent && !notificationsToSend.find(n => n.id === notificationId)) {
              const timeBefore = formatTimeBefore(notif.minutesBefore);
              const message = notif.minutesBefore === 0
                ? `Tu tarea "${task.title}" está comenzando ahora`
                : `Dentro de ${timeBefore} tenés agendado: "${task.title}"`;
              console.log(`[notifications/check] ✓ Scheduling notification for task "${task.title}": ${notif.minutesBefore === 0 ? 'al inicio' : timeBefore}`);
              notificationsToSend.push({
                id: notificationId,
                userId: task.userId,
                title: notif.minutesBefore === 0 ? 'Tarea iniciada' : 'Recordatorio de tarea',
                message,
              });
            } else {
              if (alreadySent) {
                console.log(`[notifications/check] ✗ Notification ${notificationId} already sent at ${alreadySent.sentAt}`);
              } else {
                console.log(`[notifications/check] ✗ Notification ${notificationId} already scheduled in this check`);
              }
            }
          } else {
            const reasons = [];
            if (!isToday) reasons.push(`not today (${occurrenceDate} vs ${today})`);
            if (!isTimeValid) reasons.push(`time invalid (${notificationTime}min < 0)`);
            if (!isWithinMargin) reasons.push(`outside margin (${timeDiff}min > 1min)`);
            if (!eventNotPassed) reasons.push(`event already passed (${occurrenceMinutes}min < ${nowMinutes}min)`);
            console.log(`[notifications/check] ✗ Not time yet or event passed: ${reasons.join(', ')}`);
          }
        }
      }
    }

    // Verificar check-ins diarios faltantes
    // Enviar notificaciones a las 22:00 y 23:00 si el usuario no hizo check-in hoy
    const currentHour = now.getHours();
    if (currentHour === 22 || currentHour === 23) {
      console.log(`[notifications/check] Checking for missing daily check-ins at ${currentHour}:00...`);
      
      // Obtener todos los usuarios que tienen suscripciones push
      const usersWithSubscriptions = await prisma.pushSubscription.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });
      
      const userIds = [...new Set(usersWithSubscriptions.map(s => s.userId))];
      console.log(`[notifications/check] Found ${userIds.length} user(s) with push subscriptions`);
      
      for (const userId of userIds) {
        // Verificar si el usuario tiene check-in para hoy
        const checkIn = await prisma.dailyMetric.findUnique({
          where: { userId_date: { userId, date: today } },
        });
        
        if (!checkIn) {
          // El usuario no hizo check-in hoy, enviar notificación
          const notificationId = `checkin-reminder-${userId}-${today}-${currentHour}`;
          
          // Verificar si ya enviamos esta notificación
          const alreadySent = await prisma.sentNotification.findUnique({
            where: { notificationId },
          });
          
          if (!alreadySent && !notificationsToSend.find(n => n.id === notificationId)) {
            console.log(`[notifications/check] ✓ Scheduling check-in reminder for user ${userId} at ${currentHour}:00`);
            notificationsToSend.push({
              id: notificationId,
              userId,
              title: 'Recordatorio de check-in diario',
              message: 'Tomate un minuto para revisar tu día. ¿Querés hacer tu check-in ahora?',
            });
          } else {
            if (alreadySent) {
              console.log(`[notifications/check] ✗ Check-in reminder ${notificationId} already sent at ${alreadySent.sentAt}`);
            }
          }
        } else {
          console.log(`[notifications/check] User ${userId} already has check-in for today, skipping reminder`);
        }
      }
    }

    // Enviar notificaciones
    console.log(`[notifications/check] ========================================`);
    console.log(`[notifications/check] Summary: Found ${notificationsToSend.length} notification(s) to send`);
    console.log(`[notifications/check] ========================================`);
    
    const results = [];
    for (const notif of notificationsToSend) {
      const sent = await sendNotificationToUser(notif.userId, notif.title, notif.message);
      results.push({ userId: notif.userId, sent, message: notif.message });
      if (sent) {
        console.log(`[notifications/check] ✓ Sent notification: "${notif.message}"`);
        // Marcar esta notificación como enviada en la base de datos para evitar duplicados
        try {
          await prisma.sentNotification.upsert({
            where: { notificationId: notif.id },
            create: {
              notificationId: notif.id,
            },
            update: {}, // No actualizar si ya existe
          });
          console.log(`[notifications/check] ✓ Marked notification ${notif.id} as sent`);
        } catch (err) {
          console.error(`[notifications/check] Failed to mark notification as sent:`, err);
        }
      } else {
        console.warn(`[notifications/check] ✗ Failed to send notification: "${notif.message}"`);
      }
    }

    console.log(`[notifications/check] ========================================`);
    console.log(`[notifications/check] Final result: ${results.filter(r => r.sent).length}/${results.length} sent successfully`);
    console.log(`[notifications/check] ========================================`);

    res.json({
      ok: true,
      checked: blocks.length + tasks.length,
      sent: notificationsToSend.length,
      results,
    });
  } catch (error) {
    console.error('[notifications/check] Error:', error);
    res.status(500).json({
      error: 'Error al verificar notificaciones',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

// Endpoint de prueba para enviar notificaciones de check-in faltante
router.post('/test-checkin-reminder', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    
    console.log(`[notifications/test-checkin] Testing check-in reminder notifications for ${today}...`);
    
    // Obtener todos los usuarios que tienen suscripciones push
    const usersWithSubscriptions = await prisma.pushSubscription.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    
    const userIds = [...new Set(usersWithSubscriptions.map(s => s.userId))];
    console.log(`[notifications/test-checkin] Found ${userIds.length} user(s) with push subscriptions`);
    
    const results = [];
    
    for (const userId of userIds) {
      // Verificar si el usuario tiene check-in para hoy
      const checkIn = await prisma.dailyMetric.findUnique({
        where: { userId_date: { userId, date: today } },
      });
      
      if (!checkIn) {
        // El usuario no hizo check-in hoy, enviar notificación
        const notificationId = `checkin-reminder-${userId}-${today}-test`;
        
        // Verificar si ya enviamos esta notificación de prueba
        const alreadySent = await prisma.sentNotification.findUnique({
          where: { notificationId },
        });
        
        if (!alreadySent) {
          console.log(`[notifications/test-checkin] ✓ Sending check-in reminder to user ${userId}`);
          const sent = await sendNotificationToUser(
            userId,
            'Recordatorio de check-in diario',
            'Tomate un minuto para revisar tu día. ¿Querés hacer tu check-in ahora?'
          );
          
          if (sent) {
            // Marcar como enviada
            await prisma.sentNotification.create({
              data: { notificationId },
            });
            results.push({ userId, sent: true, message: 'Notification sent' });
          } else {
            results.push({ userId, sent: false, message: 'Failed to send' });
          }
        } else {
          console.log(`[notifications/test-checkin] ✗ Notification already sent to user ${userId}`);
          results.push({ userId, sent: false, message: 'Already sent' });
        }
      } else {
        console.log(`[notifications/test-checkin] User ${userId} already has check-in for today, skipping`);
        results.push({ userId, sent: false, message: 'User already has check-in' });
      }
    }
    
    const sentCount = results.filter(r => r.sent).length;
    console.log(`[notifications/test-checkin] Test complete: ${sentCount}/${results.length} notifications sent`);
    
    res.json({
      ok: true,
      tested: userIds.length,
      sent: sentCount,
      results,
    });
  } catch (error) {
    console.error('[notifications/test-checkin] Error:', error);
    res.status(500).json({
      error: 'Error al probar notificaciones de check-in',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

// Endpoint para registrar una suscripción push asociada con un usuario
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const body = req.body;
    
    // Support both `{ subscription }` and direct subscription body
    const subscription = body.subscription ?? body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Missing subscription' });
    }

    if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription: missing keys' });
    }

    console.log(`[notifications/subscribe] Registering subscription for user ${userId}: ${subscription.endpoint.substring(0, 50)}...`);

    // Upsert: si ya existe una suscripción con este endpoint, actualizarla; si no, crearla
    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId, // Actualizar el userId por si acaso cambió de usuario
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updatedAt: new Date(),
      },
    });

    console.log(`[notifications/subscribe] ✓ Subscription saved for user ${userId}: ${saved.id}`);
    res.json({ ok: true, id: saved.id });
  } catch (error: any) {
    console.error('[notifications/subscribe] Error:', error);
    res.status(500).json({ error: 'Failed to save subscription', details: error.message });
  }
});

// Middleware para verificar que el usuario es dev
async function requireDevForNotifications(req: any, res: any, next: any) {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDev: true },
  });

  if (!user || !user.isDev) {
    return res.status(403).json({ error: 'Acceso denegado. Solo usuarios dev pueden enviar notificaciones broadcast.' });
  }

  next();
}

// Endpoint para enviar notificación broadcast a todos los usuarios
router.post('/broadcast', requireAuth, requireDevForNotifications, async (req, res) => {
  try {
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'title y message son requeridos' });
    }

    console.log(`[notifications/broadcast] Enviando notificación broadcast: "${title}" - "${message}"`);

    // Obtener todos los usuarios que tienen suscripciones push
    const usersWithSubscriptions = await prisma.pushSubscription.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    
    const userIds = [...new Set(usersWithSubscriptions.map(s => s.userId))];
    console.log(`[notifications/broadcast] Encontrados ${userIds.length} usuario(s) con suscripciones push`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      try {
        const sent = await sendNotificationToUser(userId, title, message);
        if (sent) {
          successCount++;
          results.push({ userId, sent: true });
        } else {
          failCount++;
          results.push({ userId, sent: false, error: 'No subscriptions found' });
        }
      } catch (error: any) {
        failCount++;
        console.error(`[notifications/broadcast] Error enviando a usuario ${userId}:`, error);
        results.push({ userId, sent: false, error: error.message || 'Unknown error' });
      }
    }

    console.log(`[notifications/broadcast] Resultado: ${successCount} exitosas, ${failCount} fallidas`);

    res.json({
      ok: true,
      total: userIds.length,
      sent: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error('[notifications/broadcast] Error:', error);
    res.status(500).json({
      error: 'Error al enviar notificaciones broadcast',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

export default router;

