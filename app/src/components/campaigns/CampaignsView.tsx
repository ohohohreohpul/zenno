'use client'

import { useEffect, useState } from 'react'
import { Plus, Sparkles, Play } from 'lucide-react'
import { CampaignBuilder, type CampaignFormValue } from './CampaignBuilder'
import { CommentToDmTab } from './CommentToDmTab'
import { BroadcastTab } from './BroadcastTab'

type CampaignTab = 'aiCampaigns' | 'commentToDm' | 'broadcast'

const TAB_LABELS: Record<CampaignTab, string> = {
  aiCampaigns: 'AI Campaigns',
  commentToDm: 'Comment-to-DM',
  broadcast: 'Broadcast',
}

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  campaignType: 'manual' | 'triggered'
  triggerStage: CampaignFormValue['triggerStage']
  audience: CampaignFormValue['audience']
  followUpDelaysDays: number[]
  goal: string
  flow: unknown[]
  createdAt: string
}

function normalizeCampaign(value: Record<string, unknown>): Campaign {
  return {
    id: String(value.id), name: String(value.name ?? 'Untitled campaign'),
    status: (value.status as Campaign['status']) ?? 'draft',
    campaignType: value.campaignType === 'triggered' ? 'triggered' : 'manual',
    triggerStage: (value.triggerStage as CampaignFormValue['triggerStage']) ?? null,
    audience: (value.audience as CampaignFormValue['audience']) ?? { stages: [], tags: [], inactiveDays: null, lostOnly: false, contactIds: [], resumeBot: true },
    followUpDelaysDays: Array.isArray(value.followUpDelaysDays) ? value.followUpDelaysDays as number[] : [],
    goal: String(value.goal ?? ''), flow: Array.isArray(value.flow) ? value.flow : [],
    createdAt: String(value.createdAt ?? new Date().toISOString()),
  }
}

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [activeTab, setActiveTab] = useState<CampaignTab>('aiCampaigns')

  useEffect(() => {
    fetch('/api/campaigns?workspaceId=ws-1')
      .then((r) => r.json())
      .then((d) => setCampaigns((d.data ?? []).map((item: Record<string, unknown>) => normalizeCampaign(item))))
      .finally(() => setLoading(false))
  }, [])

  if (showBuilder || editing) {
    return (
      <CampaignBuilder
        campaign={editing ?? undefined}
        onSave={(saved) => {
          const normalized = { ...normalizeCampaign(saved as unknown as Record<string, unknown>), status: editing?.status ?? 'draft' }
          setCampaigns((prev) =>
            editing
              ? prev.map((c) => (c.id === saved.id ? normalized : c))
              : [normalized, ...prev],
          )
          setEditing(null)
          setShowBuilder(false)
        }}
        onCancel={() => {
          setEditing(null)
          setShowBuilder(false)
        }}
      />
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>
          Campaigns
        </span>
        {activeTab === 'aiCampaigns' && (
          <button
            onClick={() => setShowBuilder(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            New campaign
          </button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 0,
          padding: '0 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
        }}
      >
        {(['aiCampaigns', 'commentToDm', 'broadcast'] as const).map((tab) => {
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '14px 16px',
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {activeTab === 'commentToDm' ? (
          <CommentToDmTab />
        ) : activeTab === 'broadcast' ? (
          <BroadcastTab />
        ) : loading ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
        ) : campaigns.length === 0 ? (
          <EmptyCampaigns onNew={() => setShowBuilder(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onEdit={() => setEditing(c)}
                onStatusChange={(status) => setCampaigns((current) => current.map((item) => item.id === c.id ? { ...item, status } : item))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CampaignCard({ campaign, onEdit, onStatusChange }: { campaign: Campaign; onEdit: () => void; onStatusChange: (status: Campaign['status']) => void }) {
  const [runState, setRunState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [sentCount, setSentCount] = useState(0)

  const statusColor: Record<Campaign['status'], string> = {
    draft: 'var(--text-tertiary)',
    active: 'var(--stage-attended)',
    paused: 'var(--stage-reviewed)',
    completed: 'var(--stage-qualified)',
  }

  async function handleRun(e: React.MouseEvent) {
    e.stopPropagation()
    if (runState === 'running') return
    setRunState('running')
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/run`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Run failed')
      setSentCount(body.data.queued)
      setRunState('done')
      setTimeout(() => setRunState('idle'), 4000)
    } catch {
      setRunState('error')
      setTimeout(() => setRunState('idle'), 3000)
    }
  }

  async function toggleStatus(e: React.MouseEvent) {
    e.stopPropagation()
    const status: Campaign['status'] = campaign.status === 'active' ? 'paused' : 'active'
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) onStatusChange(status)
  }

  const goalPreview = campaign.goal?.trim()
    ? campaign.goal.length > 110
      ? campaign.goal.slice(0, 110) + '…'
      : campaign.goal
    : 'No goal set — add one to make this AI-driven.'

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        cursor: 'pointer',
        transition: 'box-shadow var(--duration-fast)',
      }}
      onClick={onEdit}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Sparkles size={16} color="var(--text-secondary)" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {campaign.name}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.45 }}>
          {goalPreview}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
          {campaign.campaignType === 'triggered' && campaign.triggerStage ? (
            <>fires on <strong style={{ color: 'var(--text-secondary)' }}>{campaign.triggerStage.replace('_', ' ')}</strong></>
          ) : (
            <>manual outreach{campaign.followUpDelaysDays.length ? ` · ${campaign.followUpDelaysDays.length} follow-up${campaign.followUpDelaysDays.length === 1 ? '' : 's'}` : ''}</>
          )}
        </div>
      </div>

      <button
        onClick={handleRun}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 'var(--radius-sm)',
          border: runState === 'done' ? 'none' : '1px solid var(--border)',
          background: runState === 'done' ? 'var(--stage-attended)' : 'transparent',
          color: runState === 'done' ? 'white' : runState === 'error' ? 'var(--stage-vip)' : 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all var(--duration-fast)',
          flexShrink: 0,
        }}
      >
        <Play size={12} />
        {runState === 'running' ? 'Queueing…'
          : runState === 'done' ? `Queued ${sentCount}`
          : runState === 'error' ? 'Failed'
          : 'Run now'}
      </button>

      {campaign.campaignType === 'triggered' && campaign.status !== 'completed' && (
        <button
          onClick={toggleStatus}
          style={{ padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
        >
          {campaign.status === 'active' ? 'Pause auto' : 'Activate auto'}
        </button>
      )}

      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: statusColor[campaign.status],
          textTransform: 'capitalize',
          letterSpacing: '0.02em',
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {campaign.campaignType === 'manual' ? 'manual' : campaign.status}
      </span>
    </div>
  )
}

function EmptyCampaigns({ onNew }: { onNew: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '80px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--accent-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Sparkles size={24} color="var(--text-secondary)" />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
          No campaigns yet
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6, maxWidth: 320 }}>
          Give the AI a sales goal and a trigger stage. It writes a personalized opening message
          for every contact and handles the conversation from there — no flow builder needed.
        </div>
      </div>
      <button
        onClick={onNew}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '9px 18px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'var(--accent)',
          color: 'var(--text-inverse)',
          fontSize: 13.5,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Plus size={14} />
        Create your first campaign
      </button>
    </div>
  )
}
