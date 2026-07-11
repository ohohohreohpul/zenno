'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_START_HOUR = 8
const DAY_END_HOUR = 18
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => i + DAY_START_HOUR)
const SLOT_HEIGHT = 56 // px per hour
const WORKSPACE_ID = 'ws-1'

type Channel = 'whatsapp' | 'instagram' | 'messenger' | 'telegram' | 'line' | 'webchat'
type AppointmentKind = 'trial' | 'regular' | 'consult'

interface Appointment {
  _id: string
  workspaceId: string
  contactId: string
  contactName: string
  className: string
  startsAt: string
  durationMin: number
  channel: Channel
  kind: AppointmentKind
  createdAt: string
}

const CHANNEL_COLORS: Record<Channel, string> = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  line: '#00B900',
  telegram: '#26A5E4',
  messenger: '#0084FF',
  webchat: '#6366F1',
}

function formatHour(h: number) {
  if (h === 12) return '12pm'
  if (h > 12) return `${h - 12}pm`
  return `${h}am`
}

function formatTime(d: Date) {
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

function getWeekDates(offset: number) {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isValidAppointment(a: unknown): a is Appointment {
  if (typeof a !== 'object' || a === null) return false
  const r = a as Record<string, unknown>
  return (
    typeof r._id === 'string' &&
    typeof r.contactName === 'string' &&
    typeof r.className === 'string' &&
    typeof r.startsAt === 'string' &&
    typeof r.durationMin === 'number' &&
    typeof r.channel === 'string' &&
    typeof r.kind === 'string'
  )
}

function AppointmentBlock({ appt }: { appt: Appointment }) {
  const start = new Date(appt.startsAt)
  const top = (start.getMinutes() / 60) * SLOT_HEIGHT
  const height = Math.max((appt.durationMin / 60) * SLOT_HEIGHT, 40)
  const channelColor = CHANNEL_COLORS[appt.channel] ?? 'var(--border)'
  return (
    <div style={{
      position: 'absolute', top, left: 3, right: 3, height,
      background: 'var(--card)', borderRadius: 'var(--radius-sm)',
      border: '1px solid rgba(0,0,0,0.06)',
      padding: '5px 8px', overflow: 'hidden',
      borderLeft: `3px solid ${channelColor}`,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {appt.className}
        </span>
        {appt.kind === 'trial' && (
          <span style={{
            fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
            background: 'var(--accent-subtle)', color: 'var(--text-secondary)',
            padding: '1px 5px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
          }}>
            Trial
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{appt.contactName}</div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{formatTime(start)}</div>
    </div>
  )
}

function DayColumn({ dayIndex, date, appointments }: { dayIndex: number; date: Date; appointments: Appointment[] }) {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const isToday = new Date().toDateString() === date.toDateString()
  return (
    <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border)' }}>
      <div style={{
        height: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderBottom: '1px solid var(--border)',
        background: isToday ? 'var(--accent-subtle)' : 'transparent',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>{DAYS[dayIndex]}</div>
        <div style={{
          fontSize: 18, fontWeight: isToday ? 700 : 400, letterSpacing: '-0.02em',
          color: isToday ? 'var(--text-primary)' : 'var(--text-secondary)',
          lineHeight: 1.2,
        }}>
          {date.getDate()}
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        {HOURS.map((h, idx) => (
          <div
            key={h}
            onMouseEnter={() => setHoveredSlot(idx)}
            onMouseLeave={() => setHoveredSlot(null)}
            style={{
              height: SLOT_HEIGHT, borderBottom: '1px solid var(--border)',
              background: hoveredSlot === idx ? 'var(--accent-subtle)' : 'transparent',
              transition: 'background var(--duration-fast)',
            }}
          />
        ))}
        {appointments.map(appt => {
          const startHour = new Date(appt.startsAt).getHours()
          const top = (startHour - DAY_START_HOUR) * SLOT_HEIGHT
          return (
            <div key={appt._id} style={{ position: 'absolute', top, left: 0, right: 0, height: SLOT_HEIGHT * 2 }}>
              <AppointmentBlock appt={appt} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatWeekLabel(dates: Date[]) {
  const start = dates[0]
  const month = start.toLocaleString('default', { month: 'short' })
  return `${month} ${start.getFullYear()}`
}

function isWithinDisplayHours(appt: Appointment) {
  const h = new Date(appt.startsAt).getHours()
  return h >= DAY_START_HOUR && h < DAY_END_HOUR
}

function appointmentsForDate(appointments: Appointment[], date: Date) {
  return appointments.filter(a =>
    new Date(a.startsAt).toDateString() === date.toDateString() && isWithinDisplayHours(a),
  )
}

function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/appointments?workspaceId=${WORKSPACE_ID}`)
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        const body: unknown = await res.json()
        const data = (body as { data?: unknown[] })?.data
        if (!Array.isArray(data)) throw new Error('Unexpected response shape')
        if (!isCancelled) setAppointments(data.filter(isValidAppointment))
      } catch {
        if (!isCancelled) setHasError(true)
      }
    }
    load()
    return () => { isCancelled = true }
  }, [])

  return { appointments, hasError }
}

export function AppointmentsView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const { appointments, hasError } = useAppointments()
  const dates = getWeekDates(weekOffset)

  return (
    <div style={{ padding: '28px 32px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Appointments</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', minWidth: 80, textAlign: 'center' }}>
              {formatWeekLabel(dates)}
            </span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--accent)', color: 'var(--text-inverse)',
            border: 'none', borderRadius: 'var(--radius)', padding: '7px 14px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            <Plus size={14} /> New Appointment
          </button>
        </div>
      </div>

      {hasError && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
          Could not load appointments
        </div>
      )}

      <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 60, flexShrink: 0 }}>
            <div style={{ height: 56, borderBottom: '1px solid var(--border)' }} />
            {HOURS.map(h => (
              <div key={h} style={{ height: SLOT_HEIGHT, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 10, paddingTop: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>{formatHour(h)}</span>
              </div>
            ))}
          </div>
          {dates.map((date, i) => (
            <DayColumn
              key={date.toISOString()}
              dayIndex={i}
              date={date}
              appointments={appointmentsForDate(appointments, date)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
