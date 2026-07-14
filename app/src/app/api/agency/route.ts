import { NextRequest, NextResponse } from 'next/server'
import { getAgency } from '@/lib/queries'
import { requestAgencyId } from '@/lib/request-context'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const agency = await getAgency(requestAgencyId(req)) as { id: string; name: string; credits: number; plan: string } | null
  if (!agency) return NextResponse.json({ data: null })
  return NextResponse.json({
    data: { id: agency.id, name: agency.name, credits: agency.credits, plan: agency.plan },
  })
}
