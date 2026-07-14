'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'

const PACKS = [
  { id: '500', credits: 500, price: '$9', pricePerMsg: '$0.018', popular: false },
  { id: '2000', credits: 2000, price: '$29', pricePerMsg: '$0.0145', popular: true },
  { id: '10000', credits: 10000, price: '$99', pricePerMsg: '$0.0099', popular: false },
]

interface AgencyData {
  id: string
  name: string
  credits: number
  plan: string
}

export function BillingView() {
  const [agency, setAgency] = useState<AgencyData | null>(null)

  useEffect(() => {
    fetch('/api/agency')
      .then((r) => r.json())
      .then((d) => setAgency(d.data))
  }, [])

  const credits = agency?.credits ?? 0
  const usedPct = Math.max(0, Math.min(100, ((500 - credits) / 500) * 100))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Billing</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>

        {/* Current balance */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, display: 'flex', gap: 24, alignItems: 'center' }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: 'var(--radius)',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Zap size={22} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
              Credit Balance
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
                {credits.toLocaleString()}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>credits remaining</span>
            </div>
            <div style={{ marginTop: 10, height: 6, background: 'var(--accent-subtle)', borderRadius: 3, maxWidth: 300 }}>
              <div style={{ height: '100%', width: `${100 - usedPct}%`, background: credits > 100 ? 'var(--stage-attended)' : 'var(--stage-reviewed)', borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
              1 credit = 1 AI message sent
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Plan</div>
            <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{agency?.plan ?? '—'}</div>
          </div>
        </div>

        {/* Credit packs */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 12 }}>Top up credits</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {PACKS.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        </div>

        {/* Usage info */}
        <div style={{ background: 'var(--sidebar)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>How credits work</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'AI reply generated', cost: '1 credit' },
              { label: 'Campaign message sent', cost: '1 credit' },
              { label: 'Manual message (you type)', cost: 'Free' },
              { label: 'Inbound messages received', cost: 'Free' },
            ].map(({ label, cost }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: cost === 'Free' ? 'var(--stage-attended)' : 'var(--text-primary)' }}>{cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PackCard({ pack }: { pack: typeof PACKS[0] }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: pack.popular ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px 18px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        transition: 'box-shadow var(--duration-fast)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      {pack.popular && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent)',
            color: 'white',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '2px 10px',
            borderRadius: 99,
            textTransform: 'uppercase',
          }}
        >
          Best value
        </div>
      )}
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>{pack.credits.toLocaleString()}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>credits</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{pack.price}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{pack.pricePerMsg} per message</div>
      <button
        style={{
          width: '100%',
          padding: '9px',
          border: pack.popular ? 'none' : '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: pack.popular ? 'var(--accent)' : 'transparent',
          color: pack.popular ? 'white' : 'var(--text-primary)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 'auto',
        }}
      >
        Buy {pack.credits.toLocaleString()} credits
      </button>
    </div>
  )
}
