import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// ── GET /api/staff — list active staff members for the clinic ──────────────
export async function GET(req: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(req)
    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .select('id, name, email, role, color, active, created_at')
      .eq('clinic_id', clinicId)
      .eq('active', true)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 401 })
  }
}

// ── POST /api/staff — create a new staff member ────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(req)
    const body = await req.json()
    const { name, role, color, email } = body
    if (!name) return NextResponse.json({ ok: false, error: 'name is required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .insert({
        clinic_id: clinicId,
        name,
        role: role ?? 'groomer',
        color: color ?? '#601EF9',
        email: email ?? null,
        active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 401 })
  }
}

// ── DELETE /api/staff?id=xxx — deactivate a staff member ───────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(req)
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('staff_members')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clinic_id', clinicId)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data: null })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 401 })
  }
}
