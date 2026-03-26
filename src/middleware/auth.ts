import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; role: 'admin' | 'student'; matricNumber?: string };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  authMiddleware(req, res, () => {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access only' });
    next();
  });
};

export const studentMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  authMiddleware(req, res, () => {
    if (req.user?.role !== 'student' && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Student access required' });
    }
    next();
  });
};
