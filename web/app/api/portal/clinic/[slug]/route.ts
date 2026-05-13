// GET /api/portal/clinic/[slug]
// Info pública de la clínica para mostrar en el login del portal
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, handleRouteError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { data, error } = await supabaseAdmin
      .from('clinics')
      .select('id, name, slug, phone, settings')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !data) return Response.json({ error: 'Clínica no encontrada' }, { status: 404 })

    // Solo exponer lo necesario (no datos internos)
    const clinic = data as typeof data & { settings?: { logo_url?: string } }
    return ok({
      id:       clinic.id,
      name:     clinic.name,
      slug:     clinic.slug,
      phone:    clinic.phone,
      logo_url: clinic.settings?.logo_url ?? null,
    })
  } catch (e) {
    return handleRouteError(e)
  }
}
