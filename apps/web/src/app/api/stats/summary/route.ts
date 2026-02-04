import { NextResponse } from 'next/server'

const message = {
  error: 'Las estadísticas ahora viven en apps/api. Consultá /api/stats/full en el backend principal.',
}

export async function GET() {
  return NextResponse.json(message, { status: 410 })
}
