'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, Sparkles, Target, Users } from 'lucide-react'
import type { LifecycleStage } from '@/types'

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'inquiry', 'qualified', 'trial_booked', 'attended', 'reviewed', 'rebooked', 'vip',
]

const GOAL_IDEAS = [
  'Win back leads who went quiet. Remind them why they were interested and invite them to book this week.',
  'Re-engage past customers with a relevant offer and get them booked again.',
  'Follow up with qualified leads who did not buy. Handle objections and offer the best next step.',
]

interface Audience {
  stages: LifecycleStage[]
  tags: string[]
  inactiveDays: number | null
  lostOnly: boolean
  contactIds: string[]
  resumeBot: boolean
}

interface ContactOption {
  id: string
  name: string | null
  lifecycle_stage: LifecycleStage
  channel: string
  tags: string[]
  dnd: boolean
}

export interface CampaignFormValue {
  id: string
  name: string
  campaignType: 'manual' | 'triggered'
  triggerStage: LifecycleStage | null
  audience: Audience
  followUpDelaysDays: number[]
  goal: string
  flow: unknown[]
}

interface Props {
  campaign?: Partial<CampaignFormValue>
  onSave: (campaign: CampaignFormValue) => void
  onCancel: () => void
}

const EMPTY_AUDIENCE: Audience = {
  stages: [], tags: [], inactiveDays: 30, lostOnly: false, contactIds: [], resumeBot: true,
}

