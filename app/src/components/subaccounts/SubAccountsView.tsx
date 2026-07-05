'use client'

import { useState } from 'react'
import { Plus, Search, Users2 } from 'lucide-react'

interface SubAccount {
  id: string
  name: string
  plan: 'Starter' | 'Growth' | 'Pro'
  contacts: number
  status: 'Active' | 'Inactive'
  created: string
}

const ACCOUNTS: SubAccount[] = [
  { id: '1', name: 'Lotus Yoga Bangkok', plan: 'Starter', contacts: 6, status: 'Active', created: 'Jun 2026' },
  { id: '2', name: 'Serene Spa Sukhumvit', plan: 'Growth', contacts: 12, status: 'Active', created: 'May 2026' },
]

const PLAN_STYLES = {
  Starter: { bg: 'rgba(107,114,128,0.1)', color: '#4b5563' },
  Growth: { bg: 'rgba(37,99,235,0.08)', color: '#1d4ed8' },
  Pro: { bg: 'rgba(124,58,237,0.08)', color: '#6d28d9' },
}

function PlanBadge({ plan }: { plan: SubAccount['plan'] }) {
  const s = PLAN_STYLES[plan]
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 8px',
      borderRadius: 'var(--radius-sm)', background: s.bg, color: s.color,
      letterSpacing: '0.01em',
    }}>
      {plan}
    </span>
  )
}

function AccountCard({ account }: { account: SubAccount }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: hovered ? 'var(--shadow)' : 'var(--shadow-sm)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'box-shadow var(--duration-fast) var(--ease-out-expo)',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius)',
        background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {account.name.charAt(0)}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 4 }}>
          {account.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlanBadge plan={account.plan} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{account.contacts} contacts</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Created {account.created}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a' }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active</span>
        </div>
        <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
        <button style={{
          border: '1px solid var(--border)', background: 'transparent',
          borderRadius: 'var(--radius-sm)', padding: '5px 12px',
          fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer',
        }}>
          Manage
        </button>
        <button style={{
          border: 'none', background: 'var(--accent)',
          borderRadius: 'var(--radius-sm)', padding: '5px 12px',
          fontSize: 12, fontWeight: 500, color: 'var(--text-inverse)', cursor: 'pointer',
        }}>
          Login
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 12 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius)',
        background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Users2 size={22} color="var(--text-tertiary)" />
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>No sub accounts yet</p>
      <button style={{
        background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none',
        borderRadius: 'var(--radius)', padding: '8px 16px',
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
      }}>
        Create Sub Account
      </button>
    </div>
  )
}

export function SubAccountsView() {
  const [search, setSearch] = useState('')
  const filtered = ACCOUNTS.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: '28px 32px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Sub Accounts</h1>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--accent)', color: 'var(--text-inverse)',
          border: 'none', borderRadius: 'var(--radius)', padding: '7px 14px',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>
          <Plus size={14} /> Add Account
        </button>
      </div>

      <div style={{ position: 'relative', maxWidth: 320, marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search accounts..."
          style={{
            width: '100%', padding: '7px 10px 7px 32px',
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 860 }}>
          {filtered.map(a => <AccountCard key={a.id} account={a} />)}
        </div>
      )}
    </div>
  )
}
