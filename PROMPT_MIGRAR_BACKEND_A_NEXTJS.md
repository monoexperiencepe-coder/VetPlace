# Migración: Backend Express → Next.js API Routes

## Contexto

VetPlace tiene dos proyectos separados:
- `web/` → Next.js (frontend, en Vercel)
- `src/` → Express.js (backend, **solo corre en local**)

El objetivo de esta tarea es **eliminar el backend Express** migrando todas sus rutas a
Next.js API Route Handlers dentro de `web/app/api/`. Al terminar, `src/` queda obsoleto
y el proyecto completo corre en un solo Vercel deploy, sin Railway ni Render.

---

## Paso 1 — Crear utilidades compartidas en `web/lib/`

### `web/lib/supabase-admin.ts`
Cliente de Supabase con service_role (para uso exclusivo en los route handlers del servidor):

```ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
```

### `web/lib/api-auth.ts`
Reemplaza al `authMiddleware` de Express. Extrae el JWT del header y devuelve `{ userId, clinicId }` o lanza error:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

export interface AuthContext {
  userId: string
  clinicId: string
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!token) {
    // Fallback dev: usa DEFAULT_CLINIC_ID del env
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
```

### `web/lib/api-response.ts`
Helpers para respuestas y manejo de errores consistente con el formato `{ ok, data/error }`:

```ts
import { NextResponse } from 'next/server'

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function err(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export function handleRouteError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('Token inválido') || msg.includes('No token')) return err(msg, 401)
  if (msg.includes('not found') || msg.includes('no encontrad')) return err(msg, 404)
  if (msg.includes('required') || msg.includes('must be'))       return err(msg, 400)
  if (msg.includes('Duplicate'))                                  return err(msg, 409)
  console.error('[API Error]', msg)
  return err(msg, 500)
}
```

### `web/lib/date-utils.ts`
Copiar exactamente el contenido de `src/utils/dateUtils.ts`.

### `web/lib/services/` (directorio)
Copiar los siguientes archivos **sin cambios** desde `src/services/` hacia `web/lib/services/`:
- `petService.ts`
- `eventService.ts`
- `bookingService.ts`
- `notificationService.ts`

Ajustar sus imports internos:
- `../config/supabase` → `@/lib/supabase-admin` (y usar `supabaseAdmin`)
- `../utils/errors` → `@/lib/api-response` o crear `web/lib/errors.ts` copiando `src/utils/errors.ts`
- `../utils/dateUtils` → `@/lib/date-utils`

---

## Paso 2 — Crear todos los Route Handlers

Cada archivo de ruta en Next.js App Router exporta funciones `GET`, `POST`, `PATCH`, etc.
**Patrón de conversión Express → Next.js:**

| Express                        | Next.js Route Handler                                  |
|--------------------------------|--------------------------------------------------------|
| `req.body`                     | `await request.json()`                                 |
| `req.query.x`                  | `new URL(request.url).searchParams.get('x')`           |
| `req.params.id`                | segundo argumento: `{ params }: { params: { id: string } }` |
| `req.headers.authorization`    | `request.headers.get('authorization')`                 |
| `res.json({ ok, data })`       | `return ok(data)`                                      |
| `res.status(201).json({...})`  | `return ok(data, 201)`                                 |
| `next(err)`                    | `return handleRouteError(err)` en el catch             |
| `getClinicId(req)`             | `const { clinicId } = await getAuthContext(request)`   |

---

### `web/app/api/stats/route.ts`
```
GET /api/stats
```
Portar exactamente la lógica de `src/routes/stats.router.ts`.
- Importar `supabaseAdmin` de `@/lib/supabase-admin`
- Importar `getAuthContext` de `@/lib/api-auth`
- Importar `ok`, `handleRouteError` de `@/lib/api-response`
- Importar `todayUTC`, `addDays` de `@/lib/date-utils`
- Las funciones helper `getMondayOfWeek`, `getMonthStart`, `subMonth` van dentro del mismo archivo

---

### `web/app/api/users/route.ts`
```
POST /api/users   → crear cliente
```
Portar desde `src/routes/users.router.ts` → handler `router.post('/')`.

### `web/app/api/users/recent/route.ts`
```
GET /api/users/recent
```

### `web/app/api/users/search/route.ts`
```
GET /api/users/search?q=...
```

### `web/app/api/users/[id]/route.ts`
```
GET /api/users/:id
```
Segundo argumento: `{ params }: { params: { id: string } }`

### `web/app/api/users/phone/[phone]/route.ts`
```
GET /api/users/phone/:phone
```
Segundo argumento: `{ params }: { params: { phone: string } }`

---

### `web/app/api/pets/route.ts`
```
POST /api/pets   → crear mascota
```

### `web/app/api/pets/search/route.ts`
```
GET /api/pets/search?q=...
```

### `web/app/api/pets/user/[userId]/route.ts`
```
GET /api/pets/user/:userId
```

### `web/app/api/pets/[id]/route.ts`
```
GET /api/pets/:id
```

### `web/app/api/pets/[id]/grooming-completed/route.ts`
```
PATCH /api/pets/:id/grooming-completed
```

---

### `web/app/api/bookings/route.ts`
```
GET  /api/bookings?date=YYYY-MM-DD
POST /api/bookings
```

### `web/app/api/bookings/today/route.ts`
```
GET /api/bookings/today
```
Lógica: query a `bookings` con join a `pets` y `clients`, filtrado por `date = today` y status in `['PENDING','CONFIRMED']`.

### `web/app/api/bookings/slot-available/route.ts`
```
GET /api/bookings/slot-available?date=...&time=...
```

### `web/app/api/bookings/pet/[petId]/route.ts`
```
GET /api/bookings/pet/:petId
```

### `web/app/api/bookings/[id]/route.ts`
```
GET /api/bookings/:id
```

### `web/app/api/bookings/[id]/confirm/route.ts`
```
PATCH /api/bookings/:id/confirm
```

### `web/app/api/bookings/[id]/cancel/route.ts`
```
PATCH /api/bookings/:id/cancel
```

### `web/app/api/bookings/[id]/complete/route.ts`
```
PATCH /api/bookings/:id/complete
```

---

### `web/app/api/events/route.ts`
```
GET  /api/events  (con query params: pet_id, status, type, from, to)
POST /api/events
```

### `web/app/api/events/overdue/route.ts`
```
GET /api/events/overdue
```

### `web/app/api/events/pet/[petId]/route.ts`
```
GET /api/events/pet/:petId
```

### `web/app/api/events/[id]/route.ts`
```
GET /api/events/:id
```

### `web/app/api/events/[id]/notify/route.ts`
```
POST /api/events/:id/notify
```
Actualiza `status = 'NOTIFIED'` y `notified_at`. WhatsApp se integrará después.

### `web/app/api/events/[id]/complete/route.ts`
```
PATCH /api/events/:id/complete
```

### `web/app/api/events/[id]/cancel/route.ts`
```
PATCH /api/events/:id/cancel
```

---

### `web/app/api/clinics/setup/route.ts`
```
POST /api/clinics/setup
```
Importante: usa `userId` del `AuthContext` (no `clinicId`). Consultar `authUser.id`.
En `getAuthContext` también devolver `userId`. Si ya tiene clínica devuelve la existente.

### `web/app/api/clinics/me/route.ts`
```
GET   /api/clinics/me
PATCH /api/clinics/me
```

---

### `web/app/api/conversations/route.ts`
```
GET  /api/conversations
POST /api/conversations
```

### `web/app/api/conversations/[id]/bot/route.ts`
```
PATCH /api/conversations/:id/bot
```

### `web/app/api/conversations/[id]/read/route.ts`
```
PATCH /api/conversations/:id/read
```

---

### `web/app/api/messages/[conversationId]/route.ts`
```
GET  /api/messages/:conversationId   (con query params limit, offset)
POST /api/messages/:conversationId
```

---

### `web/app/api/cron/check-events/route.ts`
Reemplaza al scheduler de Express. Contiene la lógica de `src/jobs/checkUpcomingEvents.job.ts`:

```ts
import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api-response'
// importar los services necesarios desde @/lib/services/...

