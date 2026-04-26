import type { PostgrestError } from '@supabase/supabase-js'

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

export function handleSupabaseError(error: PostgrestError): never {
  console.error('[Supabase error]', error)
  if (error.code === '23505') throw new AppError('Duplicate record', 'DUPLICATE', 409)
  if (error.code === '23503') throw new AppError('Referenced record does not exist', 'FK_VIOLATION', 400)
  throw new AppError(error.message, error.code ?? 'DB_ERROR', 500)
}

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
