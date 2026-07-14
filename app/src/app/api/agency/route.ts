import { NextResponse } from 'next/server'
import { getAgency } from '@/lib/queries'

export async function GET(): Promise<NextResponse> {
  const agency = await getAgency('agency-1') as { id: string; name: string; credits: number; plan: string } | null
  if (!agency) return NextResponse.json({ data: null })
  return NextResponse.json({
    data: { id: agency.id, name: agency.name, credits: agency.credits, plan: agency.plan },
  })
}
