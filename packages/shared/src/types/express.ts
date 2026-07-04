import { TFunction } from 'i18next';

declare global {
  namespace Express {
    interface Request {
      t: TFunction;  // Rende t disponibile su tutte le Request
      userId?: string;
      userRole?: string;
      impersonatedBy?: string;  // set when the JWT is an admin-impersonation token
    }
  }
}

export {};
