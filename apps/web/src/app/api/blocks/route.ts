import { NextResponse } from 'next/server'

const message = {
  error: 'Este endpoint se delegó al backend de apps/api. Consumí la API principal /api/blocks.',
}

export async function GET() {
  return NextResponse.json(message, { status: 410 })
}

export async function POST() {
  return NextResponse.json(message, { status: 410 })
}
