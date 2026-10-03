import { NextResponse } from 'next/server';
import { executeQuery, isDbConfigured } from '@/lib/db';
import { isGoogleAuthReady } from '@/lib/auth';

export async function GET() {
  const dbStatus = isDbConfigured;
  let queryResult = null;

  if (dbStatus) {
    queryResult = await executeQuery('SELECT NOW() as current_time, version()');
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      neonDatabase: {
        configured: dbStatus,
        connected: queryResult?.isConnected || false,
        error: queryResult?.error || null,
      },
      googleAuth: {
        configured: isGoogleAuthReady,
        provider: 'Google OAuth 2.0',
      },
    },
  });
}
