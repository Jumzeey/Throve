import type { Response } from 'express';

export function sendError(res: Response, status: number, message: string, code = 'ERROR') {
  return res.status(status).json({ message, code });
}

export function handleSupabaseError(res: Response, error: { message: string; code?: string }, fallback = 'Database error') {
  return sendError(res, 400, error.message || fallback, error.code ?? 'DB_ERROR');
}
