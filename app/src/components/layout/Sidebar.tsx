'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  DollarSign,
  CheckSquare,
  FileText,
  Megaphone,
  CalendarDays,
  BarChart2,
  CreditCard,
  Settings,
  Building2,
  Rocket,
  LogOut,
} from 'lucide-react'

const NAV_PRIMARY = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/dashboard/daily-summary', icon: FileText, label: 'Daily Summary' },
  { href: '/dashboard/inbox', icon: MessageSquare, label: 'Chats' },
  { href: '/dashboard/contacts', icon: Users, label: 'Contacts' },
  { href: '/dashboard/deals', icon: DollarSign, label: 'Deals' },
  { href: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/dashboard/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/dashboard/appointments', icon: CalendarDays, label: 'Appointments' },
]

const NAV_SECONDARY = [
  { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  { href: '/dashboard/setup', icon: Rocket, label: 'Setup Wizard' },
]

const NAV_TERTIARY = [
  { href: '/dashboard/sub-accounts', icon: Building2, label: 'Sub Accounts' },
]

const Divider = () => (
  <div style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }} />
)

interface NavLinkProps {
  href: string
  icon: React.ElementType
  label: string
  exact?: boolean
}

function NavLink({ href, icon: Icon, label, exact }: NavLinkProps) {
  const pathname = usePathname()
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        fontSize: 13.5,
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: active ? 'var(--card)' : 'transparent',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
        transition: `background var(--duration-fast) var(--ease-out-expo), color var(--duration-fast) var(--ease-out-expo)`,
      }}
    >
      <Icon size={16} strokeWidth={active ? 2 : 1.75} />
      {label}
    </Link>
  )
}

export function Sidebar() {
  const [credits, setCredits] = useState<number | null>(null)
  const [workspaceName, setWorkspaceName] = useState<string>('')

  useEffect(() => {
    fetch('/api/agency')
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.credits != null) setCredits(d.data.credits)
        if (d.data?.name) setWorkspaceName(d.data.name)
      })
      .catch(() => {})
  }, [])

  const creditsLow = credits != null && credits < 50

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Cookie clearing failed server-side; still send the user to login.
    }
    window.location.href = '/login'
  }

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          {workspaceName || 'Your Agency'}
        </span>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {NAV_PRIMARY.map(({ href, icon, label, exact }) => (
          <NavLink key={href} href={href} icon={icon} label={label} exact={exact} />
        ))}

        <Divider />

        {NAV_SECONDARY.map(({ href, icon, label }) => (
          <NavLink key={href} href={href} icon={icon} label={label} />
        ))}

        <Divider />

        {NAV_TERTIARY.map(({ href, icon, label }) => (
          <NavLink key={href} href={href} icon={icon} label={label} />
        ))}
      </nav>

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
        }}
      >
        {workspaceName && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginBottom: 6,
              fontWeight: 400,
              letterSpacing: '0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {workspaceName}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-tertiary)',
          }}
        >
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>
              Credits
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: creditsLow ? 'var(--stage-reviewed)' : 'var(--text-primary)',
              }}
            >
              {credits != null ? credits.toLocaleString() : '—'}
            </div>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={handleLogout}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 6,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <LogOut size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  )
}
