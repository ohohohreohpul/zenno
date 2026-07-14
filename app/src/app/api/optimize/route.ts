import { NextRequest, NextResponse } from 'next/server'
import { analyzeConversations } from '@/lib/optimize'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? 'ws-1'
  const proposal = await analyzeConversations(workspaceId)
  return NextResponse.json({ data: proposal })
}
