import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')

  const cronSecret = process.env.CRON_SECRET

  return NextResponse.json({
    querySecretReceived: querySecret ? `${querySecret.substring(0, 8)}...` : null,
    cronSecretExists: !!cronSecret,
    cronSecretLength: cronSecret?.length || 0,
    cronSecretPrefix: cronSecret ? `${cronSecret.substring(0, 8)}...` : null,
    match: querySecret === cronSecret,
    nodeEnv: process.env.NODE_ENV,
  })
}
