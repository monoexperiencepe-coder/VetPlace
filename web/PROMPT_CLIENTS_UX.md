Trabajando en VetPlace (Next.js + Tailwind + TypeScript en `web/`, backend Express + Supabase en la raíz). Stack: color primario #601EF9, tablas `clients`, `pets`.

No expliques nada. Solo implementa.

---

## OBJETIVO

La página de clientes (`web/app/clients/page.tsx`) actualmente se ve completamente vacía hasta que el usuario hace una búsqueda. Hay que agregar:

1. **Stats bar** arriba: 4 métricas clave con deltas
2. **Lista de clientes recientes** debajo del buscador, visible desde el inicio

---

## PARTE 1 — BACKEND: nuevo endpoint `GET /api/users/recent`

En el router de users (donde estén los otros endpoints de `/api/users`), agrega:

**GET /api/users/recent**
Devuelve los últimos 10 clientes registrados, con sus mascotas:

```typescript
const { data, error } = await supabase
  .from('clients')
  .select(`
    id, name, phone, email, created_at,
    pets (id, name, type)
  `)
  .order('created_at', { ascending: false })
  .limit(10)

if (error) handleSupabaseError(error)
res.json({ ok: true, data: data ?? [] })
```

Este endpoint va ANTES de las rutas con `:id` para que no confunda la ruta.

---

## PARTE 2 — FRONTEND: stats bar

En `web/app/clients/page.tsx`, agrega lo siguiente justo al inicio del componente (antes del `return`):

### Estado y fetch

