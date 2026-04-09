import { /*Request,*/ Response, NextFunction } from 'express';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { AuthRequest } from '../shared/types/auth';
import config from '../config';


export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: req.t('No authentication found'), reason: req.t('Access token required') });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: req.t('Authentication expired'), reason: req.t('Invalid or expired token') });
    }
    // decoded can be string | JwtPayload
    if (!decoded || typeof decoded === 'string') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    // req.userId = decoded.userId;
    // req.userRole = decoded.role;
    req.userId = (decoded as JwtPayload & { userId: string; role: string }).userId;
    req.userRole = (decoded as JwtPayload & { userId: string; role: string }).role;
    next();
  });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: req.t('Admin role required') });
  }
  next();
};

export const requireOperator = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin' && req.userRole !== 'operator') {
    return res.status(403).json({ error: req.t('Operator role required') });
  }
  next();
};

export const generateToken = (userId: string, role: string): string => {
  const payload = { userId, role };
  const options: SignOptions = {
    expiresIn: config.auth.tokenExpirationDays + 'd' as jwt.SignOptions['expiresIn'],
  };
  // process.env.JWT_SECRET is non-null here (runtime check already)
  return jwt.sign(payload, process.env.JWT_SECRET as jwt.Secret, options);
};
