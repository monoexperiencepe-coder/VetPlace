import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { todayUTC, addDays } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getMonthStart(dateStr: string): string {
  return dateStr.slice(0, 7) + '-01'
}

function subMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const today     = todayUTC()
    const yesterday = addDays(today, -1)
    const in7Days   = addDays(today, 7)

    const thisMonday   = getMondayOfWeek(today)
    const lastMonday   = addDays(thisMonday, -7)
    const lastSunday   = addDays(thisMonday, -1)

    const thisMonthStart = getMonthStart(today)
    const lastMonthStart = getMonthStart(subMonth(today))
    const lastMonthEnd   = addDays(thisMonthStart, -1)

    const [
      rBookingsToday,
      rBookingsYesterday,
      rBookingsThisWeek,
      rBookingsLastWeek,
      rBookingsThisMonth,
      rBookingsLastMonth,
      rClientsTotal,
      rClientsThisMonth,
      rClientsLastMonth,
      rPetsTotal,
      rEventsPending,
      rEventsNext7,
      rEventsOverdue,
      rNextBooking,
    ] = await Promise.all([
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId).eq('date', today)
        .in('status', ['PENDING', 'CONFIRMED']),

      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId).eq('date', yesterday)
        .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']),

      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('date', thisMonday).lte('date', today)
        .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']),

      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('date', lastMonday).lte('date', lastSunday)
        .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']),

      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('date', thisMonthStart).lte('date', today)
        .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']),

      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('date', lastMonthStart).lte('date', lastMonthEnd)
        .in('status', ['PENDING', 'CONFIRMED', 'COMPLETED']),

      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId),

      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', thisMonthStart + 'T00:00:00Z'),

      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', lastMonthStart + 'T00:00:00Z')
        .lte('created_at', lastMonthEnd + 'T23:59:59Z'),

      supabaseAdmin.from('pets').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId),

      supabaseAdmin.from('events').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .in('status', ['PENDING', 'NOTIFIED']),

      supabaseAdmin.from('events').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('status', 'PENDING')
        .gte('scheduled_date', today)
        .lte('scheduled_date', in7Days),

      supabaseAdmin.from('events').select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .lt('scheduled_date', today)
        .eq('status', 'PENDING'),

      supabaseAdmin.from('bookings')
        .select('date, time, pet:pets(name)')
        .eq('clinic_id', clinicId)
        .gte('date', today)
        .in('status', ['PENDING', 'CONFIRMED'])
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(1),
    ])

    let nextBooking: { date: string; time: string; pet_name: string } | null = null
    if (rNextBooking.data && rNextBooking.data.length > 0) {
      const nb = rNextBooking.data[0] as {
        date: string
        time: string
        pet: { name: string } | { name: string }[] | null
      }
      const petName = Array.isArray(nb.pet) ? nb.pet[0]?.name : nb.pet?.name
      nextBooking = {
        date:     nb.date,
        time:     nb.time,
        pet_name: petName ?? 'Mascota',
      }
    }

    return ok({
      bookings_today:      rBookingsToday.count      ?? 0,
      bookings_yesterday:  rBookingsYesterday.count  ?? 0,
      bookings_this_week:  rBookingsThisWeek.count   ?? 0,
      bookings_last_week:  rBookingsLastWeek.count   ?? 0,
      bookings_this_month: rBookingsThisMonth.count  ?? 0,
      bookings_last_month: rBookingsLastMonth.count  ?? 0,
      clients_total:       rClientsTotal.count       ?? 0,
      clients_this_month:  rClientsThisMonth.count   ?? 0,
      clients_last_month:  rClientsLastMonth.count   ?? 0,
      pets_total:          rPetsTotal.count          ?? 0,
      events_pending:      rEventsPending.count      ?? 0,
      events_next_7_days:  rEventsNext7.count        ?? 0,
      events_overdue:      rEventsOverdue.count      ?? 0,
      next_booking:        nextBooking,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
