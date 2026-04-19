import { Request, Response, NextFunction } from 'express';
import { i18n } from '../i18n';

export function requireCronAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token !== process.env.CRON_SECRET) {
    res.status(401).json({ error: i18n.t('Unauthorized') });
    return;
  }
  next();
}
