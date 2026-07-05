'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Search, Settings2, X } from 'lucide-react'
import { AddDealModal, Deal, DealStage, NewDealInput } from './AddDealModal'

const WORKSPACE_ID = 'ws-1'
const TOAST_DURATION_MS = 3000
const WON_BORDER = '3px solid #059669'

const STAGE_COLUMNS: { id: DealStage; label: string; color: string }[] = [
  { id: 'lead', label: 'Lead', color: '#6B7280' },
  { id: 'qualified', label: 'Qualified', color: '#2563EB' },
  { id: 'proposal', label: 'Proposal', color: '#7C3AED' },
  { id: 'negotiation', label: 'Negotiation', color: '#D97706' },
  { id: 'won', label: 'Won', color: '#059669' },
  { id: 'lost', label: 'Lost', color: '#DC2626' },
]

function formatBaht(value: number): string {
  return `฿${value.toLocaleString()}`
}

function ChannelBadge({ channel }: { channel: string }) {
  const styles: Record<string, { label: string; bg: string; color: string }> = {
    whatsapp: { label: 'WA', bg: 'rgba(37,211,102,0.1)', color: '#16a34a' },
    instagram: { label: 'IG', bg: 'rgba(225,48,108,0.1)', color: '#be185d' },
    line: { label: 'LINE', bg: 'rgba(6,199,85,0.1)', color: '#059669' },
  }
  const s = styles[channel] ?? { label: channel.toUpperCase(), bg: 'var(--accent-subtle)', color: 'var(--text-secondary)' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 6px',
      borderRadius: 'var(--radius-sm)', background: s.bg, color: s.color,
      letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  )
}

interface DealCardProps {
  deal: Deal
  onDelete: (id: string) => void
}

function DealCard({ deal, onDelete }: DealCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isWon = deal.stage === 'won'
  const isLost = deal.stage === 'lost'
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', deal._id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--card)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        borderLeft: isWon ? WON_BORDER : '1px solid var(--border)',
        opacity: isLost ? 0.6 : 1,
        boxShadow: isHovered ? 'var(--shadow)' : 'var(--shadow-sm)',
        padding: '10px 12px', cursor: 'grab',
        transition: 'box-shadow var(--duration-fast) var(--ease-out-expo)',
      }}
    >
      {isHovered && (
        <button
          onClick={() => onDelete(deal._id)}
          aria-label={`Delete ${deal.name}`}
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 18, height: 18, borderRadius: 'var(--radius-sm)',
            border: 'none', background: 'var(--accent-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0,
          }}
        >
          <X size={11} />
        </button>
      )}
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em', paddingRight: 16 }}>
        {deal.name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>{deal.contactName}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {formatBaht(deal.value)}
        </span>
        <ChannelBadge channel={deal.channel} />
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  stage: DealStage
  label: string
  color: string
  deals: Deal[]
  isDragOver: boolean
  onDragOverChange: (stage: DealStage | null) => void
  onDropDeal: (dealId: string, stage: DealStage) => void
  onAddClick: (stage: DealStage) => void
  onDelete: (id: string) => void
}

