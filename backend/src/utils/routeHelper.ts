import { RequestHandler } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';

export const authHandler = (
  fn: (req: AuthRequest, res: Response) => Promise<void | Response>
): RequestHandler => fn as unknown as RequestHandler;
