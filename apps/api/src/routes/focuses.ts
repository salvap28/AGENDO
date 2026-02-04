import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const FocusCreateSchema = z.object({
  name: z.string().min(1).max(50),
  emoji: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
});

const FocusUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  emoji: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
  isHidden: z.boolean().optional(),
});

// Focos predefinidos del sistema
const SYSTEM_FOCUSES = [
  { name: 'Estudio', emoji: null, color: '#7B6CFF' },
  { name: 'Trabajo', emoji: null, color: '#56E1E9' },
  { name: 'Salud', emoji: null, color: '#FF6B9D' },
  { name: 'Descanso', emoji: null, color: '#9B59B6' },
  { name: 'Creatividad', emoji: null, color: '#F39C12' },
  { name: 'Proyecto', emoji: null, color: '#3498DB' },
  { name: 'Orden', emoji: null, color: '#2ECC71' },
  { name: 'Social', emoji: null, color: '#E74C3C' },
];

// Inicializar focos predefinidos para un usuario si no existen
async function ensureSystemFocuses(userId: string) {
  const existingSystemFocuses = await prisma.focus.findMany({
    where: { userId, isSystem: true },
  });

  const existingNames = new Set(existingSystemFocuses.map((f) => f.name));

  // Actualizar focos existentes para quitar emojis
  for (const existing of existingSystemFocuses) {
    if (existing.emoji) {
      await prisma.focus.update({
        where: { id: existing.id },
        data: { emoji: null },
      });
    }
  }

  // Crear focos faltantes
  for (const focus of SYSTEM_FOCUSES) {
    if (!existingNames.has(focus.name)) {
      await prisma.focus.create({
        data: {
          userId,
          name: focus.name,
          emoji: focus.emoji,
          color: focus.color,
          isSystem: true,
          isHidden: false,
        },
      });
    }
  }
}

// GET /api/focuses - Obtener todos los focos del usuario (predefinidos + personalizados)
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;

    // Asegurar que los focos predefinidos existan
    await ensureSystemFocuses(userId);

    const focuses = await prisma.focus.findMany({
      where: { userId, isHidden: false },
      orderBy: [
        { isSystem: 'desc' }, // Primero los del sistema
        { createdAt: 'asc' },
      ],
    });

    res.json({ focuses });
  } catch (error) {
    console.error('[focuses GET] Error:', error);
    res.status(500).json({ 
      error: 'Error al obtener focos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// POST /api/focuses - Crear un nuevo foco personalizado
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const parsed = FocusCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    // Verificar que no exista un foco con el mismo nombre (no oculto)
    const existing = await prisma.focus.findFirst({
      where: {
        userId,
        name: parsed.data.name,
        isHidden: false,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya existe un foco con ese nombre' });
    }

    const focus = await prisma.focus.create({
      data: {
        userId,
        name: parsed.data.name,
        emoji: parsed.data.emoji,
        color: parsed.data.color,
        isSystem: false,
        isHidden: false,
      },
    });

    res.json({ focus });
  } catch (error) {
    console.error('[focuses POST] Error:', error);
    res.status(500).json({ 
      error: 'Error al crear el foco',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// PUT /api/focuses/:id - Actualizar un foco
router.put('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const focusId = req.params.id;
  const parsed = FocusUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Verificar que el foco pertenece al usuario
  const existing = await prisma.focus.findFirst({
    where: { id: focusId, userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Foco no encontrado' });
  }

  // Si se está renombrando, verificar que no haya otro foco con el mismo nombre
  if (parsed.data.name && parsed.data.name !== existing.name) {
    const duplicate = await prisma.focus.findFirst({
      where: {
        userId,
        name: parsed.data.name,
        isHidden: false,
        id: { not: focusId },
      },
    });

    if (duplicate) {
      return res.status(400).json({ error: 'Ya existe un foco con ese nombre' });
    }
  }

  const focus = await prisma.focus.update({
    where: { id: focusId },
    data: parsed.data,
  });

  res.json({ focus });
});

// DELETE /api/focuses/:id - Eliminar un foco personalizado
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const focusId = req.params.id;

  const existing = await prisma.focus.findFirst({
    where: { id: focusId, userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Foco no encontrado' });
  }

  if (existing.isSystem) {
    return res.status(400).json({ error: 'No se pueden eliminar focos predefinidos' });
  }

  await prisma.focus.delete({
    where: { id: focusId },
  });

  res.json({ success: true });
});

// GET /api/focuses/manage - Obtener todos los focos (incluyendo ocultos) para gestión
router.get('/manage', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  // Asegurar que los focos predefinidos existan
  await ensureSystemFocuses(userId);

  const focuses = await prisma.focus.findMany({
    where: { userId },
    orderBy: [
      { isSystem: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  res.json({ focuses });
});

export default router;

