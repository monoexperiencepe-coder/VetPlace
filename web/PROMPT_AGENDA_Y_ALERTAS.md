Trabajando en VetPlace SaaS (Next.js + TypeScript + Tailwind en `web/`, backend Express + Supabase en la raíz). Color primario #601EF9. El dashboard está en `web/app/page.tsx`.

Implementa estas dos features en el dashboard. No expliques nada, solo implementa.

---

## FEATURE 1 — Alerta de eventos vencidos (banner rojo)

### Backend
En el router de eventos (donde estén los endpoints de events), agrega:

**GET /api/events/overdue**
Devuelve los eventos con `scheduled_date < hoy` y `status = 'PENDING'`, con info de la mascota y el cliente:

```typescript
const { data, error } = await supabase
  .from('events')
  .select(`
    id, type, scheduled_date,
    pet:pets (
      id, name,
      user:clients (id, name, phone)
    )
  `)
  .lt('scheduled_date', todayUTC())
  .eq('status', 'PENDING')
  .order('scheduled_date', { ascending: true })
```

**POST /api/events/:id/notify**
Marca el evento como NOTIFIED y simula el envío del recordatorio (stub por ahora):

```typescript
// Actualiza status a NOTIFIED y notified_at = now()
// Retorna { ok: true, data: event }
```

### Frontend
Encima de las KPI cards del dashboard, agrega un componente `OverdueAlert`:

- Llama a `GET /api/events/overdue` al cargar
- Si no hay eventos vencidos: no renderiza nada (null)
- Si hay 1 o más: muestra un banner con este diseño:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔴  3 recordatorios vencidos sin enviar                         │
│     Draco (baño · 3 días vencido), Luna (vacuna · 5 días), ...  │
│                                    [Notificar todos →]          │
└─────────────────────────────────────────────────────────────────┘
```

Estilos del banner:
- Fondo: `bg-red-50` borde `border border-red-200` `rounded-xl p-4`
- Punto rojo: `w-2 h-2 rounded-full bg-red-500 animate-pulse`
- Texto principal: `text-sm font-semibold text-red-700`
- Lista de mascotas: `text-xs text-red-500` (máximo 3, luego "+ N más")
- Botón "Notificar todos": `text-xs font-medium text-red-600 underline cursor-pointer`

Al hacer clic en "Notificar todos":
- Llama a `POST /api/events/:id/notify` para cada evento vencido (con Promise.all)
- Muestra un toast: "✓ Recordatorios enviados"
- Remueve el banner (setOverdueEvents([]))

---

## FEATURE 2 — Agenda de hoy (reemplaza "Próximo turno")

### Backend
Agrega o modifica el endpoint de bookings para soportar:

**GET /api/bookings/today**
Devuelve los bookings de hoy con info enriquecida:

```typescript
const today = new Date().toISOString().slice(0, 10)

const { data, error } = await supabase
  .from('bookings')
  .select(`
    id, date, time, status, notes,
    pet:pets (
      id, name, type,
      user:clients (id, name, phone)
    )
  `)
  .eq('date', today)
  .in('status', ['PENDING', 'CONFIRMED'])
  .order('time', { ascending: true })
```

### Frontend
Reemplaza la card "Próximo turno" con una card "Agenda de hoy" más grande que ocupe el mismo espacio:

**Estado vacío:**
```
┌─────────────────────────────┐
│ 📅 Agenda de hoy            │
│                             │
│   Sin turnos para hoy       │
│   [Agendar ahora →]         │
└─────────────────────────────┘
```

**Con turnos (lista):**
```
┌──────────────────────────────────────────────────────┐
│ 📅 Agenda de hoy  ·  3 turnos                        │
│ ─────────────────────────────────────────────────── │
│  10:00  🐕 Draco  ·  María García                   │
│         Baño y corte                    [✓ Listo]   │
│ ─────────────────────────────────────────────────── │
│  11:30  🐱 Luna  ·  Juan Pérez                      │
│         Consulta                        [✓ Listo]   │
│ ─────────────────────────────────────────────────── │
│  15:00  🐕 Max  ·  Ana Torres                       │
│                                         [✓ Listo]   │
│                                                      │
│                    [Ver agenda completa →]           │
└──────────────────────────────────────────────────────┘
```

Cada fila de turno:
- Hora: `text-sm font-bold text-gray-900` 
- Emoji según tipo: dog=🐕 cat=🐱 bird=🐦 other=🐾
- Nombre mascota: `text-sm font-medium text-gray-800`
- Nombre dueño: `text-xs text-gray-500`
- Notas: `text-xs text-gray-400 italic` (si tiene)
- Botón "✓ Listo": `text-xs font-medium text-white bg-[#601EF9] px-3 py-1 rounded-full hover:bg-purple-700 transition`

Al hacer clic en "✓ Listo":
- Llama a `PATCH /api/bookings/:id/complete`
- El turno desaparece de la lista con una animación fade-out (`transition-opacity duration-300 opacity-0`)
- Muestra toast: "✓ Turno completado"
- Actualiza el contador "X turnos" en el header de la card

Link "Ver agenda completa →" va a `/bookings`.

### Estado de carga
Mientras carga, muestra 3 skeleton rows:
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
  <div className="h-3 bg-gray-100 rounded w-1/2" />
</div>
```

---

## FETCH de datos en el dashboard

Agrega estos dos fetches en `web/app/page.tsx` junto a los otros useEffects:

```tsx
// Agenda de hoy
const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([])
const [loadingBookings, setLoadingBookings] = useState(true)

useEffect(() => {
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bookings/today`)
    .then(r => r.json())
    .then(d => { setTodayBookings(d.data ?? []); setLoadingBookings(false) })
    .catch(() => setLoadingBookings(false))
}, [])

// Eventos vencidos
const [overdueEvents, setOverdueEvents] = useState<OverdueEvent[]>([])

useEffect(() => {
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/overdue`)
    .then(r => r.json())
    .then(d => setOverdueEvents(d.data ?? []))
    .catch(() => {})
}, [])
```

---

Implementa todo ahora. No expliques nada.
