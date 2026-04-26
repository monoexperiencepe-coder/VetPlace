import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      code: err.code,
      message: err.message,
    })
    return
  }

  console.error('[Unhandled error]', err)
  res.status(500).json({
    ok: false,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  })
}
