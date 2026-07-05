'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  Check,
  CheckCircle2,
  Dumbbell,
  Flower2,
  Heart,
  Send,
  Sparkles,
  Store,
} from 'lucide-react'

export const COLORS = {
  bg: '#FDFCFA',
  card: '#FFFFFF',
  border: '#EEEBE6',
  borderStrong: '#D8D3CB',
  textPrimary: '#1A1714',
  textSecondary: '#6B6560',
  textTertiary: '#A09990',
  textInverse: '#FFFFFF',
  accent: '#1A1714',
  accentHover: '#2E2926',
  accentSubtle: '#F0EDE8',
  green: '#059669',
  red: '#DC2626',
} as const

export const buttonStyle = (disabled = false): React.CSSProperties => ({
  padding: '12px 24px',
  borderRadius: 10,
  border: 'none',
  background: disabled ? COLORS.borderStrong : COLORS.accent,
  color: COLORS.textInverse,
  fontSize: 14,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background 120ms cubic-bezier(0.16, 1, 0.3, 1)',
})

export const ghostButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: 'transparent',
  color: COLORS.textSecondary,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

export function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: COLORS.textPrimary,
          margin: 0,
        }}
      >
        {title}
      </h1>
      <p style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
        {subtitle}
      </p>
    </div>
  )
}

const BUSINESS_TYPES = [
  { id: 'yoga', label: 'Yoga Studio', Icon: Flower2 },
  { id: 'spa', label: 'Spa & Massage', Icon: Sparkles },
  { id: 'beauty', label: 'Beauty Clinic', Icon: Heart },
  { id: 'pilates', label: 'Pilates Studio', Icon: Activity },
  { id: 'gym', label: 'Fitness Gym', Icon: Dumbbell },
  { id: 'other', label: 'Other', Icon: Store },
] as const

export function BusinessStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: string
  onSelect: (id: string) => void
  onContinue: () => void
}) {
  return (
    <div>
      <StepTitle
        title="What kind of business is this?"
        subtitle="We tailor your AI agent's tone and booking flow to your industry."
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {BUSINESS_TYPES.map(({ id, label, Icon }) => {
          const isSelected = selected === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 18px',
                borderRadius: 10,
                border: isSelected
                  ? `1.5px solid ${COLORS.accent}`
                  : `1px solid ${COLORS.border}`,
                background: isSelected ? COLORS.accentSubtle : COLORS.card,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 120ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Icon size={20} color={isSelected ? COLORS.accent : COLORS.textTertiary} />
              <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.textPrimary }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
        <button
          type="button"
          disabled={!selected}
          onClick={onContinue}
          style={buttonStyle(!selected)}
        >
          Continue
        </button>
      </div>
    </div>
  )
}

const SCAN_STATUS_LINES = [
  'Reading your website…',
  'Extracting services and pricing…',
  "Writing your agent's instructions…",
]
const STATUS_ROTATE_MS = 1600

function ScanProgress() {
  const [lineIndex, setLineIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(
      () => setLineIndex((i) => (i + 1) % SCAN_STATUS_LINES.length),
      STATUS_ROTATE_MS,
    )
    return () => clearInterval(timer)
  }, [])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: COLORS.accent,
          animation: 'setupPulse 1.2s ease-in-out infinite',
        }}
      />
      <span style={{ fontSize: 14, color: COLORS.textSecondary }}>
        {SCAN_STATUS_LINES[lineIndex]}
      </span>
      <style>{`@keyframes setupPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}

export function WebsiteStep({
  isLoading,
  error,
  onScan,
  onSkip,
}: {
  isLoading: boolean
  error: string
  onScan: (url: string) => void
  onSkip: () => void
}) {
  const [url, setUrl] = useState('')
  return (
    <div>
      <StepTitle
        title="Where does your business live online?"
        subtitle="We'll read your website and write your agent's instructions automatically."
      />
      <input
        type="text"
        value={url}
        disabled={isLoading}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && url.trim()) onScan(url)
        }}
        placeholder="https://yourstudio.com"
        style={{
          width: '100%',
          fontSize: 15,
          padding: '14px 16px',
          borderRadius: 10,
          border: `1px solid ${error ? COLORS.red : COLORS.borderStrong}`,
          background: COLORS.card,
          color: COLORS.textPrimary,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {error && (
        <p style={{ fontSize: 13, color: COLORS.red, marginTop: 10 }}>{error}</p>
      )}
      {isLoading ? (
        <ScanProgress />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
          }}
        >
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 13,
              color: COLORS.textTertiary,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Skip — I&apos;ll write it myself
          </button>
          <button
            type="button"
            disabled={!url.trim()}
            onClick={() => onScan(url)}
            style={buttonStyle(!url.trim())}
          >
            Scan website
          </button>
        </div>
      )}
    </div>
  )
}

export function PromptStep({
  prompt,
  isFromWebsite,
  isSaving,
  error,
  onChange,
  onSave,
}: {
  prompt: string
  isFromWebsite: boolean
  isSaving: boolean
  error: string
  onChange: (value: string) => void
  onSave: () => void
}) {
  return (
    <div>
      <StepTitle
        title="Meet your AI agent's brain"
        subtitle={
          isFromWebsite
            ? 'We generated these instructions from your website. Review and edit — you can change them anytime.'
            : 'We prepared a starting template for you. Edit it to match your business — you can change it anytime.'
        }
      />
      <textarea
        value={prompt}
        rows={14}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          lineHeight: 1.6,
          padding: 16,
          borderRadius: 10,
          border: `1px solid ${COLORS.borderStrong}`,
          background: COLORS.card,
          color: COLORS.textPrimary,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {error && <p style={{ fontSize: 13, color: COLORS.red, marginTop: 10 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button
          type="button"
          disabled={isSaving || !prompt.trim()}
          onClick={onSave}
          style={buttonStyle(isSaving || !prompt.trim())}
        >
          {isSaving ? 'Saving…' : 'Save & continue'}
        </button>
      </div>
    </div>
  )
}

const CHANNELS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Answer booking requests on WhatsApp Business.',
    color: '#25D366',
  },
  {
    id: 'instagram',
    name: 'Instagram DM',
    description: 'Reply to DMs and story mentions automatically.',
    color: '#E1306C',
  },
  {
    id: 'line',
    name: 'LINE',
    description: 'Connect your LINE Official Account.',
    color: '#00B900',
  },
] as const

export function ChannelsStep({
  connected,
  onToggle,
  onContinue,
}: {
  connected: readonly string[]
  onToggle: (id: string) => void
  onContinue: () => void
}) {
  return (
    <div>
      <StepTitle
        title="Connect your channels"
        subtitle="Your agent answers wherever your customers message you."
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CHANNELS.map((channel) => {
          const isConnected = connected.includes(channel.id)
          return (
            <div
              key={channel.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 18px',
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.card,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: channel.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>
                  {channel.name}
                </div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                  {channel.description}
                </div>
              </div>
              {isConnected ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: COLORS.green,
                  }}
                >
                  <Check size={15} /> Connected
                </span>
              ) : (
                <button type="button" onClick={() => onToggle(channel.id)} style={ghostButtonStyle}>
                  Connect
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 12, color: COLORS.textTertiary, marginTop: 16 }}>
        You can finish this later in Settings → Channels.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button type="button" onClick={onContinue} style={buttonStyle()}>
          Continue
        </button>
      </div>
    </div>
  )
}

export interface ChatMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '10px 14px' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: COLORS.textTertiary,
            animation: `setupPulse 1s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes setupPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '75%',
          padding: '10px 14px',
          borderRadius: 12,
          fontSize: 14,
          lineHeight: 1.5,
          background: isUser ? COLORS.accent : COLORS.accentSubtle,
          color: isUser ? COLORS.textInverse : COLORS.textPrimary,
          whiteSpace: 'pre-wrap',
        }}
      >
        {message.content}
      </div>
    </div>
  )
}

