import { Request } from 'express';
import { TFunction } from 'i18next';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  t: TFunction;
}
