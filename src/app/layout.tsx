import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Libre_Franklin } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/auth/AuthProvider';

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
  title: 'HomeDigo — Quality Healthcare Right at Home | Connected Care',
  description: 'Verified doctors, nurses, physiotherapy, lab tests, and 24/7 ambulance services at your doorstep. Built for patient trust and clinical excellence.',
  keywords: ['Home healthcare', 'Doctor home visit', 'Nurse at home', 'Wound dressing', 'Elderly care', 'Bangalore home doctor', 'UPI healthcare booking'],
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
