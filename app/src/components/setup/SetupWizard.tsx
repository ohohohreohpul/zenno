'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import {
  BusinessStep,
  ChannelsStep,
  ChatMessage,
  COLORS,
  PromptStep,
  TestDriveStep,
  WebsiteStep,
} from './wizardSteps'

const STEP_LABELS = ['Business', 'Website', 'AI Agent', 'Channels', 'Test Drive'] as const
const WORKSPACE_ID = 'ws-1'

const BUSINESS_LABELS: Record<string, string> = {
  yoga: 'yoga studio',
  spa: 'spa and massage business',
  beauty: 'beauty clinic',
  pilates: 'pilates studio',
  gym: 'fitness gym',
  other: 'local service business',
}

function buildTemplatePrompt(businessType: string): string {
  const label = BUSINESS_LABELS[businessType] ?? BUSINESS_LABELS.other
  return [
    `You are the friendly AI booking assistant for a ${label}.`,
    '',
    'Your goals:',
    '- Greet customers warmly and answer questions about services, pricing, and opening hours.',
    '- Help customers book, reschedule, or cancel appointments.',
    '- Collect the customer name, preferred date and time, and the service they want.',
    '- If you do not know an answer, say so honestly and offer to have a team member follow up.',
    '',
    'Style:',
    '- Keep replies short, warm, and professional.',
    '- Always reply in the language the customer writes in.',
    '- Never invent prices or availability you were not given.',
  ].join('\n')
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    return body.error || fallback
  } catch {
    return fallback
  }
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {STEP_LABELS.map((label, index) => {
          const isDone = index <= currentStep
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {index > 0 && (
                <div
                  style={{
                    width: 48,
                    height: 1.5,
                    marginTop: 11,
                    background: index <= currentStep ? COLORS.accent : COLORS.border,
                    transition: 'background 120ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              )}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  width: 64,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: `1.5px solid ${isDone ? COLORS.accent : COLORS.border}`,
                    background: isDone ? COLORS.accent : COLORS.card,
                    transition: 'all 120ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: isDone ? COLORS.textPrimary : COLORS.textTertiary,
                    fontWeight: isDone ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SetupWizard() {
  const [step, setStep] = useState(0)
  const [businessType, setBusinessType] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isPromptFromWebsite, setIsPromptFromWebsite] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [connectedChannels, setConnectedChannels] = useState<readonly string[]>(['whatsapp'])
  const [chatMessages, setChatMessages] = useState<readonly ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [chatError, setChatError] = useState('')
  const [isFinished, setIsFinished] = useState(false)

  const handleScan = async (rawUrl: string) => {
    const url = normalizeUrl(rawUrl)
    setScanError('')
    setIsScanning(true)
    try {
      const response = await fetch('/api/setup/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, businessType: BUSINESS_LABELS[businessType] ?? BUSINESS_LABELS.other }),
      })
      if (!response.ok) {
        setScanError(await readApiError(response, 'We could not read that website. Please try again.'))
        return
      }
      const body = (await response.json()) as {
        data: { systemPrompt: string; aiGenerated: boolean }
      }
      setSystemPrompt(body.data.systemPrompt)
      setIsPromptFromWebsite(body.data.aiGenerated)
      setStep(2)
    } catch {
      setScanError('Something went wrong while scanning. Check the URL and try again.')
    } finally {
      setIsScanning(false)
    }
  }

  const handleSkipScan = () => {
    setSystemPrompt(buildTemplatePrompt(businessType))
    setIsPromptFromWebsite(false)
    setScanError('')
    setStep(2)
  }

  const handleSavePrompt = async () => {
    setSaveError('')
    setIsSaving(true)
    try {
      const response = await fetch('/api/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: WORKSPACE_ID, systemPrompt }),
      })
      if (!response.ok) {
        setSaveError(await readApiError(response, 'Could not save your instructions. Please try again.'))
        return
      }
      setStep(3)
    } catch {
      setSaveError('Could not save your instructions. Check your connection and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleChannel = (id: string) => {
    setConnectedChannels((current) =>
      current.includes(id) ? current : [...current, id],
    )
  }

  const handleSendChat = async (text: string) => {
    const history = chatMessages
    const nextMessages: readonly ChatMessage[] = [...history, { role: 'user', content: text }]
    setChatMessages(nextMessages)
    setChatError('')
    setIsTyping(true)
    try {
      const response = await fetch('/api/setup/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: history.map(({ role, content }) => ({ role, content })),
          message: text,
          systemPrompt: systemPrompt || undefined,
        }),
      })
      if (!response.ok) {
        setChatError(await readApiError(response, 'The agent could not reply. Please try again.'))
        return
      }
      const body = (await response.json()) as { data: { reply: string } }
      setChatMessages((current) => [...current, { role: 'assistant', content: body.data.reply }])
    } catch {
      setChatError('The agent could not reply. Check your connection and try again.')
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto', background: COLORS.bg }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '72px 24px 96px' }}>
        <StepIndicator currentStep={step} />
        {step > 0 && !isFinished && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              marginBottom: 20,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: COLORS.textTertiary,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
        {step === 0 && (
          <BusinessStep
            selected={businessType}
            onSelect={setBusinessType}
            onContinue={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <WebsiteStep
            isLoading={isScanning}
            error={scanError}
            onScan={handleScan}
            onSkip={handleSkipScan}
          />
        )}
        {step === 2 && (
          <PromptStep
            prompt={systemPrompt}
            isFromWebsite={isPromptFromWebsite}
            isSaving={isSaving}
            error={saveError}
            onChange={setSystemPrompt}
            onSave={handleSavePrompt}
          />
        )}
        {step === 3 && (
          <ChannelsStep
            connected={connectedChannels}
            onToggle={handleToggleChannel}
            onContinue={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <TestDriveStep
            messages={chatMessages}
            isTyping={isTyping}
            error={chatError}
            isFinished={isFinished}
            onSend={handleSendChat}
            onFinish={() => setIsFinished(true)}
          />
        )}
      </div>
    </div>
  )
}
