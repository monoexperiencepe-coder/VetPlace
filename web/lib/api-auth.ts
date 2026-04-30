import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

export interface AuthContext {
  userId: string
  clinicId: string
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!token) {
    const fallback = process.env.DEFAULT_CLINIC_ID
    if (!fallback) throw new Error('No token and no DEFAULT_CLINIC_ID')
    return { userId: 'dev', clinicId: fallback }
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Token inválido o expirado')

  const clinicId = (user.user_metadata?.clinic_id as string | undefined)
    ?? process.env.DEFAULT_CLINIC_ID
  if (!clinicId) throw new Error('clinic_id no encontrado en el JWT')

  return { userId: user.id, clinicId }
}
