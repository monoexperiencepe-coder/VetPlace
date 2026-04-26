import { Router, Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'
import { handleSupabaseError } from '../utils/errors'
import { getClinicId } from '../config/clinic'
import { todayUTC, addDays } from '../utils/dateUtils'

const router = Router()

// GET /api/stats
// Métricas rápidas para el dashboard
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clinicId = getClinicId()
    const today    = todayUTC()
    const in7Days  = addDays(today, 7)

    const [bookingsToday, eventsPending, eventsUpcoming, totalClients] = await Promise.all([
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('date', today)
        .in('status', ['PENDING', 'CONFIRMED']),

      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .in('status', ['PENDING', 'NOTIFIED']),

      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('status', 'PENDING')
        .gte('scheduled_date', today)
        .lte('scheduled_date', in7Days),

      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId),
    ])

    if (bookingsToday.error) handleSupabaseError(bookingsToday.error)
    if (eventsPending.error) handleSupabaseError(eventsPending.error)
    if (eventsUpcoming.error) handleSupabaseError(eventsUpcoming.error)
    if (totalClients.error) handleSupabaseError(totalClients.error)

    res.json({
      ok: true,
      data: {
        bookings_today:     bookingsToday.count  ?? 0,
        events_pending:     eventsPending.count  ?? 0,
        events_upcoming_7d: eventsUpcoming.count ?? 0,
        total_clients:      totalClients.count   ?? 0,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
