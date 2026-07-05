'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Plus,
  MessageSquare,
  Clock,
  GitBranch,
  LogOut,
  Trash2,
  GripVertical,
  ChevronDown,
} from 'lucide-react'
import type { FlowNode } from '@/lib/campaign-engine'
import type { LifecycleStage } from '@/types'

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'inquiry', 'qualified', 'trial_booked', 'attended', 'reviewed', 'rebooked', 'vip',
]

const NODE_META = {
  message: { icon: MessageSquare, label: 'Send message',   color: '#2563EB' },
  wait:    { icon: Clock,         label: 'Wait',            color: '#7C3AED' },
  branch:  { icon: GitBranch,     label: 'Branch',          color: '#D97706' },
  exit:    { icon: LogOut,        label: 'Exit flow',       color: '#6B7280' },
} as const

interface Props {
  campaign?: { id?: string; name: string; trigger_stage: string | null; flow: unknown[] }
  onSave: (campaign: any) => void
  onCancel: () => void
}

export function FlowBuilder({ campaign, onSave, onCancel }: Props) {
  const [name, setName] = useState(campaign?.name ?? '')
  const [triggerStage, setTriggerStage] = useState<LifecycleStage | ''>(
    (campaign?.trigger_stage as LifecycleStage) ?? '',
  )
  const [nodes, setNodes] = useState<FlowNode[]>((campaign?.flow as FlowNode[]) ?? [])
  const [saving, setSaving] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)

  function addNode(type: FlowNode['type']) {
    let node: FlowNode
    switch (type) {
      case 'message':
        node = { type: 'message', content: '' }
        break
      case 'wait':
        node = { type: 'wait', delayMs: 3600000 } // 1h default
        break
      case 'branch':
        node = {
          type: 'branch',
          condition: { field: 'lifecycle_stage', equals: 'attended' },
          trueIndex: nodes.length + 1,
          falseIndex: nodes.length + 2,
        }
        break
      case 'exit':
        node = { type: 'exit' }
        break
    }
    setNodes((prev) => [...prev, node])
    setShowAddMenu(false)
  }

  function updateNode(index: number, updated: FlowNode) {
    setNodes((prev) => prev.map((n, i) => (i === index ? updated : n)))
  }

  function removeNode(index: number) {
    setNodes((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const body = {
        workspaceId: 'ws-1', // TODO: from auth context
        name,
        triggerStage: triggerStage || undefined,
        flow: nodes,
      }
      const res = campaign?.id
        ? await fetch(`/api/campaigns/${campaign.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      const { data } = await res.json()
      onSave(data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onCancel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 13,
            padding: '6px 8px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Campaign name"
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        />

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          style={{
            padding: '7px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: name.trim() ? 'var(--accent)' : 'var(--border)',
            color: name.trim() ? 'var(--text-inverse)' : 'var(--text-tertiary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: name.trim() ? 'pointer' : 'default',
          }}
        >
          {saving ? 'Saving…' : 'Save campaign'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 0 }}>
        {/* Flow canvas */}
        <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Trigger */}
          <TriggerBlock stage={triggerStage} onChange={setTriggerStage} />

          {nodes.length > 0 && <Connector />}

          {/* Nodes */}
          {nodes.map((node, i) => (
            <div key={i} style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <FlowNodeCard
                node={node}
                index={i}
                total={nodes.length}
                onChange={(updated) => updateNode(i, updated)}
                onRemove={() => removeNode(i)}
              />
              {i < nodes.length - 1 && <Connector />}
            </div>
          ))}

          {/* Add node */}
          <div style={{ marginTop: 16, position: 'relative' }}>
            <button
              onClick={() => setShowAddMenu((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 99,
                border: '1.5px dashed var(--border-strong)',
                background: 'var(--card)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'border-color var(--duration-fast), color var(--duration-fast)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--text-secondary)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <Plus size={14} />
              Add step
            </button>

            {showAddMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: 6,
                  zIndex: 50,
                  minWidth: 180,
                }}
              >
                {(Object.keys(NODE_META) as FlowNode['type'][]).map((type) => {
                  const { icon: Icon, label, color } = NODE_META[type]
                  return (
                    <button
                      key={type}
                      onClick={() => addNode(type)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        transition: 'background var(--duration-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Icon size={15} color={color} />
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TriggerBlock({
  stage,
  onChange,
}: {
  stage: LifecycleStage | ''
  onChange: (s: LifecycleStage | '') => void
}) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 520,
        background: 'var(--card)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 18px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        Trigger
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            background: '#059669' + '18',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={14} color="#059669" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Contact reaches stage</div>
        </div>
        <select
          value={stage}
          onChange={(e) => onChange(e.target.value as LifecycleStage | '')}
          style={{
            marginLeft: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 8px',
            fontSize: 12,
            color: 'var(--text-primary)',
            background: 'var(--bg)',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">Manual only</option>
          {LIFECYCLE_STAGES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function Zap({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function Connector() {
  return (
    <div
      style={{
        width: 1.5,
        height: 24,
        background: 'var(--border-strong)',
        margin: '0 auto',
      }}
    />
  )
}

function FlowNodeCard({
  node,
  index,
  total,
  onChange,
  onRemove,
}: {
  node: FlowNode
  index: number
  total: number
  onChange: (n: FlowNode) => void
  onRemove: () => void
}) {
  const meta = NODE_META[node.type]
  const Icon = meta.icon

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 520,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {/* Node header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: node.type !== 'exit' ? '1px solid var(--border)' : 'none',
          background: 'var(--sidebar)',
        }}
      >
        <GripVertical size={13} color="var(--text-tertiary)" style={{ cursor: 'grab' }} />
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: meta.color + '18',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={13} color={meta.color} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', flex: 1 }}>
          {meta.label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Step {index + 1}</span>
        <button
          onClick={onRemove}
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Node body */}
      {node.type === 'message' && (
        <div style={{ padding: '12px 14px' }}>
          <textarea
            value={node.content}
            onChange={(e) => onChange({ ...node, content: e.target.value })}
            placeholder="Message text…"
            rows={3}
            style={{
              width: '100%',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 10px',
              fontSize: 13,
              color: 'var(--text-primary)',
              background: 'var(--bg)',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
        </div>
      )}

      {node.type === 'wait' && (
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Wait</span>
          <input
            type="number"
            min={1}
            value={Math.round(node.delayMs / 3600000)}
            onChange={(e) => onChange({ ...node, delayMs: Number(e.target.value) * 3600000 })}
            style={{
              width: 64,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 8px',
              fontSize: 13,
              outline: 'none',
              background: 'var(--bg)',
              textAlign: 'center',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>hours before next step</span>
        </div>
      )}

      {node.type === 'branch' && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            If contact&apos;s lifecycle stage equals:
          </div>
          <select
            value={node.condition.equals}
            onChange={(e) =>
              onChange({
                ...node,
                condition: { ...node.condition, equals: e.target.value as LifecycleStage },
              })
            }
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 8px',
              fontSize: 13,
              outline: 'none',
              background: 'var(--bg)',
              color: 'var(--text-primary)',
            }}
          >
            {LIFECYCLE_STAGES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
            <span>True → step {node.trueIndex + 1}</span>
            <span>False → step {node.falseIndex + 1}</span>
          </div>
        </div>
      )}
    </div>
  )
}
