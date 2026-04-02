import { Request } from 'express';
import { TFunction } from 'i18next';

export type TabValue = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  t: TFunction;
}

export interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
}