export function CampaignBuilder({ campaign, onSave, onCancel }: Props) {
  const [name, setName] = useState(campaign?.name ?? '')
  const [campaignType, setCampaignType] = useState<'manual' | 'triggered'>(campaign?.campaignType ?? 'manual')
  const [triggerStage, setTriggerStage] = useState<LifecycleStage | ''>(campaign?.triggerStage ?? '')
  const [audience, setAudience] = useState<Audience>({ ...EMPTY_AUDIENCE, ...campaign?.audience })
  const [goal, setGoal] = useState(campaign?.goal ?? '')
  const [fallbackMessage, setFallbackMessage] = useState(() => {
    const node = campaign?.flow?.find((item): item is { type: string; content: string } => (
      typeof item === 'object' && item !== null && 'type' in item && 'content' in item && item.type === 'message'
    ))
    return node?.content ?? ''
  })
  const [followUps, setFollowUps] = useState<number[]>(campaign?.followUpDelaysDays ?? [])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [tagText, setTagText] = useState(audience.tags.join(', '))
  const [showContacts, setShowContacts] = useState(false)
  const [preview, setPreview] = useState<{ count: number; names: string[] } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/contacts?workspaceId=ws-1').then((r) => r.json()).then((body) => setContacts(body.data ?? [])).catch(() => undefined)
  }, [])

  const parsedTags = useMemo(() => tagText.split(',').map((tag) => tag.trim()).filter(Boolean), [tagText])
  const currentAudience = useMemo(() => ({ ...audience, tags: parsedTags }), [audience, parsedTags])
  const canSave = Boolean(name.trim() && goal.trim() && (campaignType === 'manual' || triggerStage))

  function toggleStage(stage: LifecycleStage) {
    setAudience((current) => ({
      ...current,
      stages: current.stages.includes(stage) ? current.stages.filter((item) => item !== stage) : [...current.stages, stage],
    }))
    setPreview(null)
  }

  function toggleContact(id: string) {
    setAudience((current) => ({
      ...current,
      contactIds: current.contactIds.includes(id) ? current.contactIds.filter((item) => item !== id) : [...current.contactIds, id],
    }))
    setPreview(null)
  }

  async function previewAudience() {
    setPreviewing(true)
    setError(null)
    try {
      const response = await fetch('/api/campaigns/audience', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'ws-1', ...currentAudience }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Could not preview audience')
      setPreview({ count: body.data.count, names: body.data.contacts.map((item: { name?: string }) => item.name ?? 'Unknown') })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not preview audience')
    } finally {
      setPreviewing(false)
    }
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        workspaceId: 'ws-1', name: name.trim(), campaignType,
        triggerStage: campaignType === 'triggered' ? triggerStage : null,
        audience: currentAudience, followUpDelaysDays: followUps, goal: goal.trim(),
        flow: fallbackMessage.trim() ? [{ type: 'message', content: fallbackMessage.trim() }] : [],
      }
      const response = await fetch(campaign?.id ? `/api/campaigns/${campaign.id}` : '/api/campaigns', {
        method: campaign?.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Save failed')
      onSave(data.data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--card)', gap: 12, flexShrink: 0 }}>
        <button onClick={onCancel} style={ghostButton}><ArrowLeft size={15} /> Back</button>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Campaign name" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }} />
        <button onClick={handleSave} disabled={!canSave || saving} style={{ ...primaryButton, opacity: canSave ? 1 : 0.45 }}>{saving ? 'Saving…' : 'Save campaign'}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '30px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 650, display: 'flex', flexDirection: 'column', gap: 26 }}>
          <Section icon={<Target size={14} />} label="How should this campaign start?" help="Launch it yourself for reactivation and outreach, or trigger it automatically when a lead reaches a stage.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Choice active={campaignType === 'manual'} title="Launch manually" detail="You choose when to contact the saved audience." onClick={() => setCampaignType('manual')} />
              <Choice active={campaignType === 'triggered'} title="Stage trigger" detail="Starts when a lead moves into a stage." onClick={() => setCampaignType('triggered')} />
            </div>
            {campaignType === 'triggered' && <select value={triggerStage} onChange={(event) => setTriggerStage(event.target.value as LifecycleStage | '')} style={{ ...fieldStyle, marginTop: 10 }}><option value="">Select a stage…</option>{LIFECYCLE_STAGES.map((stage) => <option key={stage} value={stage}>{stage.replace('_', ' ')}</option>)}</select>}
          </Section>

          {campaignType === 'manual' && (
            <Section icon={<Users size={14} />} label="Who should receive it?" help="Filters are combined. Do-not-contact leads are always excluded; the final audience is recalculated when you press Run now.">
              <div style={fieldLabel}>Lifecycle stage <span style={optional}>optional</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {LIFECYCLE_STAGES.map((stage) => <Chip key={stage} active={audience.stages.includes(stage)} onClick={() => toggleStage(stage)}>{stage.replace('_', ' ')}</Chip>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                <label><div style={fieldLabel}>Inactive for at least</div><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><input type="number" min={1} max={3650} value={audience.inactiveDays ?? ''} onChange={(event) => { setAudience((current) => ({ ...current, inactiveDays: event.target.value ? Number(event.target.value) : null })); setPreview(null) }} placeholder="Any" style={fieldStyle} /><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>days</span></div></label>
                <label><div style={fieldLabel}>Tags <span style={optional}>comma separated</span></div><input value={tagText} onChange={(event) => { setTagText(event.target.value); setPreview(null) }} placeholder="old lead, retreat" style={fieldStyle} /></label>
              </div>
              <label style={checkRow}><input type="checkbox" checked={audience.lostOnly} onChange={(event) => { setAudience((current) => ({ ...current, lostOnly: event.target.checked })); setPreview(null) }} /> Only leads with a lost deal</label>
              <button onClick={() => setShowContacts((current) => !current)} style={{ ...ghostButton, marginTop: 7 }}>{audience.contactIds.length ? `${audience.contactIds.length} specifically selected` : 'Select specific contacts (optional)'}</button>
              {showContacts && <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: 8 }}>{contacts.filter((contact) => !contact.dnd).map((contact) => <label key={contact.id} style={{ ...checkRow, padding: '8px 10px', borderBottom: '1px solid var(--border)', margin: 0 }}><input type="checkbox" checked={audience.contactIds.includes(contact.id)} onChange={() => toggleContact(contact.id)} /><span style={{ flex: 1 }}>{contact.name ?? contact.id}</span><span style={optional}>{contact.lifecycle_stage.replace('_', ' ')} · {contact.channel}</span></label>)}</div>}
              <label style={checkRow}><input type="checkbox" checked={audience.resumeBot} onChange={(event) => setAudience((current) => ({ ...current, resumeBot: event.target.checked }))} /> Turn the AI receptionist back on for selected leads</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}><button onClick={previewAudience} disabled={previewing} style={secondaryButton}>{previewing ? 'Checking…' : 'Preview audience'}</button>{preview && <span style={{ fontSize: 12.5, color: preview.count ? 'var(--text-primary)' : '#B45309' }}><strong>{preview.count}</strong> eligible contact{preview.count === 1 ? '' : 's'}{preview.names.length > 0 ? ` · ${preview.names.slice(0, 3).join(', ')}` : ''}</span>}</div>
            </Section>
          )}

          <Section icon={<Sparkles size={14} />} label="What should the AI accomplish?" help="Give the agent a sales brief. It writes a personal message using each lead's history and continues the conversation after they reply.">
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={5} placeholder="e.g. Win back leads who went quiet and invite them to book this week. Keep it warm and low-pressure." style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{GOAL_IDEAS.map((idea) => <button key={idea} onClick={() => setGoal(idea)} style={chipStyle}>{idea.slice(0, 46)}…</button>)}</div>
            <div style={{ ...fieldLabel, marginTop: 14 }}>Fallback opening message <span style={optional}>optional</span></div>
            <textarea value={fallbackMessage} onChange={(event) => setFallbackMessage(event.target.value)} rows={2} placeholder="Used only if the AI provider is unavailable." style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </Section>

          <Section icon={<Clock3 size={14} />} label="Automatic follow-ups" help="Add up to three follow-ups. They are cancelled automatically as soon as the lead replies or is marked do-not-contact.">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{followUps.map((days, index) => <label key={index} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}><span>Follow up after</span><input type="number" min={1} max={90} value={days} onChange={(event) => setFollowUps((current) => current.map((value, itemIndex) => itemIndex === index ? Math.max(1, Number(event.target.value)) : value))} style={{ ...fieldStyle, width: 64 }} /><span>days</span><button onClick={() => setFollowUps((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={{ ...ghostButton, padding: 4 }}>×</button></label>)}{followUps.length < 3 && <button onClick={() => setFollowUps((current) => [...current, current.length ? current[current.length - 1] + 2 : 2])} style={secondaryButton}>+ Add follow-up</button>}</div>
          </Section>

          {error && <div style={{ fontSize: 13, color: '#B91C1C' }}>{error}</div>}
          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', background: 'var(--accent-subtle)', borderRadius: 'var(--radius)', padding: '12px 14px', lineHeight: 1.5 }}>Nothing sends when you save. Manual campaigns send only after you press <strong>Run now</strong>; messages are paced by the channel&apos;s warm-up and business-hour limits.</div>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, label, help, children }: { icon: React.ReactNode; label: string; help: string; children: React.ReactNode }) {
  return <section><div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}><span style={{ color: 'var(--text-secondary)' }}>{icon}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span></div><div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.5 }}>{help}</div>{children}</section>
}

function Choice({ active, title, detail, onClick }: { active: boolean; title: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} style={{ textAlign: 'left', padding: '12px', borderRadius: 'var(--radius-sm)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-subtle)' : 'var(--card)', cursor: 'pointer' }}><div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div><div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 3, lineHeight: 1.4 }}>{detail}</div></button>
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ ...chipStyle, borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent-subtle)' : 'var(--card)', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{children}</button>
}

const fieldStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', fontSize: 13, color: 'var(--text-primary)', background: 'var(--card)', outline: 'none' }
const fieldLabel: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }
const optional: React.CSSProperties = { fontSize: 10.5, fontWeight: 400, color: 'var(--text-tertiary)' }
const checkRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 12, cursor: 'pointer' }
const ghostButton: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12.5, padding: '6px 8px', borderRadius: 'var(--radius-sm)' }
const primaryButton: React.CSSProperties = { padding: '7px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: 'var(--text-inverse)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { padding: '7px 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }
const chipStyle: React.CSSProperties = { padding: '5px 9px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-secondary)', fontSize: 11.5, cursor: 'pointer' }
