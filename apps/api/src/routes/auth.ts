import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions, JwtPayload } from 'jsonwebtoken';

const router = Router();

// tipar explícitamente para jsonwebtoken v9
const JWT_SECRET: Secret = (process.env.JWT_SECRET ?? 'dev_secret_cambialo') as Secret;
const EXPIRES_IN: SignOptions['expiresIn'] =
  ((process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '7d');

// ---------- Middleware ----------
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { sub?: string };
    if (!decoded?.sub) return res.status(401).json({ error: 'Token inválido' });
    (req as any).userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ---------- Schemas ----------
const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ---------- Rutas ----------
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true, preferences: true, isDev: true },
    });
    const onboarding = await (prisma as any).onboardingState.findUnique({ where: { userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user: { ...user, hasCompletedOnboarding: Boolean(onboarding?.completed) } });
  } catch (error) {
    console.error('[auth GET /me] Error:', error);
    res.status(500).json({ 
      error: 'Error al obtener información del usuario',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

router.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, name, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Email ya registrado' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: EXPIRES_IN });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: EXPIRES_IN });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

export default router;
