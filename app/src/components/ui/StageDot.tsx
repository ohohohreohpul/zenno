import type { LifecycleStage } from '@/types'

const STAGE_COLORS: Record<LifecycleStage, string> = {
  inquiry:      'var(--stage-inquiry)',
  qualified:    'var(--stage-qualified)',
  trial_booked: 'var(--stage-trial-booked)',
  attended:     'var(--stage-attended)',
  reviewed:     'var(--stage-reviewed)',
  rebooked:     'var(--stage-rebooked)',
  vip:          'var(--stage-vip)',
}

export function StageDot({ stage }: { stage: LifecycleStage }) {
  return (
    <span
      title={stage.replace('_', ' ')}
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: STAGE_COLORS[stage] ?? '#6B7280',
        flexShrink: 0,
      }}
    />
  )
}