export async function GET(request: NextRequest) {
  // Verificar que viene de Vercel Cron (header de seguridad)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return err('Unauthorized', 401)
  }

  try {
    // Copiar lógica de runCheckUpcomingEventsJob()
    // phase1_generateGroomingEvents
    // phase2_sendReminders (dejar vacío por ahora hasta integrar WhatsApp)
    return ok({ message: 'Job ejecutado' })
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Error en cron', 500)
  }
}
```

---

## Paso 3 — Configurar `vercel.json`

Crear o actualizar `web/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-events",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Esto ejecuta el job todos los días a las 8am UTC. Vercel lo llama con el header
`Authorization: Bearer <CRON_SECRET>` automáticamente.

---

## Paso 4 — Variables de entorno

### `web/.env.local` — agregar estas variables nuevas:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (la service_role key, NO la anon key)
DEFAULT_CLINIC_ID=                (opcional, para desarrollo local sin auth)
CRON_SECRET=un_string_secreto_aleatorio
```

Las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` ya existen,
mantenelas. `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son **solo para el servidor**
(sin prefijo `NEXT_PUBLIC_`), nunca llegan al navegador.

### En Vercel dashboard (Settings → Environment Variables):
Agregar las mismas 4 variables nuevas.

---

## Paso 5 — Actualizar `web/lib/api.ts`

Cambiar la línea del `BASE` URL para que use rutas relativas (mismo dominio):

```ts
// ANTES:
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000'

// DESPUÉS:
const BASE = ''
```

Y simplificar `getToken` — como el frontend y la API están en el mismo dominio de Vercel,
las cookies de Supabase se comparten, pero igual mandamos el token en el header por
consistencia. No hay ningún otro cambio necesario en `api.ts`.

---

## Paso 6 — Eliminar dependencias de Express del frontend

En `web/app/bookings/page.tsx`, `web/app/page.tsx` y cualquier otro archivo que use
`authFetch` directo con la URL del backend: cambiar `${BASE}${path}` a solo `${path}`
(o simplemente usar los métodos de `api.*` que ya tienen el token y la URL correcta).

---

## Paso 7 — Verificación

Una vez completado, verificar que:

1. `GET /api/stats` devuelve `{ ok: true, data: { clients_total, ... } }`
2. `GET /api/bookings/today` devuelve array de citas
3. `GET /api/users/recent` devuelve últimos 10 clientes
4. `POST /api/bookings` con `{ pet_id, date, time }` crea una cita y devuelve `201`
5. El frontend funciona sin errores de red (no más `http://127.0.0.1:3000` en ningún lado)

---

## Notas importantes

- **No borrar** la carpeta `src/` hasta verificar que todo funciona. Puede servir de referencia.
- Los route handlers de Next.js con `export const dynamic = 'force-dynamic'` evitan caching
  en endpoints que leen datos en tiempo real. Agregarlo en stats, bookings/today, y eventos.
- En Next.js App Router, las rutas con segmentos dinámicos **más específicos deben ir primero**
  en el orden de resolución. Ejemplo: `/bookings/today` resuelve antes de `/bookings/[id]`
  porque son archivos separados en carpetas separadas — Next.js lo maneja automáticamente.
- El parámetro `params` en los route handlers es ahora una **Promise** en Next.js 15.
  Usar: `const { id } = await params` en lugar de `params.id` directamente.
