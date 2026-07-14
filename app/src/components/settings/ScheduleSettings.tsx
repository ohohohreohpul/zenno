'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface Slot { id: string; className: string; dayOfWeek: number; time: string; durationMin: number; capacity: number; instructor: string }
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export function ScheduleSettings() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [form, setForm] = useState({ className: '', dayOfWeek: 1, time: '09:00', durationMin: 60, capacity: 1, instructor: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetch('/api/schedule?workspaceId=ws-1').then((res) => res.json()).then((body) => setSlots(body.data ?? [])).catch(() => setError('Could not load availability')) }, [])

  async function addSlot() {
    setError(null)
    const res = await fetch('/api/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId: 'ws-1', ...form }) })
    const body = await res.json()
    if (!res.ok) { setError('Check the class name, time, duration, and capacity.'); return }
    setSlots((current) => [...current, body.data])
    setForm((current) => ({ ...current, className: '' }))
  }

  async function removeSlot(id: string) {
    const res = await fetch(`/api/schedule?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) setSlots((current) => current.filter((slot) => slot.id !== id))
  }

  const inputStyle = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--card)', color: 'var(--text-primary)', fontSize: 12 } as const
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>Bookable schedule</div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 12px' }}>Recurring weekly slots the AI can check and book. Capacity is enforced separately for each date.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 90px 80px 80px', gap: 7 }}>
        <input aria-label="Class name" placeholder="Service or class" value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })} style={inputStyle} />
        <select aria-label="Day" value={form.dayOfWeek} onChange={(event) => setForm({ ...form, dayOfWeek: Number(event.target.value) })} style={inputStyle}>{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select>
        <input aria-label="Time" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} style={inputStyle} />
        <input aria-label="Minutes" type="number" min={5} value={form.durationMin} onChange={(event) => setForm({ ...form, durationMin: Number(event.target.value) })} style={inputStyle} title="Duration in minutes" />
        <input aria-label="Capacity" type="number" min={1} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} style={inputStyle} title="Capacity" />
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
        <input placeholder="Instructor or staff (optional)" value={form.instructor} onChange={(event) => setForm({ ...form, instructor: event.target.value })} style={{ ...inputStyle, flex: 1 }} />
        <button onClick={addSlot} disabled={!form.className.trim()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', fontSize: 12, cursor: form.className.trim() ? 'pointer' : 'default', opacity: form.className.trim() ? 1 : .5 }}><Plus size={12} /> Add slot</button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--stage-vip)', marginTop: 7 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
        {slots.length === 0 && <div style={{ padding: 12, border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)', fontSize: 12 }}>No slots yet. The AI will not offer bookings until you add one.</div>}
        {slots.map((slot) => <div key={slot.id} style={{ display: 'flex', alignItems: 'center', padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}><span style={{ fontWeight: 600, flex: 1 }}>{slot.className}</span><span style={{ color: 'var(--text-secondary)' }}>{DAYS[slot.dayOfWeek]} {slot.time} · {slot.durationMin} min · {slot.capacity} spot{slot.capacity === 1 ? '' : 's'}</span><button aria-label={`Delete ${slot.className}`} onClick={() => removeSlot(slot.id)} style={{ marginLeft: 10, border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}><Trash2 size={13} /></button></div>)}
      </div>
    </div>
  )
}
