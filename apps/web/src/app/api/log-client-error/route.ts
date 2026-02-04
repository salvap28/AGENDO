import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const info = {
      message: body?.message ?? 'unknown',
      stack: body?.stack ?? null,
      href: body?.href ?? null,
      userAgent: body?.userAgent ?? null,
    };
    console.error('[client-error]', info);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[client-error] failed to log', err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
