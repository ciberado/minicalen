import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import { auth } from './index';

export interface AuthSocket extends Socket {
  user?: {
    id: string;
    email: string;
    name?: string;
    emailVerified: boolean;
  };
  session?: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    emailVerified: boolean;
  };
  session?: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies?.['minicalen.session_token'];

    if (token) {
      const session = await auth.api.getSession({ headers: req.headers });
      
      if (session) {
        req.user = session.user;
        req.session = session.session;
      }
    }
    
    next();
  } catch (error) {
    // Log error but don't block request for optional auth
    console.error('Optional auth error:', error);
    next();
  }
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.cookies?.['minicalen.session_token'];

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    req.user = session.user;
    req.session = session.session;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export function optionalAuthSocket(
  socket: AuthSocket,
  next: (err?: Error) => void
): void {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.substring(7);

    if (token) {
      auth.api
        .getSession({ headers: { cookie: `minicalen.session_token=${token}` } })
        .then((session) => {
          if (session) {
            socket.user = session.user;
            socket.session = session.session;
          }
          next();
        })
        .catch((error) => {
          console.error('Socket auth error:', error);
          next();
        });
    } else {
      next();
    }
  } catch (error) {
    console.error('Socket auth middleware error:', error);
    next();
  }
}
