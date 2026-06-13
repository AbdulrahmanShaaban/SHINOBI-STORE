import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface DecodedToken {
  userId: string;
  isAdmin: boolean;
}

// Private helper to extract and verify token
// Returns decoded payload or throws if invalid
const verifyToken = (req: AuthRequest): DecodedToken => {
  const token = (req.cookies as any)?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  return jwt.verify(token, JWT_SECRET) as DecodedToken;
};

export const auth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const decoded = verifyToken(req);
    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
  }
};

export const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const decoded = verifyToken(req);
    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin;

    if (!req.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
  }
};

export const generateToken = (userId: string, isAdmin: boolean = false): string => {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '7d' });
};
