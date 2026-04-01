import { RequestHandler } from 'express';
import { AuthRequest } from '../shared/types/auth';
import { Response } from 'express';

export const authHandler = (
  fn: (req: AuthRequest, res: Response) => Promise<void | Response>
): RequestHandler => fn as unknown as RequestHandler;
