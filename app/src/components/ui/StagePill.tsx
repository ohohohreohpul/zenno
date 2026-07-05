import type { LifecycleStage } from '@/types'

const STAGE_META: Record<LifecycleStage, { label: string; color: string }> = {
  inquiry:      { label: 'Inquiry',      color: 'var(--stage-inquiry)' },
  qualified:    { label: 'Qualified',    color: 'var(--stage-qualified)' },
  trial_booked: { label: 'Trial Booked', color: 'var(--stage-trial-booked)' },
  attended:     { label: 'Attended',     color: 'var(--stage-attended)' },
  reviewed:     { label: 'Reviewed',     color: 'var(--stage-reviewed)' },
  rebooked:     { label: 'Rebooked',     color: 'var(--stage-rebooked)' },
  vip:          { label: 'VIP',          color: 'var(--stage-vip)' },
}

export function StagePill({ stage }: { stage: LifecycleStage }) {
  const meta = STAGE_META[stage] ?? { label: stage, color: '#6B7280' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.01em',
        color: meta.color,
        background: `${meta.color}14`,
        borderRadius: 99,
        padding: '3px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  )
}
