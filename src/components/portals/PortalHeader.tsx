import Link from 'next/link';
import { ArrowUpRight, HeartHandshake } from 'lucide-react';
import styles from './portal.module.css';

export default function PortalHeader({ label }: { label: string }) {
  return (
    <header className={styles.workspaceHeader}>
      <span><HeartHandshake size={18} aria-hidden="true" /><span>HomeDigo <span className={styles.headerDivider}>/</span> <strong>{label}</strong></span></span>
      <Link href="/">Back to home <ArrowUpRight size={15} aria-hidden="true" /></Link>
    </header>
  );
}
