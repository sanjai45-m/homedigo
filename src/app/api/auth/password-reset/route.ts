import { NextResponse } from 'next/server';
import { isEmailAddress } from '@/lib/email';
import { completePasswordReset, requestPasswordReset, RecoveryError } from '@/lib/password-reset';

export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store' };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site'
    || request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Cross-site requests are not allowed.' }, { status: 403, headers });
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') throw new RecoveryError('Enter valid reset details.');
    if (!['PATIENT', 'PARTNER', 'ADMIN'].includes(body.role)) throw new RecoveryError('Select a valid portal.');
    if (body.action === 'request') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!isEmailAddress(email)) throw new RecoveryError('Enter a valid email address.');
      return NextResponse.json(await requestPasswordReset(email, body.role), { status: 202, headers });
    }
    if (body.action !== 'reset' || typeof body.requestId !== 'string' || !uuid.test(body.requestId)
      || typeof body.secret !== 'string' || !(body.role === 'ADMIN' ? /^[A-Za-z0-9_-]{43}$/ : /^\d{6}$/).test(body.secret)
      || typeof body.password !== 'string' || body.password !== body.confirmPassword) {
      throw new RecoveryError('Enter a valid code or link and matching passwords.');
    }
    await completePasswordReset(body.requestId, body.role, body.secret, body.password);
    return NextResponse.json({ message: 'Your password has been reset. Sign in with your new password.' }, { headers });
  } catch (error) {
    const status = error instanceof RecoveryError ? error.status : error instanceof SyntaxError ? 400 : 503;
    return NextResponse.json({ error: error instanceof RecoveryError ? error.message : 'Password recovery is unavailable. Please try again.' }, { status, headers });
  }
}
