'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCheck, ChevronRight, Clock, History, MapPin, RefreshCw, Search, Stethoscope } from 'lucide-react';
import { staffFetch } from '@/lib/staff-client';
import { appointmentDate } from '@/lib/appointment-time';
import FeedbackToast from '@/components/shared/FeedbackToast';
import styles from './dashboard.module.css';

type Visit = {
  id: string; booking_number: string; patient_name: string; service_title: string; address_text: string;
  status: string; scheduled_date: string; scheduled_time_slot: string; appointment_starts_at?: string;
  doctor_confirmed_at?: string | null;
};
const active = (visit: Visit) => !['COMPLETED', 'CANCELLED'].includes(visit.status);
const needsReview = (visit: Visit) => !visit.doctor_confirmed_at && ['PENDING', 'ASSIGNED', 'CONFIRMED'].includes(visit.status);
const labels: Record<string, string> = {
  PENDING: 'Needs review', ASSIGNED: 'Needs review', CONFIRMED: 'Confirmed', ON_THE_WAY: 'On the way',
  ARRIVED: 'Arrived', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};
const priority: Record<string, number> = { IN_PROGRESS: 0, ARRIVED: 1, ON_THE_WAY: 2 };
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'P';
const visitHref = (visit: Visit) => `/partner/visit/${encodeURIComponent(visit.id)}`;
function dateKey(visit: Visit) {
  if (visit.appointment_starts_at && Number.isFinite(Date.parse(visit.appointment_starts_at))) {
    return appointmentDate('Today', new Date(visit.appointment_starts_at));
  }
  return String(visit.scheduled_date || '').slice(0, 10);
}
function visitTime(visit: Visit) {
  const parsed = Date.parse(visit.appointment_starts_at || visit.scheduled_date);
  return Number.isFinite(parsed) ? parsed : 0;
}
function displayDate(visit: Visit, today: string) {
  const key = dateKey(visit);
  if (key === today) return 'Today';
  const parsed = new Date(`${key}T12:00:00+05:30`);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: key.slice(0, 4) !== today.slice(0, 4) ? 'numeric' : undefined, timeZone: 'Asia/Kolkata' })
    : visit.scheduled_date || 'Date to be confirmed';
}
function Status({ visit }: { visit: Visit }) {
  const tone = needsReview(visit) ? styles.review : visit.status === 'CANCELLED' ? styles.cancelled : visit.status === 'COMPLETED' ? styles.completed : styles.confirmed;
  return <span className={`${styles.status} ${tone}`}><span aria-hidden="true" />{needsReview(visit) ? 'Needs review' : labels[visit.status] || visit.status.replaceAll('_', ' ')}</span>;
}

