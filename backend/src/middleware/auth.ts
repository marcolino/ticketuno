import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
//import { AuthRequest } from '@ticketuno/shared';
import config from '../config';


export const requireAuthentication = (req: Request, res: Response, next: NextFunction) => {
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
      return res.status(403).json({ error: req.t('Invalid token') });
    }
    req.userId = (decoded as JwtPayload & { userId: string; role: string }).userId;
    req.userRole = (decoded as JwtPayload & { userId: string; role: string }).role;
    req.impersonatedBy = (decoded as JwtPayload & { impersonatedBy?: string }).impersonatedBy;
    next();
  });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: req.t('Admin role required') });
  }
  next();
};

export const requireOperator = (req: Request, res: Response, next: NextFunction) => {
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

/**
 * Mints a short-lived token that lets an admin act as `userId`.
 * The `impersonatedBy` claim records the originating admin so the session is
 * always attributable (surfaced to the UI as a banner) and can never be used
 * to start a further, nested impersonation.
 */
export const generateImpersonationToken = (userId: string, role: string, impersonatedBy: string): string => {
  const payload = { userId, role, impersonatedBy };
  const options: SignOptions = { expiresIn: '2h' };
  return jwt.sign(payload, process.env.JWT_SECRET as jwt.Secret, options);
};
