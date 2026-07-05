import { NextResponse } from 'next/server'
import { IS_MOCK, mockAgencies } from '@/lib/mock-store'
import { connectDb } from '@/lib/db'
import { Agency } from '@/models/Agency'

export async function GET(): Promise<NextResponse> {
  if (IS_MOCK) {
    const agency = mockAgencies[0]
    return NextResponse.json({ data: { id: agency._id, name: agency.name, credits: agency.credits, plan: agency.plan } })
  }

  await connectDb()
  const agency = await Agency.findOne().lean()
  if (!agency) return NextResponse.json({ data: null })
  return NextResponse.json({
    data: { id: agency._id.toString(), name: agency.name, credits: agency.credits, plan: agency.plan },
  })
}
