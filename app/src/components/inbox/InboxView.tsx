'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { ConversationList } from './ConversationList'
import { ChatPanel } from './ChatPanel'
import { ContactPanel, patchContact } from './ContactPanel'
import { EmptyState } from './EmptyState'
import type { Contact, Conversation } from '@/types'

const WORKSPACE_ID = 'ws-1'

const TAB_IDS = ['all', 'open', 'closed', 'ai_active', 'ai_paused', 'unread', 'attention'] as const

type TabId = (typeof TAB_IDS)[number]

const TAB_LABELS: Record<TabId, string> = {
  all: 'All',
  open: 'Open',
  closed: 'Closed',
  ai_active: 'AI Active',
  ai_paused: 'AI Paused',
  unread: 'Unread',
  attention: 'Attention Required',
}

const TAB_FILTERS: Record<TabId, (c: Conversation) => boolean> = {
  all: () => true,
  open: (c) => c.contact.chat_status === 'open',
  closed: (c) => c.contact.chat_status === 'closed',
  ai_active: (c) => c.contact.bot_active === true,
  ai_paused: (c) => c.contact.bot_active === false,
  unread: (c) => c.unread_count > 0,
  attention: (c) => c.contact.attention_required === true,
}

const RED_BADGE_TABS: ReadonlySet<TabId> = new Set(['unread', 'attention'])

export function InboxView() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('all')

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?workspaceId=${WORKSPACE_ID}`)
      if (!res.ok) return
      const body = await res.json()
      setConversations(body.data ?? [])
    } catch {
      // keep prior state on network failure
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { void loadConversations() }, 0)
    return () => clearTimeout(timer)
  }, [loadConversations])

  const applyContactUpdate = useCallback((contactId: string, changes: Partial<Contact>) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.contact.id === contactId ? { ...c, contact: { ...c.contact, ...changes } } : c
      )
    )
  }, [])

  const markAsRead = useCallback((contactId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.contact.id === contactId ? { ...c, unread_count: 0 } : c))
    )
    patchContact(contactId, { unread: 0 }).catch(() => {
      // keep optimistic state; badge will resync on next fetch
    })
  }, [])

  const handleSelect = useCallback(
    (contactId: string) => {
      setSelectedContactId(contactId)
      const target = conversations.find((c) => c.contact.id === contactId)
      if (target && target.unread_count > 0) markAsRead(contactId)
    },
    [conversations, markAsRead]
  )

  const counts = useMemo(() => computeTabCounts(conversations), [conversations])
  const filtered = useMemo(
    () => conversations.filter(TAB_FILTERS[activeTab]),
    [conversations, activeTab]
  )
  const selected = conversations.find((c) => c.contact.id === selectedContactId) ?? null

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <LeftPane
        query={query}
        onQueryChange={setQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
        conversations={filtered}
        isLoading={isLoading}
        selectedContactId={selectedContactId}
        onSelect={handleSelect}
      />
      <div style={{ flex: 1, minWidth: 340, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedContactId ? <ChatPanel contactId={selectedContactId} /> : <EmptyState />}
      </div>
      {selected && (
        <ContactPanel
          key={selected.contact.id}
          contact={selected.contact}
          onContactUpdate={applyContactUpdate}
        />
      )}
    </div>
  )
}

function computeTabCounts(conversations: Conversation[]): Record<TabId, number> {
  const entries = TAB_IDS.map((id) => [id, conversations.filter(TAB_FILTERS[id]).length])
  return Object.fromEntries(entries) as Record<TabId, number>
}

interface LeftPaneProps {
  query: string
  onQueryChange: (v: string) => void
  activeTab: TabId
  onTabChange: (id: TabId) => void
  counts: Record<TabId, number>
  conversations: Conversation[]
  isLoading: boolean
  selectedContactId: string | null
  onSelect: (id: string) => void
}

function LeftPane({
  query,
  onQueryChange,
  activeTab,
  onTabChange,
  counts,
  conversations,
  isLoading,
  selectedContactId,
  onSelect,
}: LeftPaneProps) {
  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card)',
      }}
    >
      <PaneHeader />
      <FilterTabs activeTab={activeTab} onTabChange={onTabChange} counts={counts} />
      <SearchBar query={query} onQueryChange={onQueryChange} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          query={query}
          selectedId={selectedContactId}
          onSelect={onSelect}
        />
      </div>
    </div>
  )
}

function PaneHeader() {
  return (
    <div
      style={{
        height: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        gap: 8,
      }}
    >
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
        Chats
      </span>
      <button
        style={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
        }}
      >
        <SlidersHorizontal size={15} />
      </button>
    </div>
  )
}

function FilterTabs({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: TabId
  onTabChange: (id: TabId) => void
  counts: Record<TabId, number>
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '8px 10px',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border)',
        scrollbarWidth: 'none',
      }}
    >
      {TAB_IDS.map((id) => (
        <FilterTab
          key={id}
          id={id}
          count={counts[id]}
          isActive={activeTab === id}
          onSelect={() => onTabChange(id)}
        />
      ))}
    </div>
  )
}

function FilterTab({
  id,
  count,
  isActive,
  onSelect,
}: {
  id: TabId
  count: number
  isActive: boolean
  onSelect: () => void
}) {
  const isRedBadge = RED_BADGE_TABS.has(id) && count > 0
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px',
        borderRadius: 99,
        border: 'none',
        background: isActive ? 'var(--accent)' : 'transparent',
        color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: isActive ? 500 : 400,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'background var(--duration-fast)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-subtle)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }
      }}
    >
      {TAB_LABELS[id]}
      {isRedBadge ? (
        <span
          style={{
            background: '#E53E3E',
            color: '#fff',
            borderRadius: 99,
            fontSize: 10,
            fontWeight: 600,
            padding: '0 5px',
            lineHeight: '16px',
            minWidth: 16,
            textAlign: 'center',
          }}
        >
          {count}
        </span>
      ) : (
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: isActive ? 'var(--text-inverse)' : 'var(--text-tertiary)',
            opacity: isActive ? 0.7 : 1,
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function SearchBar({ query, onQueryChange }: { query: string; onQueryChange: (v: string) => void }) {
  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--accent-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '7px 10px',
        }}
      >
        <Search size={13} color="var(--text-tertiary)" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search conversations"
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 13,
            color: 'var(--text-primary)',
          }}
        />
      </div>
    </div>
  )
}
