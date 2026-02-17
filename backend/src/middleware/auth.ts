import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, config.env.JWT_SECRET!, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireOperator = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin' && req.userRole !== 'operator') {
    return res.status(403).json({ error: 'Operator access required' });
  }
  next();
};

// export const userCanSetRole = (userRole: string, role: string) => {
//   let result = false;
//   switch (userRole) {
//     case 'admin':
//       result = true;
//       break;
//     case 'operator':
//       result = (role === 'operator' || role === 'user');
//       break;
//     case 'user':
//       result = (role === 'user');
//       break;
//   }
//   return result;
// };

export const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, config.env.JWT_SECRET!, { expiresIn: '24h' });
};
