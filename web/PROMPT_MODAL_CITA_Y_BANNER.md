Trabajando en VetPlace (Next.js + Tailwind + TypeScript). Hay dos fixes a implementar. No expliques nada, solo implementa.

---

## FIX 1 — Modal "Nueva cita": búsqueda flexible + crear cliente inline

### Problema actual
- El endpoint de búsqueda por teléfono falla con "Cannot coerce the result to a single JSON object" porque usa `.single()` y el número no siempre tiene el prefijo +51.
- No se puede crear un cliente nuevo desde el modal si no está registrado.

### Fix en el backend
En el router de users/clients, modifica `GET /api/users/search` (o donde esté la búsqueda por teléfono) para que:
1. Busque con el número tal como viene
2. Si no encuentra, intente con `+51` + número
3. Use `.maybeSingle()` en vez de `.single()` para no crashear cuando no hay resultados
4. Devuelva también las mascotas del cliente:

```typescript
// Normalizar teléfono: si no empieza con + agregar +51
const normalized = phone.startsWith('+') ? phone : `+51${phone}`

const { data, error } = await supabase
  .from('clients')
  .select(`*, pets (id, name, type)`)
  .or(`phone.eq.${phone},phone.eq.${normalized}`)
  .maybeSingle()

// Si data es null → cliente no encontrado (no es error)
res.json({ ok: true, data: data ?? null })
```

### Fix en el frontend — modal con 3 estados

El modal de nueva cita debe tener estos estados:

**Estado 1: Buscar cliente**
- Campo teléfono + botón Buscar (como está)
- Al buscar: llama al endpoint
- Si encuentra → pasa a Estado 2
- Si NO encuentra → pasa a Estado 3

**Estado 2: Cliente encontrado**
```
✓ María García  ·  +51987983060
Mascota: [Draco 🐕 ▾]  ← select con sus mascotas
         [+ Otra mascota]  ← opción para agregar nueva
```
- Muestra nombre del cliente con check verde
- Dropdown para seleccionar mascota
- Opción "+ Otra mascota" que muestra campos: nombre, tipo (select: Perro/Gato/Ave/Otro)
- Continúa al formulario de fecha/hora

**Estado 3: Cliente no encontrado — crear inline**
```
⚠ No encontramos ese número
─────────────────────────────
Nombre del dueño  [          ]
Nombre mascota    [          ]
Tipo              [Perro ▾   ]
─────────────────────────────
[← Volver]              [Crear y continuar →]
```
- Al hacer clic "Crear y continuar":
  1. POST /api/users  →  crea el cliente
  2. POST /api/pets   →  crea la mascota con user_id del paso 1
  3. Pasa al formulario de fecha/hora con esos datos precargados

**Estado 4: Formulario de fecha/hora (como está, pero con cliente+mascota ya seleccionados)**
```
Cliente:  María García  ·  Draco 🐕
──────────────────────────────────
Fecha    [04/27/2026]
Hora     [10:00     ]
Notas    [          ]
──────────────────────────────────
[Cancelar]          [Confirmar turno →]
```
- Botón "Confirmar turno" llama a POST /api/bookings
- Toast: "✓ Turno agendado para Draco el lunes 27 a las 10:00"

### Validaciones
- Teléfono: mínimo 7 dígitos numéricos
- Nombre dueño (si crea nuevo): mínimo 2 caracteres
- Nombre mascota: mínimo 1 caracter
- Fecha: no puede ser en el pasado
- Hora: requerida

---

## FIX 2 — Banner de bienvenida completamente clickeable

En el componente del banner superior del dashboard (el gradiente morado con "Bienvenido a VetPlace"), envuelve TODO el banner en un `<Link href="/bookings">` en vez de solo el botón "Ver agenda →".

Agrega también `cursor-pointer` y un hover sutil:
```tsx
<Link href="/bookings" className="block hover:opacity-95 transition-opacity">
  {/* contenido actual del banner */}
</Link>
```

Mantén el mismo diseño visual, solo cambia que todo sea clickeable.

---

Implementa los dos fixes ahora.
