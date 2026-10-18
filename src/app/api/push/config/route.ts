import { publicPushConfig, pushConfigured } from '@/lib/push-config';

export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json(pushConfigured() ? {
    enabled: true, firebase: publicPushConfig(), vapidKey: process.env.FIREBASE_WEB_VAPID_KEY,
  } : { enabled: false }, { headers: { 'Cache-Control': 'no-store' } });
}
