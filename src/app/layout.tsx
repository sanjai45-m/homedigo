import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Libre_Franklin } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/auth/AuthProvider';
import { homeDescription, siteName, siteUrl } from '@/lib/seo';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
  weight: ['600', '700', '800', '900'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: { default: siteName, template: `%s | ${siteName}` },
  description: homeDescription,
  // Account and staff routes inherit this; public pages opt in explicitly.
  robots: { index: false, follow: true },
  verification: {
    google: [
      'uwVaiNQfIu-P34T2FoQ6Mv-YNBq1K4wi35iNnZfSnd0',
      ...(process.env.GOOGLE_SITE_VERIFICATION ? [process.env.GOOGLE_SITE_VERIFICATION] : []),
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${libreFranklin.variable} scroll-smooth`}>
      <body className="font-body antialiased min-h-screen bg-[#fafbfc] text-[#0f172a] flex flex-col selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
