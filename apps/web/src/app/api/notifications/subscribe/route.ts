import { NextResponse } from 'next/server'
import { addSubscription } from '@/lib/subscriptions'

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // eslint-disable-next-line no-console
    console.log('[notifications/subscribe] Received body:', JSON.stringify(body).substring(0, 100));
    
    // Support both `{ subscription }` and direct subscription body
    const subscription = body.subscription ?? body;
    if (!subscription || !subscription.endpoint) {
      // eslint-disable-next-line no-console
      console.error('[notifications/subscribe] Invalid subscription:', { hasSubscription: !!subscription, hasEndpoint: !!subscription?.endpoint });
      return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
    }

    // eslint-disable-next-line no-console
    console.log('[notifications/subscribe] Adding subscription:', subscription.endpoint.substring(0, 50));
    await addSubscription(subscription);
    // eslint-disable-next-line no-console
    console.log('[notifications/subscribe] ✓ New push subscription saved to file:', subscription.endpoint.substring(0, 50));

    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notifications/subscribe] Error:', err);
    return NextResponse.json({ error: 'Failed', details: String(err) }, { status: 500 });
  }
}
