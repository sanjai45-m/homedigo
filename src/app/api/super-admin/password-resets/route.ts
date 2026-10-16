import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { decideAdminReset, listAdminResetRequests, RecoveryError } from '@/lib/password-reset';

export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  const authorization = await requireApiUser(['SUPER_ADMIN']);
  if (authorization.response) return authorization.response;
  try {
    return NextResponse.json({ requests: await listAdminResetRequests() }, { headers });
  } catch {
    return NextResponse.json({ error: 'Could not load password reset requests.' }, { status: 503, headers });
  }
}
export async function POST(request: Request) {
  const authorization = await requireApiUser(['SUPER_ADMIN'], request);
  if (authorization.response) return authorization.response;
  try {
    const { id, action } = await request.json();
    if (typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
      || !['approve', 'reject'].includes(action)) throw new RecoveryError('Select a valid request and decision.');
    return NextResponse.json(await decideAdminReset(id, action, authorization.user.id), { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RecoveryError ? error.message : 'Could not process the request.' },
      { status: error instanceof RecoveryError ? error.status : 503, headers });
  }
}
