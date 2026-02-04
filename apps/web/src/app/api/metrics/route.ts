import { NextResponse } from 'next/server'

const message = {
  error: 'Usá apps/api para leer o escribir métricas. Este handler local fue retirado.',
}

export async function GET() {
  return NextResponse.json(message, { status: 410 })
}

export async function POST() {
  return NextResponse.json(message, { status: 410 })
}
