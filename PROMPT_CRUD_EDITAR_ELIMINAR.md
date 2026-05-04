# CRUD Completo — Editar y Eliminar Clientes y Mascotas

## Contexto

VetPlace ya permite crear clientes y mascotas, pero no editarlos ni eliminarlos.
Esta tarea agrega las operaciones faltantes en 3 capas:
1. API Routes (backend)
2. `web/lib/api.ts` (cliente HTTP del frontend)
3. UI en `web/app/clients/page.tsx` y `web/app/pets/[id]/page.tsx`

El diseño visual debe seguir exactamente el mismo estilo que ya existe:
- Colores: `#601EF9` (morado principal), `#0f172a` (texto oscuro), `#94a3b8` (texto muted)
- Modales: misma estructura que `NewClientModal` y `AddPetModal` existentes
- Confirmaciones de eliminación: usar el hook `useConfirm` que ya existe en el proyecto

---

## Paso 1 — Agregar PATCH y DELETE en `web/app/api/users/[id]/route.ts`

El archivo ya tiene un `GET`. Agregar dos funciones más:

```ts
// PATCH /api/users/:id — actualizar datos del cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>

    // Solo permitir actualizar estos campos
    const allowed = ['name', 'email', 'address', 'distrito', 'notes', 'phone']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] ?? null
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('Client', id)

    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

// DELETE /api/users/:id — eliminar cliente (y sus mascotas en cascada vía FK)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)

    const { error } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId)

    if (error) handleSupabaseError(error)

    return ok({ deleted: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
```

---

## Paso 2 — Agregar PATCH y DELETE en `web/app/api/pets/[id]/route.ts`

El archivo ya tiene un `GET`. Agregar:

```ts
// PATCH /api/pets/:id — actualizar datos de la mascota
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)
    const body = await request.json() as Record<string, unknown>

    const allowed = ['name', 'type', 'breed', 'birth_date', 'grooming_frequency_days']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] ?? null
    }

    const { data, error } = await supabaseAdmin
      .from('pets')
      .update(updates)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single()

    if (error) handleSupabaseError(error)
    if (!data) throw new NotFoundError('Pet', id)

    return ok(data)
  } catch (e) {
    return handleRouteError(e)
  }
}

// DELETE /api/pets/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { clinicId } = await getAuthContext(request)

    const { error } = await supabaseAdmin
      .from('pets')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId)

    if (error) handleSupabaseError(error)

    return ok({ deleted: true })
  } catch (e) {
    return handleRouteError(e)
  }
}
```

---

## Paso 3 — Actualizar `web/lib/api.ts`

Agregar estos 4 métodos dentro del objeto `api`:

```ts
// Actualizar cliente
updateClient: (id: string, body: { name?: string; email?: string; address?: string; distrito?: string; notes?: string; phone?: string }) =>
  request(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

// Eliminar cliente
deleteClient: (id: string) =>
  request(`/api/users/${id}`, { method: 'DELETE' }),

// Actualizar mascota
updatePet: (id: string, body: { name?: string; type?: string; breed?: string; birth_date?: string; grooming_frequency_days?: number | null }) =>
  request(`/api/pets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

// Eliminar mascota
deletePet: (id: string) =>
  request(`/api/pets/${id}`, { method: 'DELETE' }),
