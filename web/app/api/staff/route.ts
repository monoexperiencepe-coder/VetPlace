import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'

// ── GET /api/staff — list staff members for the clinic ─────────────────────
export async function GET(req: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(req)
    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .select('id, name, email, role, invited_at, accepted_at, active')
      .eq('clinic_id', clinicId)
      .eq('active', true)
      .order('invited_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 401 })
  }
}

// ── DELETE /api/staff?id=xxx — deactivate a staff member ───────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(req)
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('staff_members')
      .update({ active: false })
      .eq('id', id)
      .eq('clinic_id', clinicId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 401 })
  }
}
