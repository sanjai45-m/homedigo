import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { executeQuery, isDbConfigured } from './db';
import { hashPassword, isRetiredSetupPassword, verifyPassword } from './passwords';
import { randomUUID } from 'node:crypto';

export const isGoogleAuthReady = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here'
);

export async function authenticateCredentials(credentials: { email?: string; password?: string; expectedRole?: string } | undefined) {
  if (!credentials?.email || !credentials?.password) {
    throw new Error('Please provide both email and password.');
  }

  const email = credentials.email.trim().toLowerCase();
  const password = credentials.password;
  const expectedRole = credentials.expectedRole;

  if (isDbConfigured) {
    const userRes = await executeQuery(`
      SELECT id, name, email, password_hash, role, department, access_level, image
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
    `, [email]);

    if (userRes.rows.length === 0) {
      throw new Error('No account found with this email address.');
    }

    const user = userRes.rows[0];

    // Verify password hash
    if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
      throw new Error('Incorrect password. Please try again.');
    }
    if (isRetiredSetupPassword(password)) {
      throw new Error('This setup password has been retired. Contact the site owner to reset your password.');
    }
    if (!user.password_hash.startsWith('scrypt:')) {
      const upgraded = await executeQuery('UPDATE users SET password_hash = $1 WHERE id = $2 AND password_hash = $3',
        [hashPassword(password), user.id, user.password_hash]);
      if (!upgraded.isConnected) throw new Error('Sign-in is temporarily unavailable.');
    }

    // Verify role if expectedRole is passed
    if (expectedRole && user.role !== expectedRole && !(expectedRole === 'ADMIN' && user.role === 'SUPER_ADMIN')) {
      throw new Error(`Unauthorized. This account is registered as ${user.role}, not ${expectedRole}.`);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      accessLevel: user.access_level,
      image: user.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    };
  }

  throw new Error('Database is offline and credentials could not be verified.');
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // 1. Google OAuth Provider (Configurable)
    ...(isGoogleAuthReady
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                role: 'PATIENT',
              };
            },
          }),
        ]
      : []),

    // 2. Database Email & Password Authentication Provider
    CredentialsProvider({
      id: 'credentials-login',
      name: 'Email & Password Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'name@homedigo.care' },
        password: { label: 'Password', type: 'password' },
        expectedRole: { label: 'Expected Role', type: 'text' },
      },
      authorize: authenticateCredentials,
    }),

  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') return (user as { role?: string }).role === 'PATIENT';
      // Google accounts must map to a real patient record, never a privileged account.
      if (!(profile as { email_verified?: boolean } | undefined)?.email_verified || !user.email) return false;
      const result = await executeQuery(
        `INSERT INTO users (id, name, email, image, role)
         VALUES ($1, $2, $3, $4, 'PATIENT') ON CONFLICT (email) DO NOTHING`,
        [`usr_${randomUUID()}`, user.name, user.email.toLowerCase(), user.image],
      );
      if (!result.isConnected) return false;
      const existing = await executeQuery('SELECT id, role FROM users WHERE LOWER(email) = $1', [user.email.toLowerCase()]);
      if (!existing.isConnected || existing.rows[0]?.role !== 'PATIENT') return false;
      user.id = existing.rows[0].id;
      (user as { role?: string }).role = 'PATIENT';
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return `${baseUrl}${url}`;
      try {
        const parsedUrl = new URL(url);
        if (
          parsedUrl.origin === baseUrl
        ) {
          return url;
        }
      } catch {
        // Fallback if invalid URL
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.authVersion = 1;
        token.role = (user as any).role || 'PATIENT';
        token.id = user.id;
        token.department = (user as any).department;
        token.accessLevel = (user as any).accessLevel;
      }
      return token;
    },
    async session({ session, token }) {
      // Sessions issued before removal of demo authentication must sign in again.
      if (token.authVersion !== 1 || token.role !== 'PATIENT') return { ...session, user: undefined };
      if (session.user) {
        (session.user as any).role = token.role || 'PATIENT';
        (session.user as any).id = token.id || token.sub;
        (session.user as any).department = token.department;
        (session.user as any).accessLevel = token.accessLevel;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
};
