import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import { PlanGenerateSchema, generateDailyPlan } from '../lib/planning/dailyPlanner.js';

const router = Router();

router.post('/generate', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const parsed = PlanGenerateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const plan = await generateDailyPlan({ userId, data: parsed.data, prisma });
    res.json({ plan });
  } catch (error) {
    console.error('[plan/generate] Error:', error);
    res.status(500).json({
      error: 'Error al generar el plan',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

router.post('/apply', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { fecha, plan, quiereNotificaciones, cantidadNotificaciones, tiemposNotificaciones } = req.body;

    if (!fecha || !plan || !plan.bloques) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Preparar notificaciones si el usuario las quiere
    let notifications: Array<{ minutesBefore: number }> = [];
    if (quiereNotificaciones && cantidadNotificaciones > 0 && tiemposNotificaciones && tiemposNotificaciones.length > 0) {
      notifications = tiemposNotificaciones.map((minutos: number) => ({
        minutesBefore: minutos,
      }));
    }

    // Crear tareas personalizadas primero
    const tareasPersonalizadasMap = new Map();
    if (req.body.tareasPersonalizadas && Array.isArray(req.body.tareasPersonalizadas)) {
      for (const tareaCustom of req.body.tareasPersonalizadas) {
        // Solo crear si no existe ya (verificar por ID custom)
        if (tareaCustom.id && tareaCustom.id.startsWith('custom-')) {
          const tareaCreada = await prisma.task.create({
            data: {
              userId,
              date: fecha,
              title: tareaCustom.title,
              priority: tareaCustom.priority,
              done: false,
            },
          });
          tareasPersonalizadasMap.set(tareaCustom.id, tareaCreada.id);
        }
      }
    }

    // Crear bloques
    const bloquesCreados = [];
    for (const bloque of plan.bloques) {
      // Determinar el color basado en el tipo del bloque
      // Si viene "tipo", usarlo; si no, usar "color" directamente; si no hay ninguno, usar "violet" por defecto
      let blockColor: string | null = null;
      if (bloque.tipo) {
        blockColor = bloque.tipo === 'profundo' ? 'violet' : bloque.tipo === 'ligero' ? 'turquoise' : null;
      } else if (bloque.color) {
        // Si viene color como string, puede ser "violet", "turquoise" o un hex
        blockColor = typeof bloque.color === 'string' && (bloque.color === 'violet' || bloque.color === 'turquoise') 
          ? bloque.color 
          : null;
      }
      // Si no se determinó un color válido, usar "violet" por defecto (profundo)
      if (!blockColor) {
        blockColor = 'violet';
      }

      const bloqueCreado = await prisma.block.create({
        data: {
          userId,
          date: fecha,
          start: bloque.inicio,
          end: bloque.fin,
          title: bloque.titulo,
          color: blockColor,
          completed: false,
          notifications: notifications.length > 0 ? (notifications as any) : null,
        },
      });
      bloquesCreados.push(bloqueCreado);

      // Asignar tareas a bloques si hay tareas asignadas
      if (bloque.tareas && Array.isArray(bloque.tareas)) {
        for (const tareaId of bloque.tareas) {
          // Si es una tarea personalizada, usar el ID real creado
          const realTareaId = tareasPersonalizadasMap.get(tareaId) || tareaId;
          
          // Verificar que la tarea existe y pertenece al usuario
          const tarea = await prisma.task.findFirst({
            where: {
              id: realTareaId,
              userId,
            },
          });

          if (tarea) {
            // Actualizar la tarea para asociarla con el bloque (si hay un campo para eso)
            // Por ahora, las tareas se mantienen independientes
            // Podrías agregar un campo blockId a Task si lo necesitas
          }
        }
      }
    }

    res.json({ 
      success: true, 
      message: 'Plan aplicado correctamente',
      bloquesCreados: bloquesCreados.length,
    });
  } catch (error) {
    console.error('[plan/apply] Error:', error);
    res.status(500).json({
      error: 'Error al aplicar el plan',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

// Endpoint para recibir feedback del plan
const PlanFeedbackSchema = z.object({
  liked: z.boolean(),
  comment: z.string().optional(),
  planData: z.any().optional(), // Datos del plan para referencia
});

router.post('/feedback', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const parsed = PlanFeedbackSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const { liked, comment, planData } = parsed.data;

    const feedback = await prisma.planFeedback.create({
      data: {
        userId,
        liked,
        comment: comment || null,
        planData: planData || null,
      },
    });

    res.json({ 
      success: true, 
      message: 'Feedback guardado correctamente',
      feedbackId: feedback.id,
    });
  } catch (error) {
    console.error('[plan/feedback] Error:', error);
    res.status(500).json({
      error: 'Error al guardar el feedback',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

// Endpoint para obtener todos los feedbacks (solo para el desarrollador)
router.get('/feedbacks', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    
    // Obtener el usuario actual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el usuario es el desarrollador
    // El email del desarrollador se define en la variable de entorno ADMIN_EMAIL
    const adminEmail = process.env.ADMIN_EMAIL || process.env.DEVELOPER_EMAIL;
    
    if (!adminEmail || user.email !== adminEmail) {
      return res.status(403).json({ 
        error: 'No tenés permisos para acceder a esta información',
        message: 'Solo el desarrollador puede ver los feedbacks',
      });
    }
    
    const feedbacks = await prisma.planFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      take: 100, // Limitar a los últimos 100
    });

    res.json({ 
      success: true, 
      feedbacks,
      total: feedbacks.length,
    });
  } catch (error) {
    console.error('[plan/feedbacks] Error:', error);
    res.status(500).json({
      error: 'Error al obtener los feedbacks',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

export default router;

