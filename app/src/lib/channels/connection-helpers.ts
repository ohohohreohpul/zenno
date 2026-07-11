import { randomBytes } from 'crypto'
import type { NextRequest } from 'next/server'

export const DEFAULT_WORKSPACE_ID = 'ws-1'

export function workspaceIdFrom(req: NextRequest): string {
  return req.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID
}

/** Public base URL of this app — used when registering webhooks with platforms. */
export function appBaseUrl(): string | null {
  const base =
    process.env.PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null)
  return base ? base.replace(/\/$/, '') : null
}

export function randomSecret(bytes = 24): string {
  return randomBytes(bytes).toString('hex')
}

/** instanceName satisfies the unique index for non-gateway channels. */
export function connectionInstanceName(channel: string, workspaceId: string): string {
  return `${channel}:${workspaceId}`
}
