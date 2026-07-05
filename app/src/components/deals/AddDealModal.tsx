'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type DealChannel = 'whatsapp' | 'instagram' | 'line'

export interface Deal {
  _id: string
  workspaceId: string
  contactId: string | null
  name: string
  contactName: string
  value: number
  currency: string
  stage: DealStage
  channel: string
  createdAt: string
  updatedAt: string
}

export interface NewDealInput {
  name: string
  contactName: string
  value: number
  channel: DealChannel
  stage: DealStage
}

export const STAGE_OPTIONS: { id: DealStage; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
]

const CHANNEL_OPTIONS: DealChannel[] = ['whatsapp', 'instagram', 'line']

interface FieldErrors {
  name?: string
  contactName?: string
  value?: string
}

function validate(name: string, contactName: string, value: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!name.trim()) errors.name = 'Name is required'
  if (!contactName.trim()) errors.contactName = 'Contact name is required'
  const numValue = Number(value)
  if (value.trim() === '' || Number.isNaN(numValue)) errors.value = 'Value must be a number'
  else if (numValue < 0) errors.value = 'Value must be 0 or more'
  return errors
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: 'var(--text-secondary)', marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', boxSizing: 'border-box',
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none',
}

const errorStyle: React.CSSProperties = { fontSize: 11, color: '#DC2626', marginTop: 3 }

interface AddDealModalProps {
  initialStage: DealStage
  isSubmitting: boolean
  onSubmit: (input: NewDealInput) => void
  onClose: () => void
}

export function AddDealModal({ initialStage, isSubmitting, onSubmit, onClose }: AddDealModalProps) {
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [value, setValue] = useState('')
  const [channel, setChannel] = useState<DealChannel>('whatsapp')
  const [stage, setStage] = useState<DealStage>(initialStage)
  const [errors, setErrors] = useState<FieldErrors>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validate(name, contactName, value)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit({ name: name.trim(), contactName: contactName.trim(), value: Number(value), channel, stage })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, background: 'var(--card)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Add Deal
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--text-tertiary)', padding: 4, display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle} htmlFor="deal-name">Name</label>
            <input id="deal-name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Yoga Package 10x" />
            {errors.name && <div style={errorStyle}>{errors.name}</div>}
          </div>
          <div>
            <label style={labelStyle} htmlFor="deal-contact">Contact name</label>
            <input id="deal-contact" value={contactName} onChange={e => setContactName(e.target.value)} style={inputStyle} placeholder="e.g. Mia Tanaka" />
            {errors.contactName && <div style={errorStyle}>{errors.contactName}</div>}
          </div>
          <div>
            <label style={labelStyle} htmlFor="deal-value">Value (THB)</label>
            <input id="deal-value" type="number" min={0} value={value} onChange={e => setValue(e.target.value)} style={inputStyle} placeholder="0" />
            {errors.value && <div style={errorStyle}>{errors.value}</div>}
          </div>
          <div>
            <label style={labelStyle} htmlFor="deal-channel">Channel</label>
            <select id="deal-channel" value={channel} onChange={e => setChannel(e.target.value as DealChannel)} style={inputStyle}>
              {CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="deal-stage">Stage</label>
            <select id="deal-stage" value={stage} onChange={e => setStage(e.target.value as DealStage)} style={inputStyle}>
              {STAGE_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: 4, background: 'var(--accent)', color: '#FFFFFF',
              border: 'none', borderRadius: 'var(--radius)', padding: '9px 14px',
              fontSize: 13, fontWeight: 500, cursor: isSubmitting ? 'default' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1, letterSpacing: '-0.01em',
            }}
          >
            {isSubmitting ? 'Adding…' : 'Add Deal'}
          </button>
        </form>
      </div>
    </div>
  )
}
