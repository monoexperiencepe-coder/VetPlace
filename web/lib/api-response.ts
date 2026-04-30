import { NextResponse } from 'next/server'

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function err(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export function handleRouteError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('Token inválido') || msg.includes('No token')) return err(msg, 401)
  if (msg.includes('not found') || msg.includes('no encontrad'))  return err(msg, 404)
  if (msg.includes('required') || msg.includes('must be'))        return err(msg, 400)
  if (msg.includes('Duplicate'))                                   return err(msg, 409)
  console.error('[API Error]', msg)
  return err(msg, 500)
}
