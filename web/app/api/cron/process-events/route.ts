import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api-response'
import { processUnhandledEvents } from '@/lib/automation-engine'

/**
 * GET /api/cron/process-events
 *
 * Drena la cola domain_events y ejecuta las automations que correspondan.
 * Debe llamarse desde Vercel Cron (o equivalente) con el header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Frecuencia recomendada: cada 5 minutos.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return err('Unauthorized', 401)
  }

  try {
    const result = await processUnhandledEvents()
    return ok({
      message: 'Automation engine ejecutado',
      ...result,
    })
  } catch (e) {
    console.error('[Cron process-events] Fatal error:', e)
    return err(e instanceof Error ? e.message : 'Error en automation engine', 500)
  }
}
