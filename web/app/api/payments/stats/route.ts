import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const now        = new Date()
    const today      = now.toISOString().slice(0, 10)
    const dow        = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart  = new Date(now); weekStart.setDate(now.getDate() - dow)
    const weekStr    = weekStart.toISOString().slice(0, 10)
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    // Last month
    const lastMonth  = now.getMonth() === 0
      ? `${now.getFullYear() - 1}-12-01`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-01`

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('amount, method, date, description')
      .eq('clinic_id', clinicId)
      .gte('date', lastMonth)

    if (error) handleSupabaseError(error)
    const rows = (data ?? []) as { amount: number; method: string; date: string; description: string | null }[]

    const sum   = (f: (r: typeof rows[0]) => boolean) => rows.filter(f).reduce((a, r) => a + Number(r.amount), 0)
    const count = (f: (r: typeof rows[0]) => boolean) => rows.filter(f).length

    const thisMonthRows = rows.filter(r => r.date >= monthStart)
    const todayRows     = rows.filter(r => r.date === today)

    // Daily chart for current month (last 30 days)
    const dailyMap: Record<string, number> = {}
    thisMonthRows.forEach(r => { dailyMap[r.date] = (dailyMap[r.date] ?? 0) + Number(r.amount) })

    // Fill in all days of the month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daily: { date: string; total: number }[] = []
    for (let d = 1; d <= Math.min(daysInMonth, now.getDate()); d++) {
      const ds = `${monthStart.slice(0, 7)}-${String(d).padStart(2, '0')}`
      daily.push({ date: ds, total: dailyMap[ds] ?? 0 })
    }

    // By method (today)
    const methods = ['cash', 'transfer', 'card', 'yape', 'other']
    const byMethod: Record<string, number> = {}
    for (const m of methods)
      byMethod[m] = todayRows.filter(r => r.method === m).reduce((a, r) => a + Number(r.amount), 0)

    // By service description (this month, top 5)
    const descMap: Record<string, { total: number; count: number }> = {}
    thisMonthRows.forEach(r => {
      const key = r.description ?? 'Sin descripcion'
      if (!descMap[key]) descMap[key] = { total: 0, count: 0 }
      descMap[key].total += Number(r.amount)
      descMap[key].count += 1
    })
    const byService = Object.entries(descMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)

    // Last month total (for comparison)
    const lastMonthTotal = rows
      .filter(r => r.date >= lastMonth && r.date < monthStart)
      .reduce((a, r) => a + Number(r.amount), 0)

    return ok({
      today:          { total: sum(r => r.date === today),     count: count(r => r.date === today) },
      week:           { total: sum(r => r.date >= weekStr),    count: count(r => r.date >= weekStr) },
      month:          { total: sum(r => r.date >= monthStart), count: count(r => r.date >= monthStart) },
      last_month:     { total: lastMonthTotal },
      by_method:      byMethod,
      daily_chart:    daily,
      by_service:     byService,
    })
  } catch (e) { return handleRouteError(e) }
}
