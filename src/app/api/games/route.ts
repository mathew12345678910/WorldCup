import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createGameSchema } from '@/lib/validation'
import { randomBytes } from 'crypto'

function generatePin(): string {
  // 6 alphanumeric uppercase chars, unambiguous charset (no 0/O/I/1)
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let pin = ''
  const bytes = randomBytes(6)
  for (let i = 0; i < 6; i++) {
    pin += charset[bytes[i] % charset.length]
  }
  return pin
}

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = createGameSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, entry_fee } = parsed.data
    const supabase = createServiceClient()

    // Generate a unique PIN (retry on collision)
    let pin: string
    let attempts = 0
    while (true) {
      pin = generatePin()
      const { data: existing } = await supabase
        .from('games')
        .select('id')
        .eq('pin', pin)
        .maybeSingle()
      if (!existing) break
      attempts++
      if (attempts > 10) {
        return NextResponse.json({ error: 'Could not generate unique PIN' }, { status: 500 })
      }
    }

    const admin_token = generateToken()

    const { data: game, error } = await supabase
      .from('games')
      .insert({
        pin,
        name: name ?? 'WC26 Predictor',
        entry_fee: entry_fee ?? 0,
        max_players: 20,
        admin_token,
      })
      .select()
      .single()

    if (error) {
      console.error('[games/POST] insert error:', error)
      return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
    }

    return NextResponse.json({ game, admin_token }, { status: 201 })
  } catch (err) {
    console.error('[games/POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
