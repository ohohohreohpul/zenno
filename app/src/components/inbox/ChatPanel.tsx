'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Bot, FlaskConical } from 'lucide-react'
import { ChannelBadge } from '@/components/ui/ChannelBadge'
import { StagePill } from '@/components/ui/StagePill'
import type { Contact, Message } from '@/types'

interface Props {
  contactId: string
}

interface ContactWithMessages {
  contact: Contact
  messages: Message[]
}

export function ChatPanel({ contactId }: Props) {
  const [data, setData] = useState<ContactWithMessages | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [botPausedNotice, setBotPausedNotice] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setData(null)
    fetch(`/api/contacts/${contactId}/messages`)
      .then((r) => r.json())
      .then(setData)
  }, [contactId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  async function refreshMessages() {
    const updated = await fetch(`/api/contacts/${contactId}/messages`).then((r) => r.json())
    setData(updated)
  }

  async function handleSend() {
    if (!draft.trim() || !data) return
    setSending(true)
    setAiError(null)
    const content = draft
    setDraft('')
    try {
      if (testMode) setAiTyping(true)
      const res = await fetch(`/api/contacts/${contactId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, as: testMode ? 'customer' : 'agent' }),
      })
      const body = await res.json()
      if (body.ai_error) setAiError(body.ai_error)
      if (body.bot_paused) setBotPausedNotice(true)
      await refreshMessages()
    } catch {
      setAiError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
      setAiTyping(false)
    }
  }

  if (!data) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
      </div>
    )
  }

  const { contact, messages } = data
  const name = contact.name ?? contact.external_id

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--accent-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <ChannelBadge channel={contact.channel} size="xs" />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{contact.external_id}</span>
          </div>
        </div>
        <StagePill stage={contact.lifecycle_stage} />
        <button
          onClick={() => setTestMode((v) => !v)}
          title="Chat as the customer to test your AI agent"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 99,
            border: testMode ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: testMode ? 'var(--accent)' : 'transparent',
            color: testMode ? 'var(--text-inverse)' : 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all var(--duration-fast)',
          }}
        >
          <FlaskConical size={13} />
          Test AI
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {aiTyping && <TypingIndicator />}
        {botPausedNotice && (
          <div style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--accent-subtle)', borderRadius: 99, padding: '5px 14px' }}>
            AI paused for this contact — you replied manually. Re-enable it in the panel on the right.
          </div>
        )}
        {aiError && (
          <div style={{ alignSelf: 'center', fontSize: 12, color: 'var(--stage-vip)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 99, padding: '5px 14px' }}>
            {aiError}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 12px',
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={testMode ? 'Type as the customer — the AI will reply…' : 'Type a message…'}
            rows={1}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              resize: 'none',
              fontSize: 13.5,
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: draft.trim() && !sending ? 'var(--accent)' : 'var(--border)',
              color: draft.trim() && !sending ? 'var(--text-inverse)' : 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: draft.trim() && !sending ? 'pointer' : 'default',
              transition: 'background var(--duration-fast)',
              flexShrink: 0,
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-end' }}>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>AI agent is typing</span>
      <Bot size={13} color="var(--text-tertiary)" />
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--text-tertiary)',
              animation: `typing-pulse 1.2s ${i * 0.2}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes typing-pulse { 0%, 60%, 100% { opacity: 0.3 } 30% { opacity: 1 } }`}</style>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isOutbound ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 6,
      }}
    >
      {isOutbound && message.ai_generated && (
        <Bot size={13} color="var(--text-tertiary)" style={{ marginBottom: 4, flexShrink: 0 }} />
      )}
      <div
        style={{
          maxWidth: '68%',
          padding: '9px 13px',
          borderRadius: isOutbound ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isOutbound ? 'var(--accent)' : 'var(--card)',
          color: isOutbound ? 'var(--text-inverse)' : 'var(--text-primary)',
          border: isOutbound ? 'none' : '1px solid var(--border)',
          fontSize: 13.5,
          lineHeight: 1.5,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {message.content}
        <div
          style={{
            fontSize: 10,
            marginTop: 4,
            opacity: 0.5,
            textAlign: 'right',
          }}
        >
          {new Date(message.created_at).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  )
}
