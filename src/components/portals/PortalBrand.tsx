import Image from 'next/image';
import Link from 'next/link';
import styles from './portal.module.css';

export default function PortalBrand({ href = '/', label }: { href?: string; label?: string }) {
  return (
    <Link href={href} className={styles.brand} aria-label={`HomeDigo${label ? ` ${label}` : ' home'}`}>
      <Image src="/logo.png" width={43} height={43} alt="" />
      <span>home<span>digo</span><b>.</b>{label && <small>{label}</small>}</span>
    </Link>
  );
}
