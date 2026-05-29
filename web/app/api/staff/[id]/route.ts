import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// ── PATCH /api/staff/[id] — update name, role, color ──────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { clinicId } = await getAuthContext(req)
    const body = await req.json()
    const { name, role, color, active } = body

    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .update({ name, role, color, active, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 401 })
  }
}

// ── DELETE /api/staff/[id] — deactivate ───────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { clinicId } = await getAuthContext(req)

    const { error } = await supabaseAdmin
      .from('staff_members')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('clinic_id', clinicId)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data: null })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 401 })
  }
}
