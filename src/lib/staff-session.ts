import { decode, encode } from 'next-auth/jwt';

const salt = 'homedigo-staff-tab-v1';
const maxAge = 12 * 60 * 60;
const roles = ['ADMIN', 'SUPER_ADMIN', 'PARTNER'];

export type StaffUser = {
  id: string;
  issuedAt?: number;
  role: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  department?: string;
  accessLevel?: string;
};

export async function createStaffSession(user: StaffUser) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Authentication is not configured.');
  if (!roles.includes(user.role)) throw new Error('A staff account is required.');
  const expires = new Date(Date.now() + maxAge * 1000).toISOString();
  const token = await encode({ secret, salt, maxAge, token: { ...user, purpose: salt } });
  return { token, session: { user, expires } };
}

/** Staff tokens are deliberately separate from the patient NextAuth cookie. */
export async function readStaffSession(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ') || !process.env.NEXTAUTH_SECRET) return null;
  try {
    const token = await decode({ token: authorization.slice(7), secret: process.env.NEXTAUTH_SECRET, salt });
    if (!token || token.purpose !== salt || typeof token.id !== 'string'
      || !roles.includes(String(token.role)) || typeof token.exp !== 'number'
      || token.exp * 1000 <= Date.now()) return null;
    const user: StaffUser = {
      id: token.id, role: String(token.role), name: token.name, email: token.email,
      issuedAt: typeof token.issuedAt === 'number' ? token.issuedAt : undefined,
      image: typeof token.image === 'string' ? token.image : null,
      department: typeof token.department === 'string' ? token.department : undefined,
      accessLevel: typeof token.accessLevel === 'string' ? token.accessLevel : undefined,
    };
    return { user, expires: new Date(token.exp * 1000).toISOString() };
  } catch {
    return null;
  }
}