function KanbanColumn({ stage, label, color, deals, isDragOver, onDragOverChange, onDropDeal, onAddClick, onDelete }: KanbanColumnProps) {
  const total = deals.reduce((sum, d) => sum + d.value, 0)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOverChange(null)
    const dealId = e.dataTransfer.getData('text/plain')
    if (dealId) onDropDeal(dealId, stage)
  }
  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOverChange(stage) }}
      onDragLeave={() => onDragOverChange(null)}
      onDrop={handleDrop}
      style={{
        minWidth: 220, maxWidth: 220, display: 'flex', flexDirection: 'column',
        borderRadius: 'var(--radius)', padding: 4,
        background: isDragOver ? 'var(--accent-subtle)' : 'transparent',
        border: isDragOver ? '1px dashed var(--text-tertiary)' : '1px dashed transparent',
        transition: 'background var(--duration-fast) var(--ease-out-expo)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{label}</span>
            <span style={{
              fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)',
              background: 'var(--accent-subtle)', borderRadius: 'var(--radius-sm)',
              padding: '1px 6px',
            }}>
              {deals.length}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3, paddingLeft: 14 }}>
            {formatBaht(total)}
          </div>
        </div>
        <button
          onClick={() => onAddClick(stage)}
          aria-label={`Add deal to ${label}`}
          style={{
            width: 24, height: 24, borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-tertiary)',
          }}
        >
          <Plus size={13} />
        </button>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        overflowY: 'auto', maxHeight: 'calc(100vh - 220px)',
        paddingBottom: 8, minHeight: 60,
      }}>
        {deals.map(d => <DealCard key={d._id} deal={d} onDelete={onDelete} />)}
        {deals.length === 0 && (
          <div style={{
            border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
            padding: '24px 12px', textAlign: 'center',
            color: 'var(--text-tertiary)', fontSize: 12,
          }}>
            No deals
          </div>
        )}
      </div>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--accent)', color: '#FFFFFF', fontSize: 13,
      padding: '8px 16px', borderRadius: 999, boxShadow: 'var(--shadow-lg)', zIndex: 200,
    }}>
      {message}
    </div>
  )
}

export function DealsView() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [modalStage, setModalStage] = useState<DealStage | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS)
  }, [])

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/deals?workspaceId=${WORKSPACE_ID}`)
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const json: { data: Deal[] } = await res.json()
        if (!isCancelled) setDeals(json.data)
      } catch {
        if (!isCancelled) showToast('Failed to load deals')
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }
    load()
    return () => { isCancelled = true }
  }, [showToast])

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const moveDeal = useCallback(async (dealId: string, stage: DealStage) => {
    const previous = deals
    const deal = previous.find(d => d._id === dealId)
    if (!deal || deal.stage === stage) return
    setDeals(previous.map(d => (d._id === dealId ? { ...d, stage } : d)))
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
    } catch {
      setDeals(previous)
      showToast('Failed to move deal')
    }
  }, [deals, showToast])

  const deleteDeal = useCallback(async (dealId: string) => {
    const previous = deals
    setDeals(previous.filter(d => d._id !== dealId))
    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
    } catch {
      setDeals(previous)
      showToast('Failed to delete deal')
    }
  }, [deals, showToast])

  const addDeal = useCallback(async (input: NewDealInput) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, workspaceId: WORKSPACE_ID }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const json: { data: Deal } = await res.json()
      setDeals(current => [...current, json.data])
      setModalStage(null)
    } catch {
      showToast('Failed to add deal')
    } finally {
      setIsSubmitting(false)
    }
  }, [showToast])

  const query = search.trim().toLowerCase()
  const visibleDeals = query
    ? deals.filter(d => d.name.toLowerCase().includes(query) || d.contactName.toLowerCase().includes(query))
    : deals

  return (
    <div style={{ padding: '28px 32px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Deals</h1>
        <button
          onClick={() => setModalStage('lead')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--accent)', color: 'var(--text-inverse)',
            border: 'none', borderRadius: 'var(--radius)', padding: '7px 14px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.01em',
          }}
        >
          <Plus size={14} /> Add Deal
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search deals..."
            style={{
              width: '100%', padding: '7px 10px 7px 32px',
              background: 'var(--accent-subtle)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid var(--border)', background: 'transparent',
          borderRadius: 'var(--radius)', padding: '7px 12px',
          fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
        }}>
          <Settings2 size={14} /> Configure Pipeline
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
          Loading deals…
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
          {STAGE_COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              stage={col.id}
              label={col.label}
              color={col.color}
              deals={visibleDeals.filter(d => d.stage === col.id)}
              isDragOver={dragOverStage === col.id}
              onDragOverChange={setDragOverStage}
              onDropDeal={moveDeal}
              onAddClick={setModalStage}
              onDelete={deleteDeal}
            />
          ))}
        </div>
      )}

      {modalStage !== null && (
        <AddDealModal
          initialStage={modalStage}
          isSubmitting={isSubmitting}
          onSubmit={addDeal}
          onClose={() => setModalStage(null)}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  )
}
