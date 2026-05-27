import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/api-auth'

// ── POST /api/staff/invite ─────────────────────────────────────────────────
// Body: { email: string, name?: string, role?: 'staff' | 'manager' }
export async function POST(req: NextRequest) {
  try {
    const { clinicId } = await getAuthContext(req)

    const body = await req.json() as { email?: string; name?: string; role?: string }
    const email = body.email?.trim().toLowerCase()
    const name  = body.name?.trim() || email?.split('@')[0] || 'Colaborador'
    const role  = body.role === 'manager' ? 'manager' : 'staff'

    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

    // Check if already invited and active
    const { data: existing } = await supabaseAdmin
      .from('staff_members')
      .select('id, active')
      .eq('clinic_id', clinicId)
      .eq('email', email)
      .maybeSingle()

    if (existing?.active) {
      return NextResponse.json({ error: 'Este email ya fue invitado.' }, { status: 409 })
    }

    if (existing && !existing.active) {
      // Re-activate previously removed member
      await supabaseAdmin.from('staff_members')
        .update({ active: true, name, role, invited_at: new Date().toISOString(), accepted_at: null })
        .eq('id', existing.id)
    } else {
      // New staff member
      const { error: insertError } = await supabaseAdmin
        .from('staff_members')
        .insert({ clinic_id: clinicId, name, email, role })
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Send invite email — if user already exists this returns an error we can ignore
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vetplace.vercel.app'
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/`,
      data: { staff_role: role, invited_to_clinic: clinicId },
    })

    if (inviteError) {
      const msg = inviteError.message.toLowerCase()
      const alreadyExists = msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')
      if (!alreadyExists) {
        // Non-critical: staff member row was created, just the email failed
        return NextResponse.json({
          ok: true,
          warning: `Fila creada pero no se pudo enviar el email: ${inviteError.message}. El colaborador puede acceder con su cuenta existente.`,
        })
      }
      // User already has an account — they can just log in, no invite email needed
      return NextResponse.json({
        ok: true,
        message: `${email} ya tiene cuenta. Ya puede iniciar sesión y verá la vista de colaborador.`,
      })
    }

    return NextResponse.json({ ok: true, message: `Invitación enviada a ${email}` })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 401 })
  }
}
