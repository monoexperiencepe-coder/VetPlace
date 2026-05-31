'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

export interface StaffMember {
  id: string
  name: string
  color: string
  role: string
}

export interface CalBooking {
  id: string
  time: string
  date: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  staff_id?: string | null
  price?: number | null
  pet?: {
    id: string
    name: string
    type: string
    user?: { id: string; name?: string; phone: string }
  }
  service?: { id: string; name: string; price: number } | null
}

interface Props {
  bookings: CalBooking[]
  staff: StaffMember[]
  onCompleteBooking: (booking: CalBooking) => void
  onBookingUpdated: (bookingId: string, changes: Partial<CalBooking>) => void
}

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00',
]

const STATUS_BG: Record<string, string> = {
  CONFIRMED: 'linear-gradient(135deg,#7c3aff,#4f12e0)',
  PENDING:   'linear-gradient(135deg,#f59e0b,#d97706)',
  COMPLETED: 'linear-gradient(135deg,#94a3b8,#64748b)',
  CANCELLED: 'linear-gradient(135deg,#fca5a5,#ef4444)',
}

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  PENDING:   'Pendiente',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

const STAFF_COLORS = [
  '#601EF9','#0ea5e9','#10b981','#f59e0b','#ec4899','#ef4444','#8b5cf6','#06b6d4',
]

