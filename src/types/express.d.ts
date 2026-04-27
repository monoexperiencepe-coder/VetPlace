import type { User } from '@supabase/supabase-js'

declare global {
  namespace Express {
    interface Request {
      /** Usuario autenticado via Supabase JWT */
      authUser?: User
      /** clinic_id extraído del user_metadata del JWT */
      clinicId?: string
    }
  }
}

export {}