export default function PartnerDashboardPage() {
  const [name, setName] = useState('');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [today, setToday] = useState('');
  const [filter, setFilter] = useState<'ACTIVE' | 'REVIEW'>('ACTIVE');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [query, setQuery] = useState('');
  const [recentLimit, setRecentLimit] = useState(5);
  const request = useRef({ generation: 0 });
  async function refresh() {
    const id = ++request.current.generation;
    setLoading(true); setNotice('');
    try {
      const response = await staffFetch('/api/pro/dashboard');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load appointments.');
      if (id !== request.current.generation) return;
      setName(data.partner?.name || ''); setVisits(data.visits || []);
      setLoaded(true); setLoadError(false);
    } catch (error) {
      if (id !== request.current.generation) return;
      setLoadError(true);
      setNotice(error instanceof Error ? error.message : 'Could not load appointments. Please retry.');
    } finally { if (id === request.current.generation) setLoading(false); }
  }
  useEffect(() => {
    let mounted = true;
    const lifecycle = request.current;
    queueMicrotask(() => { if (mounted) { setToday(appointmentDate('Today')); void refresh(); } });
    const timer = setInterval(() => setToday(appointmentDate('Today')), 60000);
    return () => { mounted = false; lifecycle.generation++; clearInterval(timer); };
  }, []);

  const current = visits.filter(active).sort((a, b) => (priority[a.status] ?? 3) - (priority[b.status] ?? 3) || visitTime(a) - visitTime(b));
  const reviews = current.filter(needsReview);
  const todayVisits = visits.filter(visit => dateKey(visit) === today && visit.status !== 'CANCELLED');
  const completedToday = todayVisits.filter(visit => visit.status === 'COMPLETED').length;
  const completion = todayVisits.length ? Math.round(completedToday / todayVisits.length * 100) : 0;
  const featured = current[0];
  const displayed = (filter === 'REVIEW' ? reviews : current).filter(visit =>
    `${visit.patient_name} ${visit.service_title} ${visit.booking_number}`.toLowerCase().includes(query.trim().toLowerCase()));
  const recent = visits.filter(visit => !active(visit) && (historyFilter === 'ALL' || visit.status === historyFilter))
    .sort((a, b) => visitTime(b) - visitTime(a));
  const dateLabel = today ? new Date(`${today}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }) : 'Your care workspace';
  const metric = (value: number) => loaded ? value.toString().padStart(2, '0') : '—';

  return <div className={styles.dashboard}>
    <FeedbackToast message={notice} onDismiss={() => setNotice('')} />
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>YOUR CARE, CONNECTED</p><h1>Your day, at a glance<span>.</span></h1><p className={styles.welcome}>{name ? `Welcome back, ${name}.` : 'Welcome to your workspace.'} <span>Let’s make every visit count.</span></p></div>
      <div className={styles.headerActions}><span className={styles.date}><CalendarDays size={15} aria-hidden="true" />{dateLabel}</span><button type="button" aria-label="Refresh visits" disabled={loading} onClick={() => void refresh()} className={styles.refresh}><RefreshCw size={17} className={loading ? styles.spinning : ''} /><span>Refresh</span></button></div>
    </header>
    {loadError && <div role="status" className={styles.error}><span>{loaded ? 'Could not refresh. Showing your last loaded appointments.' : 'Your appointments could not be loaded.'}</span><button type="button" disabled={loading} onClick={() => void refresh()}>Try again <RefreshCw size={14} /></button></div>}
    <div className={styles.stats} aria-label="Appointment overview">
      <div className={styles.stat}><span className={`${styles.statIcon} ${styles.mint}`}><CalendarDays size={19} /></span><div><span className={styles.statLabel}>Today’s visits</span><strong>{metric(todayVisits.length)}</strong></div><span className={styles.statNote}>Scheduled for today</span></div>
      <a href="#current-appointments" onClick={() => { setFilter('ACTIVE'); setQuery(''); }} className={styles.stat}><span className={`${styles.statIcon} ${styles.blue}`}><Stethoscope size={19} /></span><div><span className={styles.statLabel}>Current visits</span><strong>{metric(current.length)}</strong></div><span className={styles.statNote}>Active & upcoming <ArrowUpRight size={13} /></span></a>
      <a href="#current-appointments" onClick={() => { setFilter('REVIEW'); setQuery(''); }} className={styles.stat}><span className={`${styles.statIcon} ${styles.peach}`}><Clock size={19} /></span><div><span className={styles.statLabel}>Needs review</span><strong>{metric(reviews.length)}</strong></div><span className={styles.statNote}>Awaiting your response <ArrowUpRight size={13} /></span></a>
      <div className={styles.stat}><span className={`${styles.statIcon} ${styles.lilac}`}><CheckCheck size={19} /></span><div><span className={styles.statLabel}>Completed today</span><strong>{metric(completedToday)}</strong></div><span className={styles.statNote}>Care delivered</span></div>
    </div>
    <div className={styles.contentGrid}>
      <div className={styles.mainColumn}>
        {loading && !loaded ? <div className={styles.loading} role="status"><span className={styles.skeleton} /><span className={styles.skeleton} /><span className={styles.skeleton} />Loading your appointments…</div> : loaded && <>
          {featured ? <article className={styles.featured} aria-label="Priority appointment">
            <div className={styles.featuredTop}><span className={styles.featuredLabel}><span />{priority[featured.status] !== undefined ? 'YOUR VISIT IN MOTION' : needsReview(featured) ? 'NEXT REQUEST TO REVIEW' : 'NEXT ON YOUR LIST'}</span><span className={styles.featuredNumber}>{featured.booking_number}</span></div>
            <div className={styles.featuredPatient}><span className={styles.featuredAvatar} aria-hidden="true">{initials(featured.patient_name)}</span><div><h2>{featured.patient_name}</h2><p>{featured.service_title}</p></div><Status visit={featured} /></div>
            <div className={styles.featuredDetails}><span><CalendarDays size={16} />{displayDate(featured, today)}</span><span><Clock size={16} />{featured.scheduled_time_slot} <small>IST</small></span></div>
            <div className={styles.featuredBottom}><p><MapPin size={16} /><span>{featured.address_text || 'Address available in appointment details'}</span></p><Link href={visitHref(featured)} className={styles.primaryAction}>{needsReview(featured) ? 'Review request' : 'Open visit'}<ArrowRight size={17} /></Link></div>
          </article> : <div className={styles.caughtUp}><span><CheckCheck size={28} /></span><div><p className={styles.eyebrow}>A LITTLE BREATHING ROOM</p><h2>You’re all caught up.</h2><p>New appointment requests will appear here.</p></div><Link href="/partner/schedule">Manage your hours <ArrowUpRight size={16} /></Link></div>}
          <section id="current-appointments" aria-labelledby="current-heading" className={styles.panel} aria-busy={loading}>
            <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>YOUR APPOINTMENT QUEUE</p><h2 id="current-heading">Current appointments <span>{current.length}</span></h2></div><CalendarDays size={21} className={styles.sectionIcon} /></div>
            <div className={styles.toolbar}><div className={styles.tabs} role="group" aria-label="Filter current appointments"><button type="button" aria-pressed={filter === 'ACTIVE'} onClick={() => setFilter('ACTIVE')}>All current <span>{current.length}</span></button><button type="button" aria-pressed={filter === 'REVIEW'} onClick={() => setFilter('REVIEW')}>Needs review <span>{reviews.length}</span></button></div><label className={styles.search}><Search size={16} aria-hidden="true" /><input aria-label="Search current appointments" placeholder="Search patients…" value={query} onChange={event => setQuery(event.target.value)} type="search" /></label></div>
            {!displayed.length ? <div className={styles.empty}><CalendarDays size={25} /><h3>{query ? 'No matching appointments' : filter === 'REVIEW' ? 'No requests waiting for review' : 'No current appointments'}</h3><p>{query ? 'Try a patient name, service or booking number.' : 'You’re up to date. Check back for new requests.'}</p>{query && <button type="button" onClick={() => setQuery('')}>Clear search</button>}</div> : <div className={styles.visitList}>{displayed.map(visit => <article key={visit.id} className={styles.visitRow}>
              <div className={styles.timeBlock}><strong>{visit.scheduled_time_slot?.split(' - ')[0] || 'Time pending'}</strong><span>{displayDate(visit, today)} · IST</span></div>
              <div className={styles.visitIdentity}><span className={styles.avatar} aria-hidden="true">{initials(visit.patient_name)}</span><div><h3>{visit.patient_name}</h3><p>{visit.service_title}</p><span className={styles.rowAddress}><MapPin size={12} />{visit.address_text || 'See appointment for address'}</span></div></div>
              <div className={styles.rowActions}><Status visit={visit} /><Link href={visitHref(visit)} aria-label={`${needsReview(visit) ? 'Review request' : 'Open visit'} for ${visit.patient_name}`}>{needsReview(visit) ? 'Review request' : 'Open visit'}<ArrowUpRight size={16} /></Link></div>
            </article>)}</div>}
            <div className={styles.panelFoot}><span>{displayed.length} {displayed.length === 1 ? 'appointment' : 'appointments'}{query ? ' matching your search' : ' in this view'}</span><span>All times in IST</span></div>
          </section>
          <section aria-labelledby="recent-heading" className={styles.panel}>
            <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>YOUR CARE HISTORY</p><h2 id="recent-heading">Recent appointments</h2></div><History size={21} className={styles.sectionIcon} /></div>
            <div className={styles.historyToolbar}><p>Past visits, with the details a tap away.</p><label><span className="sr-only">Filter recent appointments</span><select value={historyFilter} onChange={event => { setHistoryFilter(event.target.value as typeof historyFilter); setRecentLimit(5); }}><option value="ALL">All outcomes</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label></div>
            {!recent.length ? <div className={styles.empty}><History size={25} /><h3>No recent {historyFilter === 'ALL' ? 'appointments' : historyFilter.toLowerCase() + ' visits'}</h3><p>Completed and cancelled appointments will appear here.</p></div> : <div className={styles.recentList}>{recent.slice(0, recentLimit).map(visit => <Link key={visit.id} href={visitHref(visit)} className={styles.recentRow} aria-label={`View ${visit.status === 'CANCELLED' ? 'cancellation' : 'visit summary'} for ${visit.patient_name}`}><span className={`${styles.historyIcon} ${visit.status === 'COMPLETED' ? styles.mint : styles.neutral}`} aria-hidden="true">{visit.status === 'COMPLETED' ? <Check size={19} /> : <History size={19} />}</span><div className={styles.recentIdentity}><h3>{visit.patient_name}</h3><p>{visit.service_title}</p></div><span className={styles.recentDate}>{displayDate(visit, today)}</span><Status visit={visit} /><ChevronRight size={17} className={styles.recentArrow} aria-hidden="true" /></Link>)}</div>}
            {recent.length > recentLimit && <button type="button" className={styles.loadMore} onClick={() => setRecentLimit(limit => limit + 5)}>Show more appointments <ArrowDown size={15} /></button>}
          </section>
        </>}
      </div>
      <aside className={styles.sideColumn} aria-label="Your day and shortcuts">
        <section className={`${styles.panel} ${styles.dayCard}`}><div className={styles.sideHeading}><h2>Today’s rhythm</h2><span className={styles.todayPill}>IST</span></div><p>A little progress. A lot of care.</p><div className={styles.progressRing} style={{ '--progress': `${completion}%` } as CSSProperties} role="img" aria-label={loaded ? `${completedToday} of ${todayVisits.length} visits completed today` : 'Today’s progress unavailable'}><div><strong>{loaded ? `${completion}%` : '—'}</strong><span>of today’s visits</span></div></div><div className={styles.progressLegend}><span><i />Completed<strong>{metric(completedToday)}</strong></span><span><i />Remaining<strong>{metric(todayVisits.length - completedToday)}</strong></span></div><p className={styles.dayNote}>{!loaded ? 'Your daily overview will appear here.' : !todayVisits.length ? 'No visits scheduled for today. Your next care opportunity is ahead.' : completedToday === todayVisits.length ? 'Today’s visits are complete. Thank you for the care you bring.' : `${todayVisits.length - completedToday} ${todayVisits.length - completedToday === 1 ? 'visit' : 'visits'} still on today’s list.`}</p></section>
        <section className={`${styles.panel} ${styles.shortcuts}`}><h2>Make room for care</h2><p>Your workspace, one tap away.</p><Link href="/partner/schedule"><span className={`${styles.shortcutIcon} ${styles.mint}`}><CalendarDays size={19} /></span><span><strong>Appointment hours</strong><small>Set when you’re available</small></span><ArrowUpRight size={17} /></Link><Link href="/partner/reminders"><span className={`${styles.shortcutIcon} ${styles.peach}`}><Bell size={19} /></span><span><strong>Visit reminders</strong><small>A timely nudge before visits</small></span><ArrowUpRight size={17} /></Link><Link href="/partner/earnings"><span className={`${styles.shortcutIcon} ${styles.lilac}`}><History size={19} /></span><span><strong>Earnings & payouts</strong><small>Keep track of your earnings</small></span><ArrowUpRight size={17} /></Link></section>
        {loaded && reviews.length > 0 && <div className={styles.reviewNote}><span className={styles.reviewNoteIcon}><Clock size={19} /></span><h3>A patient is counting on you.</h3><p>{reviews.length} {reviews.length === 1 ? 'request is' : 'requests are'} waiting. Review the details and payment before accepting.</p><a href="#current-appointments" onClick={() => { setFilter('REVIEW'); setQuery(''); }}>Review requests <ArrowRight size={16} /></a></div>}
      </aside>
    </div>
    <p className={styles.footerNote}><Stethoscope size={14} /> Thoughtful care starts with a well-planned day.</p>
  </div>;
}
