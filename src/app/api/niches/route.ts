import { NextResponse } from 'next/server'
import { CRITICAL_NICHES } from '@/lib/niches'

export async function GET() {
  return NextResponse.json({
    niches: CRITICAL_NICHES,
    note: 'Edit src/lib/niches.ts to customize your focus areas',
  })
}
