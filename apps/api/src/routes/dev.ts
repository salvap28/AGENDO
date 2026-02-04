import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from './auth.js';

const router = Router();

// Middleware para verificar que el usuario es dev
async function requireDev(req: any, res: any, next: any) {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDev: true },
  });

  if (!user || !user.isDev) {
    return res.status(403).json({ error: 'Acceso denegado. Solo usuarios dev pueden acceder.' });
  }

  next();
}

/**
 * GET /api/dev/feedback
 * Obtener feedback de todos los usuarios (solo devs)
 */
router.get('/feedback', requireAuth, requireDev, async (req, res) => {
  try {
    const feedback = await prisma.completionFeedback.findMany({
      take: 100, // Limitar a los últimos 100
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    const formattedFeedback = feedback.map((item) => ({
      id: item.id,
      userId: item.userId,
      userEmail: item.user.email,
      userName: item.user.name,
      instanceDate: item.instanceDate,
      completedAt: item.completedAt.toISOString(),
      feeling: item.feeling,
      focus: item.focus,
      interrupted: item.interrupted,
      interruptionReason: item.interruptionReason,
      timeDelta: item.timeDelta,
      note: item.note,
      taskId: item.taskId,
      blockId: item.blockId,
    }));

    res.json({ feedback: formattedFeedback });
  } catch (error) {
    console.error('[dev/feedback] Error:', error);
    res.status(500).json({
      error: 'Error al obtener feedback',
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

export default router;

