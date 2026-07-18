import { Request } from 'express';
//import { TFunction } from 'i18next';

export type TabValue = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

export interface AuthRequest extends Request {
  // Non è necessario ridefinire t, userId, userRole qui
  // perché sono già nella definizione globale di Express.Request
  // Ma se vuoi essere esplicito, va bene lo stesso
}
// export interface AuthRequest extends Request {
//   userId?: string;
//   userRole?: string;
//   //email?: string;
//   t?: TFunction;
// }

export interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
}
