'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CalendarDays, Clock, DollarSign, LogOut, Menu, Power, X } from 'lucide-react';
import PortalBrand from './PortalBrand';
import PortalHeader from './PortalHeader';
import PushNotifications from '@/components/PushNotifications';
import styles from './portal.module.css';
import mobile from './partner-workspace.module.css';

const links = [
  { href: '/partner/dashboard', label: 'Your visits', short: 'Visits', icon: CalendarDays },
  { href: '/partner/schedule', label: 'Appointment hours', short: 'Hours', icon: Clock },
  { href: '/partner/reminders', label: 'Visit reminders', short: 'Reminders', icon: Bell },
  { href: '/partner/earnings', label: 'Earnings', short: 'Earnings', icon: DollarSign },
];

export default function PartnerWorkspace({ children, userId, name, specialization, online, saving, onDutyChange, onSignOut }: {
  children: ReactNode; userId?: string; name: string; specialization?: string;
  online: boolean | null; saving: boolean; onDutyChange: () => void; onSignOut: () => void;
}) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const notificationSettings = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (href: string) => pathname === href || (href === '/partner/dashboard' && pathname.startsWith('/partner/visit/'));
  useEffect(() => { dialog.current?.close(); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) element?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', closeOnDesktop);
      element?.close();
    };
  }, [menuOpen]);
  const closeMenu = () => dialog.current?.close();
  const openNotifications = () => {
    closeMenu();
    if (notificationSettings.current) {
      notificationSettings.current.open = true;
      notificationSettings.current.querySelector('summary')?.focus();
    }
  };
  const duty = <div className={mobile.duty}>
    <span className={mobile.dutyLabel}><Power size={16} aria-hidden="true" />{online === null ? 'Checking duty status' : online ? 'On duty' : 'Off duty'}</span>
    <button type="button" disabled={saving || online === null} onClick={onDutyChange} aria-label={online ? 'Go Off-Duty' : 'Start Duty Shift'}>
      {saving ? 'Saving...' : online === null ? 'Please wait' : online ? 'Go off duty' : 'Go on duty'}
    </button>
  </div>;
  const navigation = (label: string) => <nav aria-label={label} className={mobile.menuLinks}>
    {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={closeMenu} aria-current={isActive(href) ? 'page' : undefined}>
      <Icon size={19} aria-hidden="true" />{label}
    </Link>)}
    <a href="#partner-notifications" onClick={openNotifications}><Bell size={19} aria-hidden="true" />Notification settings</a>
  </nav>;
  const account = <div className={mobile.account}>
    <div className={mobile.avatar} aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
    <div className="min-w-0"><p className="truncate font-semibold">{name}</p><p className="truncate text-xs text-slate-500">{specialization || 'Clinician'}</p></div>
    <button type="button" aria-label="Sign out" onClick={onSignOut}><LogOut size={18} /></button>
  </div>;
  const otherPortals = <details className={mobile.otherPortals}>
    <summary>Other portals</summary>
    <div><Link href="/patient/dashboard" onClick={closeMenu}>Patient portal</Link><Link href="/admin/dashboard" onClick={closeMenu}>Admin sign in</Link><Link href="/super-admin/dashboard" onClick={closeMenu}>Super admin sign in</Link></div>
  </details>;
  return <div className={`${styles.theme} ${styles.shell} ${mobile.shell}`}>
    <a href="#portal-content" className={styles.skipLink}>Skip to main content</a>
    <aside className={mobile.desktopSidebar}>
      <div className={mobile.desktopBrand}><PortalBrand href="/partner/dashboard" label="Clinician" /></div>
      {duty}
      <p className={mobile.dutyHelp}>Off duty pauses new bookings. Existing appointments stay scheduled.</p>
      {navigation('Clinician navigation')}
      {otherPortals}
      <div className="mt-auto">{account}</div>
    </aside>
    <div className={styles.workspace}>
      <div className={mobile.mobileTop}>
        <header className={mobile.mobileHeader}>
          <PortalBrand href="/partner/dashboard" label="Clinician" />
          <button type="button" aria-label="Open clinician menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="clinician-menu" onClick={() => setMenuOpen(true)}><Menu size={23} /></button>
        </header>
        {duty}
      </div>
      <div className={mobile.desktopHeader}><PortalHeader label="Clinician workspace" /></div>
      <main id="portal-content" tabIndex={-1} className={`${styles.page} ${mobile.page}`}>
        <div key={pathname}>{children}</div>
        {userId && <details ref={notificationSettings} id="partner-notifications" className={mobile.notifications}>
          <summary>Notification settings</summary>
          <PushNotifications key={userId} portal="partner" userId={userId} />
        </details>}
      </main>
    </div>
    <nav aria-label="Clinician mobile navigation" className={mobile.bottomNav}>
      {links.slice(0, 3).map(({ href, short, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}><Icon size={20} aria-hidden="true" /><span>{short}</span></Link>)}
      <button type="button" aria-label="Open clinician menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="clinician-menu" onClick={() => setMenuOpen(true)}><Menu size={20} aria-hidden="true" /><span>Menu</span></button>
    </nav>
    <dialog ref={dialog} id="clinician-menu" aria-labelledby="clinician-menu-title" className={mobile.dialog} onClose={() => setMenuOpen(false)} onClick={event => { if (event.target === event.currentTarget) closeMenu(); }} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), summary')).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className={mobile.menuPanel}>
        <div className={mobile.menuHeader}><h2 id="clinician-menu-title">Your workspace</h2><button type="button" aria-label="Close clinician menu" onClick={closeMenu}><X size={22} /></button></div>
        {account}
        {navigation('Clinician menu')}
        <p className={mobile.dutyHelp}>Off duty pauses new bookings. Your existing appointments remain scheduled.</p>
        {otherPortals}
        <Link href="/" onClick={closeMenu} className={mobile.homeLink}>Back to HomeDigo</Link>
      </div>
    </dialog>
  </div>;
}
