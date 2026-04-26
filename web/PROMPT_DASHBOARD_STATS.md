Mejora el dashboard de VetPlace para que las estadísticas sean útiles desde el día 1 y muestren progreso relativo conforme crece la clínica. El stack es Next.js + TypeScript + Tailwind en `web/`, backend Express en la raíz con Supabase (tabla `clients`, `pets`, `events`, `bookings`). Color primario: #601EF9.

No expliques nada. Implementa todo.

---

## PARTE 1 — BACKEND: mejorar `GET /api/stats`

El endpoint ya existe. Reemplaza su implementación completa con esta versión que devuelve datos comparativos (período actual vs período anterior).

El endpoint debe calcular y devolver este shape exacto:

```typescript
{
  // Período actual
  bookings_today: number,
  bookings_this_week: number,
  bookings_this_month: number,
  
  // Período anterior (para calcular deltas en el front)
  bookings_yesterday: number,
  bookings_last_week: number,
  bookings_last_month: number,
  
  // Clientes
  clients_total: number,
  clients_this_month: number,      // nuevos este mes
  clients_last_month: number,      // nuevos el mes pasado
  
  // Mascotas y eventos
  pets_total: number,
  events_pending: number,
  events_next_7_days: number,
  events_overdue: number,          // scheduled_date < hoy y status = PENDING
  
  // Próximo turno agendado
  next_booking: {
    date: string,       // YYYY-MM-DD
    time: string,       // HH:MM
    pet_name: string,
  } | null,
}
```

Implementa cada métrica con una query separada a Supabase. Usa `Promise.all` para correrlas en paralelo. Ejemplo de queries:

```typescript
// bookings_today
const today = new Date().toISOString().slice(0, 10)
supabase.from('bookings').select('id', { count: 'exact', head: true })
  .eq('date', today).in('status', ['PENDING', 'CONFIRMED'])

// bookings_this_week (lunes a hoy)
const monday = getMondayOfCurrentWeek()  // helper que calcules tú
supabase.from('bookings').select('id', { count: 'exact', head: true })
  .gte('date', monday).lte('date', today).in('status', ['PENDING', 'CONFIRMED', 'COMPLETED'])

// events_overdue
supabase.from('events').select('id', { count: 'exact', head: true })
  .lt('scheduled_date', today).eq('status', 'PENDING')

// next_booking
supabase.from('bookings')
  .select('date, time, pet:pets(name)')
  .gte('date', today)
  .in('status', ['PENDING', 'CONFIRMED'])
  .order('date', { ascending: true })
  .order('time', { ascending: true })
  .limit(1)
```

---

## PARTE 2 — FRONTEND: rediseñar el dashboard

Archivo: `web/app/page.tsx` (o donde esté el dashboard actual).

Reemplaza las 3 cajas actuales con un diseño de **tarjetas KPI con deltas** y una sección de estado de la clínica.

### Layout nuevo:

```
┌─────────────────────────────────────────────────────┐
│  FILA 1: 4 KPI cards pequeñas horizontales          │
│  [Turnos hoy] [Esta semana] [Clientes] [Mascotas]   │
├─────────────────────────────────────────────────────┤
│  FILA 2: 2 cards medianas                           │
│  [Próximo turno]        [Eventos pendientes]        │
├─────────────────────────────────────────────────────┤
│  FILA 3: grid de herramientas (como está ahora)     │
└─────────────────────────────────────────────────────┘
```

### Componente KPI card con delta:

Cada card muestra:
- Número grande (el valor actual)
- Label descriptivo
- Delta badge: si hay comparación, muestra `+N vs semana pasada` en verde si positivo, rojo si negativo, gris si igual
- Si el valor es 0, muestra un estado vacío con call-to-action en texto pequeño

```tsx
// Lógica del delta badge:
// delta = current - previous
// si delta > 0  → badge verde "↑ +{delta} vs período ant."
// si delta < 0  → badge rojo "↓ {delta} vs período ant."
// si delta === 0 y current === 0 → texto gris "Sin actividad aún"
// si delta === 0 y current > 0  → badge gris "= igual que antes"
```

### Estados vacíos con contexto:

Cuando los números son bajos, las cards deben tener mensajes que den contexto y animen:

- `bookings_today = 0` → subtexto: *"Sin turnos hoy · Agenda el primero →"* (link a /bookings)
- `clients_total < 5` → subtexto: *"Primeros clientes registrados"*
- `clients_total >= 5` → subtexto: *"+{clients_this_month} nuevos este mes"*
- `events_overdue > 0` → badge rojo con texto *"{n} vencidos sin notificar"*
- `next_booking = null` → *"No hay turnos próximos"*
- `next_booking != null` → *"Próximo: {pet_name} · {fecha formateada} {hora}"*

### Card "Próximo turno":

```
┌──────────────────────────────┐
│ 🐾 Próximo turno             │
│                              │
│  Draco                       │
│  Lunes 28 de abril · 10:00  │
│                              │
│  [Ver agenda completa →]     │
└──────────────────────────────┘
```

Si no hay turno próximo:
```
┌──────────────────────────────┐
│ 🐾 Próximo turno             │
│                              │
│  Sin turnos agendados        │
│  [Agendar ahora →]           │
└──────────────────────────────┘
```

### Card "Eventos pendientes":

Muestra 3 números apilados:
- **{events_pending}** pendientes
- **{events_next_7_days}** en los próximos 7 días  
- **{events_overdue}** vencidos (en rojo si > 0)

### Fetching de datos:

Usa `useEffect` + `fetch` al `NEXT_PUBLIC_API_URL/api/stats`. Muestra skeletons mientras carga (divs con `animate-pulse bg-gray-100 rounded`). En error, muestra las cards con `--` en los números.

```tsx
const [stats, setStats] = useState<StatsData | null>(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats`)
    .then(r => r.json())
    .then(d => { setStats(d); setLoading(false) })
    .catch(() => setLoading(false))
}, [])
```

### Colores y estilo:

- Fondo de cards: blanco, borde `border border-gray-100`, `rounded-xl`, `shadow-sm`
- Número principal: `text-3xl font-bold text-gray-900`
- Label: `text-sm text-gray-500`
- Delta positivo: `text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full`
- Delta negativo: `text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full`
- Delta neutro: `text-xs text-gray-400`
- Acento primario para links e iconos: `text-[#601EF9]`

---

Implementa backend y frontend ahora. No expliques nada.