export function TestDriveStep({
  messages,
  isTyping,
  error,
  isFinished,
  onSend,
  onFinish,
}: {
  messages: readonly ChatMessage[]
  isTyping: boolean
  error: string
  isFinished: boolean
  onSend: (text: string) => void
  onFinish: () => void
}) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, isTyping])

  const handleSend = () => {
    const text = draft.trim()
    if (!text || isTyping) return
    setDraft('')
    onSend(text)
  }

  if (isFinished) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <CheckCircle2 size={48} color={COLORS.green} style={{ marginBottom: 20 }} />
        <h2 style={{ fontSize: 22, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
          Your agent is live
        </h2>
        <p style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 10 }}>
          It will now answer every new message in your inbox
        </p>
        <div style={{ marginTop: 28 }}>
          <Link href="/dashboard/inbox" style={{ textDecoration: 'none' }}>
            <span style={{ ...buttonStyle(), display: 'inline-block' }}>Go to Chats</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <StepTitle
        title="Take it for a test drive"
        subtitle="Message your agent as if you were a customer."
      />
      <div
        style={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          height: 420,
          display: 'flex',
          flexDirection: 'column',
          background: COLORS.card,
          overflow: 'hidden',
        }}
      >
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {messages.length === 0 && !isTyping && (
            <p style={{ fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', marginTop: 40 }}>
              Try: &quot;Do you have any classes tomorrow morning?&quot;
            </p>
          )}
          {messages.map((message, index) => (
            <ChatBubble key={`${message.role}-${index}`} message={message} />
          ))}
          {isTyping && <TypingDots />}
        </div>
        {error && (
          <p style={{ fontSize: 12, color: COLORS.red, padding: '0 16px 8px', margin: 0 }}>
            {error}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 12,
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
            placeholder="Type a message…"
            style={{
              flex: 1,
              fontSize: 14,
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              outline: 'none',
              color: COLORS.textPrimary,
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || isTyping}
            style={{
              ...buttonStyle(!draft.trim() || isTyping),
              padding: '10px 14px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button type="button" onClick={onFinish} style={buttonStyle()}>
          Finish setup
        </button>
      </div>
    </div>
  )
}
