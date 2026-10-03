import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { executeQuery, isDbConfigured } from './db';
import { verifyPassword } from './passwords';

export const isGoogleAuthReady = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here'
);

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback_secret_for_local_development_32ch',
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
      async authorize(credentials) {
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

        // Fallback for mock/local sandbox if DB offline
        if (email === 'superadmin@homedigo.care' && password === 'SuperAdmin@2026') {
          return {
            id: 'usr_super_root',
            name: 'Executive Super Admin',
            email: 'superadmin@homedigo.care',
            role: 'SUPER_ADMIN',
          };
        }

        throw new Error('Database is offline and credentials could not be verified.');
      },
    }),

    // 3. Quick Demo Provider for instant testing
    CredentialsProvider({
      id: 'demo-role-login',
      name: 'Demo Role Login',
      credentials: {
        role: { label: 'Role', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.role) return null;
        const role = credentials.role;
        return {
          id: `usr_${role.toLowerCase()}_demo`,
          name: `${role} Demo User`,
          email: `${role.toLowerCase()}@homedigo.care`,
          role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'PATIENT';
        token.id = user.id;
        token.department = (user as any).department;
        token.accessLevel = (user as any).accessLevel;
      }
      return token;
    },
    async session({ session, token }) {
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
