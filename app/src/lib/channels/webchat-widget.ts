/**
 * Webchat widget appearance settings. Stored on the webchat channel
 * connection and served publicly (by embed key) so styling changes apply
 * to embedded widgets without customers re-pasting the snippet.
 */

export interface WebchatWidgetSettings {
  accentColor: string
  title: string
  subtitle: string
  greeting: string
  position: 'right' | 'left'
}

export const DEFAULT_WIDGET_SETTINGS: WebchatWidgetSettings = {
  accentColor: '#18181B',
  title: 'Chat with us',
  subtitle: 'Typically replies in seconds',
  greeting: 'Hi! How can I help you today?',
  position: 'right',
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim().slice(0, maxLength)
  return trimmed
}

/** Merge stored partial settings with defaults, dropping anything invalid. */
export function normalizeWidgetSettings(raw: unknown): WebchatWidgetSettings {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<WebchatWidgetSettings>
  return {
    accentColor:
      typeof source.accentColor === 'string' && HEX_COLOR_PATTERN.test(source.accentColor)
        ? source.accentColor
        : DEFAULT_WIDGET_SETTINGS.accentColor,
    title: cleanText(source.title, DEFAULT_WIDGET_SETTINGS.title, 40) || DEFAULT_WIDGET_SETTINGS.title,
    subtitle: cleanText(source.subtitle, DEFAULT_WIDGET_SETTINGS.subtitle, 60),
    greeting: cleanText(source.greeting, DEFAULT_WIDGET_SETTINGS.greeting, 200),
    position: source.position === 'left' ? 'left' : 'right',
  }
}