export default function AgendaCalendarView({ bookings, staff, onCompleteBooking, onBookingUpdated }: Props) {
  const [selected, setSelected] = useState<CalBooking | null>(null)
  const [assigning, setAssigning] = useState(false)

  // Columns: "Sin asignar" + one per staff member
  const columns = [
    { id: 'unassigned', name: 'Sin asignar', color: '#94a3b8', initials: '?' },
    ...staff.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color || '#601EF9',
      initials: s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
    })),
  ]

  function getBookingsForSlot(hour: string, colId: string): CalBooking[] {
    const slotHour = parseInt(hour.slice(0, 2), 10)
    return bookings.filter(b => {
      const bHour = parseInt((b.time || '00:00').slice(0, 2), 10)
      const bColId = b.staff_id || 'unassigned'
      return bHour === slotHour && bColId === colId && b.status !== 'CANCELLED'
    })
  }

  function countForColumn(colId: string): number {
    return bookings.filter(b => (b.staff_id || 'unassigned') === colId && b.status !== 'CANCELLED').length
  }

  async function handleAssign(staffId: string | null) {
    if (!selected || assigning) return
    setAssigning(true)
    try {
      await api.updateBookingStaff(selected.id, staffId)
      const updated = { ...selected, staff_id: staffId }
      onBookingUpdated(selected.id, { staff_id: staffId })
      setSelected(updated)
    } catch (e) {
      console.error('[AgendaCalendarView] assign error', e)
    } finally {
      setAssigning(false)
    }
  }

  const gridCols = `56px repeat(${columns.length}, 1fr)`

  return (
    <>
      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #ede9fe' }}>

        {/* ── Employee header ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1.5px solid #f1f5f9' }}>
          <div style={{ background: '#fafafa', borderRight: '1px solid #f1f5f9' }} />
          {columns.map((col, i) => (
            <div key={col.id} style={{
              padding: '10px 8px',
              textAlign: 'center',
              borderRight: i < columns.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: col.color, margin: '0 auto 4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'white',
              }}>
                {col.initials}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {col.name}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                {countForColumn(col.id)} citas
              </div>
            </div>
          ))}
        </div>

        {/* ── Hour rows ─────────────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', maxHeight: 520 }}>
          {HOURS.map(hour => (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid #f8fafc', minHeight: 56 }}>

              {/* Time label */}
              <div style={{
                padding: '8px 6px', fontSize: 11, color: '#94a3b8', fontWeight: 500,
                borderRight: '1px solid #f1f5f9', background: '#fafafa',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'flex-start', paddingTop: 9,
              }}>
                {hour}
              </div>

              {/* Slots */}
              {columns.map((col, i) => {
                const slotBookings = getBookingsForSlot(hour, col.id)
                return (
                  <div key={col.id} style={{
                    borderRight: i < columns.length - 1 ? '1px solid #f1f5f9' : 'none',
                    padding: '3px 4px', minHeight: 56, overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    {slotBookings.map(booking => (
                      <div
                        key={booking.id}
                        role="button"
                        onClick={() => setSelected(booking)}
                        style={{
                          background: STATUS_BG[booking.status] ?? STATUS_BG.CONFIRMED,
                          borderRadius: 7, padding: '5px 7px',
                          cursor: 'pointer', width: '100%',
                          transition: 'filter 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.88)')}
                        onMouseLeave={e => (e.currentTarget.style.filter = '')}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {booking.pet?.name ?? '—'}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.88)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {booking.service?.name ?? booking.notes ?? ''}
                        </div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                          {(booking.time || '').slice(0, 5)}{(booking.price ?? booking.service?.price) != null ? ` · S/${booking.price ?? booking.service?.price}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Booking detail modal ──────────────────────────────────── */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div style={{ background: 'white', borderRadius: 20, padding: 24, width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.3, flex: 1, marginRight: 8 }}>
                {selected.pet?.name ?? '—'} — {selected.service?.name ?? selected.notes ?? 'Servicio'}
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#475569', fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>

            {/* Status badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginBottom: 14,
              background: selected.status === 'CONFIRMED' ? '#ede9fe' : selected.status === 'PENDING' ? '#fef9c3' : '#f1f5f9',
              color: selected.status === 'CONFIRMED' ? '#601EF9' : selected.status === 'PENDING' ? '#92400e' : '#64748b',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: selected.status === 'CONFIRMED' ? '#601EF9' : selected.status === 'PENDING' ? '#f59e0b' : '#94a3b8', display: 'inline-block' }} />
              {STATUS_LABEL[selected.status] ?? selected.status}
            </div>

            {/* Details */}
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>🕐 <strong style={{ color: '#0f172a' }}>{(selected.time || '').slice(0, 5)}</strong></div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>🐾 <strong style={{ color: '#0f172a' }}>{selected.pet?.name ?? '—'}</strong> · {selected.pet?.type ?? ''}</div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>👤 {selected.pet?.user?.name ?? selected.pet?.user?.phone ?? '—'}</div>
            {(selected.price ?? selected.service?.price) != null && (
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>💵 <strong style={{ color: '#0f172a' }}>S/ {selected.price ?? selected.service?.price}</strong></div>
            )}
            {selected.notes && (
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>📝 {selected.notes}</div>
            )}

            {/* Staff assignment */}
            {staff.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Asignar empleado
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button
                    onClick={() => handleAssign(null)}
                    disabled={assigning}
                    style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: !selected.staff_id ? '#e2e8f0' : 'white',
                      border: `1.5px solid ${!selected.staff_id ? '#94a3b8' : '#e2e8f0'}`,
                      color: '#64748b', opacity: assigning ? 0.6 : 1,
                    }}
                  >Sin asignar</button>
                  {staff.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleAssign(s.id)}
                      disabled={assigning}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        background: selected.staff_id === s.id ? (s.color || '#601EF9') : 'white',
                        border: `1.5px solid ${selected.staff_id === s.id ? (s.color || '#601EF9') : '#e2e8f0'}`,
                        color: selected.staff_id === s.id ? 'white' : '#475569',
                        opacity: assigning ? 0.6 : 1,
                        transition: 'all 0.15s',
                      }}
                    >{s.name}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ height: 1, background: '#f1f5f9', margin: '14px 0' }} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              {selected.status !== 'COMPLETED' && selected.status !== 'CANCELLED' && (
                <button
                  onClick={() => { onCompleteBooking(selected); setSelected(null) }}
                  style={{ flex: 1, background: '#601EF9', color: 'white', border: 'none', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(96,30,249,0.3)' }}
                >✓ Listo</button>
              )}
              <button
                onClick={() => setSelected(null)}
                style={{ flex: 1, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { STAFF_COLORS }
