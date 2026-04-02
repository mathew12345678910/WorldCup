import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/auth
 * Body: { password: string }
 * Returns { authenticated: true } or 401.
 * No JWT — stateless simple password check against ADMIN_PASSWORD env var.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body.password !== 'string') {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 })
    }

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      console.error('[admin/auth] ADMIN_PASSWORD env var is not set')
      return NextResponse.json({ error: 'Admin auth not configured' }, { status: 500 })
    }

    if (body.password !== adminPassword) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    return NextResponse.json({ authenticated: true })
  } catch (err) {
    console.error('[admin/auth] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
