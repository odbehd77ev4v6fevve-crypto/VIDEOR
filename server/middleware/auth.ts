import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthUserPayload {
  _id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return secret;
}

export function signUserToken(user: IUser): string {
  const payload: AuthUserPayload = {
    _id: (user._id as any).toString(),
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '7d',
  });
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    if (authHeader) {
      const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      token = bearerMatch ? bearerMatch[1].trim() : authHeader.trim();
    }
    if (!token && req.cookies && req.cookies.vidora_token) {
      token = req.cookies.vidora_token;
    }
    if (!token && typeof req.headers['x-vidora-token'] === 'string') {
      token = req.headers['x-vidora-token'].trim();
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, getJwtSecret()) as AuthUserPayload;
    const userDoc = await User.findById(decoded._id).select('status role email displayName');

    if (userDoc && userDoc.status !== 'suspended') {
      req.user = {
        _id: (userDoc._id as any).toString(),
        email: userDoc.email,
        displayName: userDoc.displayName,
        role: userDoc.role,
        status: userDoc.status,
      };
    }
    next();
  } catch (err) {
    // Invalid token, continue as unauthenticated
    next();
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await optionalAuth(req, res, () => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required to access this resource.',
        code: 'UNAUTHENTICATED',
      });
      return;
    }

    if (req.user.status === 'suspended') {
      res.status(403).json({
        success: false,
        error: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED',
      });
      return;
    }

    next();
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied: Administrator privileges required.',
        code: 'ADMIN_REQUIRED',
      });
      return;
    }
    next();
  });
}
