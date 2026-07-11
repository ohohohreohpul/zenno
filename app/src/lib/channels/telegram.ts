/**
 * Telegram Bot API client. Businesses create a bot with @BotFather and paste
 * the token — no platform review, no business verification.
 *
 * TELEGRAM_API_BASE is overridable for tests; defaults to the real API.
 */

function apiBase(): string {
  return (process.env.TELEGRAM_API_BASE ?? 'https://api.telegram.org').replace(/\/$/, '')
}

interface TelegramResponse {
  ok: boolean
  result?: Record<string, unknown>
  description?: string
}

async function telegramCall(
  botToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${apiBase()}/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const payload = (await res.json().catch(() => ({}))) as TelegramResponse
  if (!res.ok || !payload.ok) {
    throw new Error(`Telegram ${method} failed: ${payload.description ?? res.status}`)
  }
  return payload.result ?? {}
}

/** Validate a bot token; returns the bot's username for display. */
export async function validateBotToken(botToken: string): Promise<string> {
  const me = await telegramCall(botToken, 'getMe')
  const username = typeof me.username === 'string' ? me.username : 'unknown_bot'
  return username
}

/** Point the bot's webhook at us; secretToken arrives back on every update. */
export async function registerTelegramWebhook(
  botToken: string,
  url: string,
  secretToken: string,
): Promise<void> {
  await telegramCall(botToken, 'setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message'],
  })
}

export async function removeTelegramWebhook(botToken: string): Promise<void> {
  await telegramCall(botToken, 'deleteWebhook', {})
}

export async function sendTelegram(
  botToken: string,
  chatId: string,
  text: string,
): Promise<void> {
  await telegramCall(botToken, 'sendMessage', { chat_id: chatId, text })
}
