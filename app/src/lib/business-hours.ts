export interface BusinessHours {
  days: number[]
  start: string
  end: string
}

export interface WorkspaceLocaleConfig {
  timezone?: string
  currency?: string
  businessHours?: BusinessHours
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  days: [1, 2, 3, 4, 5],
  start: '09:00',
  end: '17:00',
}

export function validTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format()
    return true
  } catch {
    return false
  }
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'))
  return { dayIndex, minuteOfDay: Number(value('hour')) * 60 + Number(value('minute')) }
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

export function isWithinBusinessHours(
  workspace: WorkspaceLocaleConfig | null | undefined,
  now = new Date(),
): boolean {
  const timeZone = workspace?.timezone && validTimeZone(workspace.timezone) ? workspace.timezone : 'UTC'
  const hours = workspace?.businessHours ?? DEFAULT_BUSINESS_HOURS
  const local = localParts(now, timeZone)
  if (!hours.days.includes(local.dayIndex)) return false
  const start = timeToMinutes(hours.start)
  const end = timeToMinutes(hours.end)
  return start <= end
    ? local.minuteOfDay >= start && local.minuteOfDay < end
    : local.minuteOfDay >= start || local.minuteOfDay < end
}
