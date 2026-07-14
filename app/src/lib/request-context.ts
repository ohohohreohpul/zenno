import type { NextRequest } from 'next/server'

export interface RequestTenant {
  userId: string
  agencyId: string
  workspaceId: string
}

export function getRequestTenant(req: NextRequest): RequestTenant {
  const userId = req.headers.get('x-zenno-user-id')
  const agencyId = req.headers.get('x-zenno-agency-id')
  const workspaceId = req.headers.get('x-zenno-workspace-id')
  if (!userId || !agencyId || !workspaceId) throw new Error('Authenticated tenant context missing')
  return { userId, agencyId, workspaceId }
}

export function requestWorkspaceId(req: NextRequest, fallback = 'ws-1'): string {
  return req.headers.get('x-zenno-workspace-id') ?? fallback
}

export function requestAgencyId(req: NextRequest, fallback = 'agency-1'): string {
  return req.headers.get('x-zenno-agency-id') ?? fallback
}
