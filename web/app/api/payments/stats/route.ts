import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'
import { ok, handleRouteError } from '@/lib/api-response'
import { handleSupabaseError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// GET /api/payments/stats
// Returns totals for today, this week, this month + breakdown by method
export async function GET(request: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(request)
    const now   = new Date()
    const today = now.toISOString().slice(0, 10)

    // Start of week (Monday)
    const dow       = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dow)
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    // Start of month
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('amount, method, date')
      .eq('clinic_id', clinicId)
      .gte('date', monthStart)

    if (error) handleSupabaseError(error)

    const rows = data ?? []

    const sum = (filter: (r: { amount: number; date: string }) => boolean) =>
      rows.filter(filter).reduce((acc, r) => acc + Number(r.amount), 0)

    const count = (filter: (r: { amount: number; date: string }) => boolean) =>
      rows.filter(filter).length

    // Method breakdown for today
    const methods = ['cash', 'transfer', 'card', 'yape', 'other']
    const todayRows = rows.filter(r => r.date === today)
    const byMethod: Record<string, number> = {}
    for (const m of methods) {
      byMethod[m] = todayRows
        .filter(r => r.method === m)
        .reduce((acc, r) => acc + Number(r.amount), 0)
    }

    return ok({
      today:      { total: sum(r => r.date === today),      count: count(r => r.date === today) },
      week:       { total: sum(r => r.date >= weekStartStr), count: count(r => r.date >= weekStartStr) },
      month:      { total: sum(() => true),                  count: rows.length },
      by_method:  byMethod,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
