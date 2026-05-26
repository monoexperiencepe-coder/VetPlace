/** Standard API success response */
export function ok<T>(data: T): Response {
  return Response.json({ ok: true, data })
}

/** Standard API error response */
export function err(message: string, status = 400): Response {
  return Response.json({ ok: false, error: message }, { status })
}

/** Catch-all error handler for API routes */
export function handleRouteError(e: unknown): Response {
  console.error('[API Error]', e)
  const message = e instanceof Error ? e.message : 'Error interno del servidor'
  return Response.json({ ok: false, error: message }, { status: 500 })
}