```tsx
interface ClientStats {
  clients_total: number
  clients_this_month: number
  clients_last_month: number
  pets_total: number
}

const [stats, setStats] = useState<ClientStats | null>(null)
const [loadingStats, setLoadingStats] = useState(true)

useEffect(() => {
  fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000'}/api/stats`)
    .then(r => r.json())
    .then(d => {
      setStats({
        clients_total:      d.clients_total      ?? 0,
        clients_this_month: d.clients_this_month ?? 0,
        clients_last_month: d.clients_last_month ?? 0,
        pets_total:         d.pets_total         ?? 0,
      })
      setLoadingStats(false)
    })
    .catch(() => setLoadingStats(false))
}, [])
```

### Componente StatsBar

Agrega este componente al archivo (fuera del componente principal):

```tsx
function StatsBar({ stats, loading }: { stats: ClientStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#F3EEFF' }} />
        ))}
      </div>
    )
  }

  const delta = (curr: number, prev: number) => curr - prev

  const cards = [
    {
      label: 'Clientes totales',
      value: stats?.clients_total ?? 0,
      icon: '👥',
      delta: stats ? delta(stats.clients_this_month, stats.clients_last_month) : null,
      deltaLabel: 'vs mes anterior',
      sub: stats && stats.clients_total < 5 ? 'Primeros clientes registrados' : null,
    },
    {
      label: 'Nuevos este mes',
      value: stats?.clients_this_month ?? 0,
      icon: '🆕',
      delta: stats ? delta(stats.clients_this_month, stats.clients_last_month) : null,
      deltaLabel: 'vs mes pasado',
      sub: null,
    },
    {
      label: 'Mes anterior',
      value: stats?.clients_last_month ?? 0,
      icon: '📅',
      delta: null,
      deltaLabel: '',
      sub: null,
    },
    {
      label: 'Mascotas',
      value: stats?.pets_total ?? 0,
      icon: '🐾',
      delta: null,
      deltaLabel: '',
      sub: stats?.pets_total === 0 ? 'Sin mascotas aún' : null,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map(card => (
        <div key={card.label}
          className="rounded-2xl p-4 flex flex-col gap-1"
          style={{ background: '#fff', border: '1px solid #ede9fe', boxShadow: '0 1px 4px rgba(96,30,249,0.04)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{card.icon}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
              {card.label}
            </span>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#0f172a' }}>{card.value}</p>
          {card.delta !== null && (
            card.delta > 0 ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full w-fit"
                style={{ background: '#ecfdf5', color: '#059669' }}>
                ↑ +{card.delta} {card.deltaLabel}
              </span>
            ) : card.delta < 0 ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full w-fit"
                style={{ background: '#fef2f2', color: '#dc2626' }}>
                ↓ {card.delta} {card.deltaLabel}
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: '#94a3b8' }}>= igual que antes</span>
            )
          )}
          {card.sub && (
            <span className="text-[11px]" style={{ color: '#94a3b8' }}>{card.sub}</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

### Uso en el JSX

En el `return` del componente principal, agrega `<StatsBar>` como primer elemento dentro del div contenedor principal, antes del `<div className="flex gap-6 ...">`:

```tsx
return (
  <div>
    <StatsBar stats={stats} loading={loadingStats} />
    <div className="flex gap-6 h-[calc(100vh-160px)]">
      {/* ... resto del código existente ... */}
    </div>
  </div>
)
```

Ajusta el `h-[calc(100vh-88px)]` del flex container a `h-[calc(100vh-160px)]` para compensar el espacio que ocupa la StatsBar.

---

## PARTE 3 — FRONTEND: clientes recientes (panel izquierdo)

### Agrega en `web/lib/api.ts`

```typescript
getRecentClients: () =>
  request('/api/users/recent'),
```

### Estado y fetch en `ClientsPage`

Agrega estos estados junto a los otros `useState`:

```tsx
interface RecentClient {
  id: string
  name?: string
  phone: string
  created_at: string
  pets: { id: string; name: string; type: string }[]
}

const [recentClients, setRecentClients] = useState<RecentClient[]>([])
const [loadingRecent, setLR] = useState(true)

useEffect(() => {
  api.getRecentClients()
    .then((d: unknown) => {
      setRecentClients(d as RecentClient[])
      setLR(false)
    })
    .catch(() => setLR(false))
}, [])
```

Cuando se crea un nuevo cliente, agrégalo al inicio de `recentClients`:
En `onCreated` del `NewClientModal`, después de `pickClient(c)` agrega:
```tsx
setRecentClients(prev => [{ ...c, pets: [] }, ...prev].slice(0, 10))
```

### Componente RecentClients

Agrega en el panel izquierdo, debajo del botón "Nuevo cliente", este bloque:

```tsx
{/* Clientes recientes */}
{!selected && (
  <div className="rounded-2xl overflow-hidden flex-1" style={{ background: '#fff', border: '1px solid #ede9fe' }}>
    <p className="text-[10px] font-semibold uppercase tracking-widest px-4 pt-4 pb-2" style={{ color: '#94a3b8' }}>
      Recientes
    </p>

    {loadingRecent && (
      <div className="space-y-2 px-4 pb-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#F3EEFF' }} />
        ))}
      </div>
    )}

    {!loadingRecent && recentClients.length === 0 && (
      <div className="flex flex-col items-center py-8 gap-2" style={{ color: '#94a3b8' }}>
        <span className="text-3xl">👥</span>
        <p className="text-xs">Aún no hay clientes</p>
      </div>
    )}

    {!loadingRecent && recentClients.length > 0 && (
      <div className="overflow-y-auto max-h-80">
        {recentClients.map(c => (
          <button key={c.id} onClick={() => pickClient(c as Client)}
            className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
            style={{ borderTop: '1px solid #F1F5F9' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F3EEFF'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Avatar name={c.name ?? c.phone} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
                {c.name ?? c.phone}
              </p>
              <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                {c.pets?.length
                  ? c.pets.map(p => `${PET_EMOJI[p.type] ?? '🐾'} ${p.name}`).join(' · ')
                  : 'Sin mascotas'}
              </p>
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

Este bloque se muestra SOLO cuando `!selected` (no hay cliente seleccionado actualmente), así el panel izquierdo no se ve vacío.

---

## RESUMEN DE CAMBIOS

- **Backend**: nuevo `GET /api/users/recent` en `users.router.ts`
- **`web/lib/api.ts`**: agregar `getRecentClients`
- **`web/app/clients/page.tsx`**:
  - Nuevo estado `stats`, `loadingStats`, `recentClients`, `loadingRecent`
  - Nuevo tipo `RecentClient`
  - Nuevo componente `StatsBar`
  - `StatsBar` renderizada arriba del layout principal
  - Lista de recientes en el panel izquierdo cuando no hay cliente seleccionado
  - Actualizar `h-[calc(100vh-88px)]` → `h-[calc(100vh-160px)]`

---

Implementa todo ahora. No expliques nada.
