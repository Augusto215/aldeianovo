import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export type Role = 'ADMIN' | 'COORDENACAO' | 'FINANCEIRO' | 'LEITURA';

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: Role;
}

/** Middleware que exige um Bearer token JWT válido. */
export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não informado' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.jwtSecret) as {
      sub: string;
      role: Role;
    };
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/** Restringe a rota aos perfis informados (controle de permissões). */
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res
        .status(403)
        .json({ error: 'Sem permissão para esta operação' });
    }
    next();
  };
}

/** Perfis que podem criar/editar dados financeiros. */
export const CAN_WRITE: Role[] = ['ADMIN', 'COORDENACAO', 'FINANCEIRO'];
