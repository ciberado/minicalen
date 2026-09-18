import type { NextFunction, Request, Response } from 'express';
import type { Auth } from './index';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function headersFromRequest(req: Request): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
    }
  }

  return headers;
}

export function createAuthMiddleware(auth: Auth) {
  async function resolveUser(req: Request): Promise<AuthUser | undefined> {
    const session = await auth.api.getSession({ headers: headersFromRequest(req) });
    return session?.user ?? undefined;
  }

  const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.user = await resolveUser(req);
    } catch {
      req.user = undefined;
    }

    next();
  };

  const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await resolveUser(req);

      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Authentication failed' });
    }
  };

  return { optionalAuth, requireAuth };
}

export type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;
