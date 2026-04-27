'use client'

import { useState, use } from 'react'
import Image from 'next/image'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3000'

type Step = 'owner' | 'pet' | 'done'

interface OwnerForm {
  name:  string
  phone: string
  email: string
}
interface PetForm {
  petName:   string
  species:   string
  breed:     string
  birthDate: string
}

export default function JoinPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = use(params)

  const [step, setStep]           = useState<Step>('owner')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [ownerId, setOwnerId]     = useState<string | null>(null)

  const [owner, setOwner] = useState<OwnerForm>({ name: '', phone: '', email: '' })
  const [pet,   setPet]   = useState<PetForm>({ petName: '', species: 'dog', breed: '', birthDate: '' })

  const setO = (k: keyof OwnerForm) => (v: string) => setOwner((f) => ({ ...f, [k]: v }))
  const setP = (k: keyof PetForm)   => (v: string) => setPet((f)   => ({ ...f, [k]: v }))

  const submitOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/users`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: owner.phone, name: owner.name, clinic_id: clinicId }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Error al registrarse')
      setOwnerId(json.data.id)
      setStep('pet')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  const submitPet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/pets`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          clinic_id:  clinicId,
          user_id:    ownerId,
          name:       pet.petName,
          type:       pet.species,
          breed:      pet.breed || undefined,
          birth_date: pet.birthDate || undefined,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Error al registrar mascota')
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar mascota')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(145deg, #3b10b5 0%, #601EF9 55%, #7c3aff 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-7 pt-7 pb-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <Image src="/logo.png" alt="VetPlace" width={130} height={36} style={{ objectFit: 'contain' }} />
          <p className="text-sm mt-2" style={{ color: '#64748b' }}>
            Registrate para acceder a los servicios de la clínica
          </p>

          {/* Progress */}
          <div className="flex items-center gap-2 mt-4">
            <StepDot n={1} active={step === 'owner'} done={step !== 'owner'} label="Tus datos" />
            <div className="flex-1 h-px" style={{ background: step !== 'owner' ? '#601EF9' : '#E5E7EB' }} />
            <StepDot n={2} active={step === 'pet'} done={step === 'done'} label="Tu mascota" />
            <div className="flex-1 h-px" style={{ background: step === 'done' ? '#601EF9' : '#E5E7EB' }} />
            <StepDot n={3} active={step === 'done'} done={false} label="Listo" />
          </div>
        </div>

        <div className="px-7 py-6">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          {/* STEP 1: Owner */}
          {step === 'owner' && (
            <form onSubmit={submitOwner} className="space-y-4">
              <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Tus datos</h2>
              <JoinField label="Nombre completo *" value={owner.name}  onChange={setO('name')}  placeholder="Juan García" required />
              <JoinField label="Teléfono *"        value={owner.phone} onChange={setO('phone')} placeholder="+54 9 11 XXXX-XXXX" type="tel" required />
              <JoinField label="Email"             value={owner.email} onChange={setO('email')} placeholder="juan@email.com" type="email" />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white mt-2"
                style={{ background: 'linear-gradient(135deg, #3b10b5, #601EF9)', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Guardando…' : 'Continuar →'}
              </button>
            </form>
          )}

          {/* STEP 2: Pet */}
          {step === 'pet' && (
            <form onSubmit={submitPet} className="space-y-4">
              <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Tu mascota</h2>
              <JoinField label="Nombre de la mascota *" value={pet.petName} onChange={setP('petName')} placeholder="Rex, Luna, Milo…" required />
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>Especie *</label>
                <select
                  value={pet.species}
                  onChange={(e) => setP('species')(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
                >
                  <option value="dog">🐶 Perro</option>
                  <option value="cat">🐱 Gato</option>
                  <option value="bird">🐦 Ave</option>
                  <option value="rabbit">🐰 Conejo</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <JoinField label="Raza"               value={pet.breed}     onChange={setP('breed')}     placeholder="Labrador, Siamés…" />
              <JoinField label="Fecha de nacimiento" value={pet.birthDate} onChange={setP('birthDate')} type="date" />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('owner')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: '#F1F5F9', color: '#334155' }}
                >
                  ← Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #3b10b5, #601EF9)', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Guardando…' : 'Registrarme'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: '#F3EEFF' }}
              >
                🐾
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#0f172a' }}>¡Registro exitoso!</h2>
                <p className="text-sm mt-2" style={{ color: '#64748b' }}>
                  Ya quedaste registrado en la clínica.<br />
                  Pronto te contactarán para coordinar tu primer turno.
                </p>
              </div>
              <div
                className="w-full px-4 py-3 rounded-xl text-xs text-center"
                style={{ background: '#F3EEFF', color: '#601EF9' }}
              >
                Guardá este link por si necesitás volver a ingresar tus datos
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function JoinField({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#334155' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#F9F9FB', border: '1.5px solid #E5E7EB', color: '#0f172a' }}
        onFocus={(e) => (e.currentTarget.style.border = '1.5px solid #601EF9')}
        onBlur={(e)  => (e.currentTarget.style.border = '1.5px solid #E5E7EB')}
      />
    </div>
  )
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
        style={
          done   ? { background: '#601EF9', color: '#fff' } :
          active ? { background: '#F3EEFF', color: '#601EF9', border: '2px solid #601EF9' } :
                   { background: '#F1F5F9', color: '#94a3b8' }
        }
      >
        {done ? '✓' : n}
      </div>
      <span className="text-[10px] whitespace-nowrap" style={{ color: active || done ? '#601EF9' : '#94a3b8' }}>
        {label}
      </span>
    </div>
  )
}
