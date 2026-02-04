import * as webpush from 'web-push'
import { NextResponse } from 'next/server'
import { getSubscriptions, removeSubscription } from '@/lib/subscriptions'

// Env variables (llenar con claves reales en .env)
const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const contact = process.env.VAPID_CONTACT_EMAIL || 'mailto:example@example.com';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(contact, publicKey, privateKey);
    // eslint-disable-next-line no-console
    console.log('[notifications/send] VAPID details configured successfully');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[notifications/send] Failed to set VAPID details:', e);
  }
} else {
  // eslint-disable-next-line no-console
  console.warn('[notifications/send] VAPID keys missing. publicKey:', !!publicKey, 'privateKey:', !!privateKey);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subscription = body.subscription;
    const title = body.title ?? 'Agendo';
    const message = body.message ?? '';

    const payload = JSON.stringify({ title, body: message });

    if (subscription) {
      await webpush.sendNotification(subscription, payload, { TTL: 86400 });
      return NextResponse.json({ ok: true });
    }

    // If no subscription provided, send to all stored subscriptions
    const subs = await getSubscriptions();
    // eslint-disable-next-line no-console
    console.log(`[notifications/send] Sending push to ${subs.length} subscription(s)`);
    const results: Array<{ endpoint: string; ok: boolean; error?: string }> = [];

    for (const s of subs) {
      try {
        // eslint-disable-next-line no-console
        console.log(`[notifications/send] Sending to endpoint: ${s.endpoint.substring(0, 50)}...`);
        // Add TTL header for FCM (required by Google's push service)
        // TTL = Time To Live in seconds (24 hours = 86400 seconds)
        await webpush.sendNotification(s as any, payload, { TTL: 86400 });
        // eslint-disable-next-line no-console
        console.log(`[notifications/send] ✓ Push sent successfully`);
        results.push({ endpoint: s.endpoint, ok: true });
      } catch (err: any) {
        // If subscription is gone, remove it
        const status = err && err.statusCode;
        const msg = err && err.body ? String(err.body) : String(err);
        // eslint-disable-next-line no-console
        console.error(`[notifications/send] ✗ Push failed (status ${status}):`, msg);
        results.push({ endpoint: s.endpoint, ok: false, error: msg });
        if (status === 404 || status === 410) {
          try {
            await removeSubscription(s.endpoint);
          } catch (e) {
            console.warn('Failed to remove stale subscription', s.endpoint, e);
          }
        }
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (error: any) {
    console.error('Error sending push notification', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
