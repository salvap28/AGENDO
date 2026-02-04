import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev_secret_cambialo';

type TokenPayload = JwtPayload & { sub?: string; id?: string };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    const userId = payload.sub ?? payload.id;
    if (!userId) return res.status(401).json({ error: 'Token inválido o expirado' });
    (req as any).userId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
