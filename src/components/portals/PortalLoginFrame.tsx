import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, HeartHandshake, ShieldCheck, Stethoscope } from 'lucide-react';
import PortalBrand from './PortalBrand';
import styles from './portal.module.css';

const content = {
  partner: {
    label: 'Clinician portal',
    headline: 'Great care starts',
    accent: 'with you.',
    description: 'A little closer to your patients. A little simpler to manage your day. Your home care practice, all in one place.',
    features: ['Your visits, thoughtfully organised', 'Care that goes beyond the clinic', 'A clear view of your earnings'],
  },
  admin: {
    label: 'Admin portal',
    headline: 'Behind every visit,',
    accent: 'a caring team.',
    description: 'Connect the right people to the right care. Bring your doctors, services, and daily operations together.',
    features: ['Coordinate every home visit', 'Support your clinician network', 'Keep everyday care running smoothly'],
  },
  'super-admin': {
    label: 'Super admin portal',
    headline: 'A bigger picture.',
    accent: 'A healthier tomorrow.',
    description: 'Give your teams the support to deliver exceptional home care. Your people, network, and platform in one view.',
    features: ['Empower your operations team', 'Grow a trusted care network', 'Oversee revenue and settlements'],
  },
};

export default function PortalLoginFrame({ role, title, description, children }: {
  role: keyof typeof content;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const copy = content[role];
  const PortalIcon = role === 'partner' ? Stethoscope : role === 'admin' ? HeartHandshake : ShieldCheck;
  return (
    <div className={`${styles.theme} ${styles.login}`}>
      <header className={styles.loginHeader}>
        <PortalBrand />
        <Link href="/"><ArrowLeft size={15} aria-hidden="true" /> Back to home</Link>
      </header>
      <main className={styles.loginGrid}>
        <section className={styles.loginStory} aria-label={copy.label}>
          <div className={styles.eyebrow}><span /> CARE THAT CONNECTS US</div>
          <h1>{copy.headline}<br /><em>{copy.accent}</em></h1>
          <p>{copy.description}</p>
          <div className={styles.loginPhoto}>
            <Image src="/images/home-care-hero.webp" alt="A healthcare professional providing personal care at home" fill sizes="(max-width: 900px) 90vw, 45vw" priority />
            <div className={styles.photoNote}><HeartHandshake size={23} /><span><strong>Good care. Closer to home.</strong><small>The people behind a healthier everyday.</small></span></div>
          </div>
          <ul className={styles.loginFeatures}>{copy.features.map(feature => <li key={feature}><ShieldCheck size={16} aria-hidden="true" />{feature}</li>)}</ul>
        </section>
        <section className={styles.loginPanel} aria-labelledby="portal-login-title">
          <div className={styles.loginEmblem}><PortalIcon size={24} aria-hidden="true" /></div>
          <span className={styles.eyebrow}>{copy.label}</span>
          <h2 id="portal-login-title">{title}</h2>
          <p className={styles.loginDescription}>{description}</p>
          <div className={styles.loginForm}>{children}</div>
          <div className={styles.loginFootnote}><ShieldCheck size={15} aria-hidden="true" /> Your workspace for connected home care.</div>
        </section>
      </main>
      <footer className={styles.loginFooter}><span>HomeDigo · Care with a human touch.</span><span>Doctors. Teams. Better care, together.</span></footer>
    </div>
  );
}