```

---

## Paso 4 — Editar y eliminar cliente en `web/app/clients/page.tsx`

### 4a. Agregar `EditClientModal`

Crear un nuevo componente modal, copiando la estructura de `NewClientModal` pero:
- Recibe `client: Client` como prop (con todos sus datos actuales)
- El estado inicial del form se inicializa con los valores del cliente: `useState({ phone: client.phone ?? '', name: client.name ?? '', email: client.email ?? '', address: client.address ?? '', distrito: client.distrito ?? '', notes: client.notes ?? '' })`
- El botón de submit llama a `api.updateClient(client.id, { ...form })` en lugar de `api.createClient`
- Título del modal: "Editar cliente"
- Botón de submit: "Guardar cambios"
- Props: `{ client: Client; onClose: () => void; onUpdated: (c: Client) => void }`

```tsx
function EditClientModal({ client, onClose, onUpdated }: {
  client: Client
  onClose: () => void
  onUpdated: (c: Client) => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    phone:    client.phone    ?? '',
    name:     client.name     ?? '',
    email:    client.email    ?? '',
    address:  client.address  ?? '',
    distrito: client.distrito ?? '',
    notes:    client.notes    ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phone.trim()) { toast.warning('El teléfono es obligatorio'); return }
    setSaving(true); setErr('')
    try {
      const data = await api.updateClient(client.id, {
        phone:    form.phone.trim()    || undefined,
        name:     form.name.trim()     || undefined,
        email:    form.email.trim()    || undefined,
        address:  form.address.trim()  || undefined,
        distrito: form.distrito        || undefined,
        notes:    form.notes.trim()    || undefined,
      }) as Client
      toast.success('Cliente actualizado')
      onUpdated(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar'
      setErr(msg); toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // Mismo JSX que NewClientModal pero SIN la sección de mascotas y con los nuevos títulos
  // Usar el componente <Modal> existente con title="Editar cliente"
  // Usar los componentes <MField> existentes para los campos
  // El form NO incluye la sección de mascotas (se editan por separado desde la página de la mascota)
}
```

### 4b. Agregar estado y lógica en `ClientsPage`

En el componente `ClientsPage`, agregar:

```tsx
const [showEditClient, setShowEditClient] = useState(false)
```

### 4c. Agregar botones "Editar" y "Eliminar" en la vista de perfil del cliente

Dentro del bloque `{selected && ...}`, en la sección de acciones (donde está el botón de WhatsApp y "Nuevo turno"), agregar dos botones más:

```tsx
{/* Botón Editar */}
<ActionBtn icon="✏️" label="Editar" onClick={() => setShowEditClient(true)} />

{/* Botón Eliminar */}
<ActionBtn
  icon="🗑️"
  label="Eliminar"
  onClick={async () => {
    const ok = await confirm({
      title: 'Eliminar cliente',
      message: `¿Eliminar a ${selected.name ?? selected.phone} y todas sus mascotas? Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.deleteClient(selected.id)
      toast.success('Cliente eliminado')
      setSelected(null)
      setPets([])
      setRecentClients(prev => prev.filter(c => c.id !== selected.id))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }}
/>
```

### 4d. Renderizar `EditClientModal` al final del bloque de modales

```tsx
{showEditClient && selected && (
  <EditClientModal
    client={selected}
    onClose={() => setShowEditClient(false)}
    onUpdated={(updated) => {
      setSelected(updated)
      setShowEditClient(false)
      setRecentClients(prev =>
        prev.map(c => c.id === updated.id ? { ...c, ...updated } : c)
      )
    }}
  />
)}
```

---

## Paso 5 — Editar y eliminar mascota en `web/app/pets/[id]/page.tsx`

### 5a. Agregar `EditPetModal`

Nuevo componente modal dentro del archivo. Recibe `pet: Pet` y muestra un form pre-rellenado:
- Campos: Nombre, Especie (select), Raza, Fecha de nacimiento, Frecuencia de baño (días)
- Estado inicial con los valores actuales de la mascota
- Submit llama a `api.updatePet(pet.id, { ...form })`
- Props: `{ pet: Pet; onClose: () => void; onUpdated: (p: Pet) => void }`
- Usar el mismo estilo visual de los otros modales del archivo (`.fixed inset-0 z-50`, fondo blur, card redondeado)
- Inputs con estilo: `border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300`

```tsx
function EditPetModal({ pet, onClose, onUpdated }: {
  pet: Pet
  onClose: () => void
  onUpdated: (p: Pet) => void
}) {
  // Estado inicial pre-rellenado con datos de la mascota
  // Campos: name, type, breed, birth_date, grooming_frequency_days
  // Submit: api.updatePet(pet.id, { name, type, breed: breed || undefined, birth_date: birth_date || undefined, grooming_frequency_days: groomFreq ? Number(groomFreq) : null })
  // El tipo Pet puede necesitar los campos opcionales: breed?: string
}
```

Nota: el tipo `Pet` en este archivo no tiene `breed`. Agregarlo como campo opcional:
```ts
interface Pet {
  id: string
  name: string
  type: string
  breed?: string          // ← agregar
  birth_date?: string
  grooming_frequency_days?: number
  last_grooming_date?: string
  user: User
}
```

### 5b. Agregar estado en `PetDetailPage`

```tsx
const [showEditPet, setShowEditPet] = useState(false)
```

### 5c. Agregar botones en la card principal de la mascota

Junto al botón de "Marcar baño completado" (o en el header de la card), agregar:

```tsx
{/* Botón Editar mascota */}
<button
  onClick={() => setShowEditPet(true)}
  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl"
  style={{ background: '#f0f4ff', color: '#601EF9' }}
>
  ✏️ Editar
</button>

{/* Botón Eliminar mascota */}
<button
  onClick={async () => {
    const ok = await confirm({
      title: 'Eliminar mascota',
      message: `¿Eliminar a ${pet.name}? Se eliminarán también todos sus eventos y citas. Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.deletePet(pet.id)
      toast.success(`${pet.name} eliminada`)
      router.push('/clients')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }}
  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl"
  style={{ background: '#fef2f2', color: '#dc2626' }}
>
  🗑️ Eliminar
</button>
```

Colocar estos botones en la sección de acciones de la card principal (misma fila que el botón de baño completado), separados con un `<div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid #f0f4ff' }}>`.

### 5d. Renderizar `EditPetModal`

Antes del `{/* Breadcrumb */}`:

```tsx
{showEditPet && (
  <EditPetModal
    pet={pet}
    onClose={() => setShowEditPet(false)}
    onUpdated={(updated) => {
      setPet(prev => prev ? { ...prev, ...updated } : prev)
      setShowEditPet(false)
      toast.success('Mascota actualizada')
    }}
  />
)}
```

---

## Verificación

Al terminar, probar:

1. Abrir perfil de un cliente → botón "Editar" abre modal con datos pre-rellenados → guardar cambia los datos en pantalla
2. Botón "Eliminar" cliente → aparece confirmación danger → confirmar elimina y vuelve a la lista
3. Abrir perfil de una mascota → botón "Editar" abre modal pre-rellenado → guardar actualiza el header
4. Botón "Eliminar" mascota → confirmación → redirige a `/clients`
5. Hacer push y verificar en producción (Vercel)
