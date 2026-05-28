// GET /api/finance/summary
// Returns owner-level financial data: monthly revenue, trends, top services, top clients, inactive clients
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
}
function startOfLastMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString()
}
function endOfLastMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59).toISOString()
}
function monthsAgo(n: number, date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - n, 1).toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return Response.json({ ok: false, error: 'No auth' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    // Get clinic
    const { data: clinic } = await supabaseAdmin
      .from('clinics')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!clinic) return Response.json({ ok: false, error: 'Clinic not found' }, { status: 404 })
    const cid = clinic.id

    const now = new Date()
    const thisMonthStart  = startOfMonth(now)
    const lastMonthStart  = startOfLastMonth(now)
    const lastMonthEnd    = endOfLastMonth(now)
    const sixMonthsAgo    = monthsAgo(5, now)

    // ── 1. Payments this month ──────────────────────────────────────────────
    const { data: paymentsThisMonth } = await supabaseAdmin
      .from('payments')
      .select('amount, date')
      .eq('clinic_id', cid)
      .gte('date', thisMonthStart)

    const revenueThisMonth = (paymentsThisMonth ?? []).reduce((s, p) => s + (Number(p.amount) || 0), 0)

    // ── 2. Payments last month ──────────────────────────────────────────────
    const { data: paymentsLastMonth } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('clinic_id', cid)
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd)

    const revenueLastMonth = (paymentsLastMonth ?? []).reduce((s, p) => s + (Number(p.amount) || 0), 0)

    // ── 3. Monthly revenue for past 6 months ───────────────────────────────
    const { data: allPayments6m } = await supabaseAdmin
      .from('payments')
      .select('amount, date')
      .eq('clinic_id', cid)
      .gte('date', sixMonthsAgo)

    // Group by month
    const monthMap: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = 0
    }
    for (const p of allPayments6m ?? []) {
      const key = (p.date as string).slice(0, 7)
      if (monthMap[key] !== undefined) monthMap[key] += Number(p.amount) || 0
    }

    const monthlyRevenue = Object.entries(monthMap).map(([month, revenue]) => {
      const [y, m] = month.split('-').map(Number)
      const label = new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'short' })
      return { month, label, revenue: Math.round(revenue) }
    })

    // ── 4. Pending payments (paid bookings without payment record) ──────────
    const { data: pendingBookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('clinic_id', cid)
      .eq('payment_status', 'pending')
      .in('status', ['confirmed', 'completed'])

    const pendingCount = (pendingBookings ?? []).length

    // ── 5. Top services by payment count + revenue ─────────────────────────
    const { data: paymentsWithBookings } = await supabaseAdmin
      .from('payments')
      .select(`amount, booking:bookings(service_type_id, service_type:service_types(name))`)
      .eq('clinic_id', cid)
      .gte('created_at', thisMonthStart)

    const serviceMap: Record<string, { name: string; revenue: number; count: number }> = {}
    for (const p of paymentsWithBookings ?? []) {
      const bk = p.booking as { service_type?: { name?: string } } | null
      const name = bk?.service_type?.name ?? 'Sin categoría'
      if (!serviceMap[name]) serviceMap[name] = { name, revenue: 0, count: 0 }
      serviceMap[name].revenue += Number(p.amount) || 0
      serviceMap[name].count++
    }
    const topServices = Object.values(serviceMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(s => ({ ...s, revenue: Math.round(s.revenue) }))

    // ── 6. Top clients by total spend ──────────────────────────────────────
    const { data: paymentsWithClients } = await supabaseAdmin
      .from('payments')
      .select('amount, client_id, client:clients(name, phone)')
      .eq('clinic_id', cid)

    const clientMap: Record<string, { id: string; name: string; revenue: number; count: number }> = {}
    for (const p of paymentsWithClients ?? []) {
      const clt = p.client as { name?: string; phone?: string } | null
      const name = clt?.name ?? 'Cliente'
      const id = p.client_id
      if (!id) continue
      if (!clientMap[id]) clientMap[id] = { id, name, revenue: 0, count: 0 }
      clientMap[id].revenue += Number(p.amount) || 0
      clientMap[id].count++
    }
    const topClients = Object.values(clientMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(c => ({ ...c, revenue: Math.round(c.revenue) }))

    // ── 7. Inactive clients (no booking in 60+ days) ───────────────────────
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString()
    const { data: inactiveData } = await supabaseAdmin
      .from('clients')
      .select('id, name, phone, created_at')
      .eq('clinic_id', cid)
      .lt('created_at', sixtyDaysAgo)
      .limit(20)

    // Filter: clients with no booking in last 60 days
    const inactive: { id: string; name: string; phone: string; days_inactive: number }[] = []
    for (const c of inactiveData ?? []) {
      // Find client's pets, then get their latest booking
      const { data: clientPets } = await supabaseAdmin
        .from('pets')
        .select('id')
        .eq('clinic_id', cid)
        .eq('user_id', c.id)

      if (!clientPets || clientPets.length === 0) continue
      const petIds = clientPets.map((p: { id: string }) => p.id)

      const { data: lastBooking } = await supabaseAdmin
        .from('bookings')
        .select('date')
        .eq('clinic_id', cid)
        .in('pet_id', petIds)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!lastBooking) continue  // never booked, skip
      const lastDate = new Date(lastBooking.date)
      const daysInactive = Math.floor((Date.now() - lastDate.getTime()) / 86400000)
      if (daysInactive >= 60) {
        inactive.push({ id: c.id, name: c.name, phone: c.phone, days_inactive: daysInactive })
        if (inactive.length >= 5) break
      }
    }

    // ── 8. Avg ticket ──────────────────────────────────────────────────────
    const totalPaymentsCount = (paymentsThisMonth ?? []).length
    const avgTicket = totalPaymentsCount > 0
      ? Math.round(revenueThisMonth / totalPaymentsCount)
      : 0

    // ── Revenue growth % ──────────────────────────────────────────────────
    const revenueGrowth = revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : null

    return ok({
      revenueThisMonth: Math.round(revenueThisMonth),
      revenueLastMonth: Math.round(revenueLastMonth),
      revenueGrowth,
      avgTicket,
      pendingCount,
      monthlyRevenue,
      topServices,
      topClients,
      inactiveClients: inactive,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
