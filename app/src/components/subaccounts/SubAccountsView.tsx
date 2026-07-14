'use client'

import { useEffect, useState } from 'react'
import { Search, Users2 } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  createdAt?: string
}

export function SubAccountsView() {
  const [search, setSearch] = useState('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agencies/agency-1/workspaces')
      .then((response) => response.json())
      .then((body) => setWorkspaces(body.data ?? []))
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = workspaces.filter((workspace) => workspace.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: '28px 32px', background: 'var(--bg)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 20px' }}>Workspaces</h1>
      <div style={{ position: 'relative', maxWidth: 320, marginBottom: 20 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workspaces..." style={{ width: '100%', padding: '7px 10px 7px 32px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users2 size={22} color="var(--text-tertiary)" /></div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>No workspaces found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 860 }}>
          {filtered.map((workspace) => (
            <div key={workspace.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{workspace.name.charAt(0)}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{workspace.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{workspace.slug}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
