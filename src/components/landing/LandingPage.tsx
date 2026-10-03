import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bandage,
  CalendarDays,
  Check,
  Heart,
  HeartHandshake,
  House,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  TestTubeDiagonal,
} from "lucide-react";
import LandingNav from "./LandingNav";
import LandingBrand from "./LandingBrand";
import DoctorFinder from "./DoctorFinder";
import styles from "./landing.module.css";

const bookingHref = "/patient/login?redirect=%2Fpatient%2Fbook";
const services = [
  {
    id: "srv_doc",
    title: "Doctor at home",
    description: "Personal consultations, without the waiting room.",
    icon: Stethoscope,
    color: "mint",
    label: "CONSULTATION",
  },
  {
    id: "srv_nurse",
    title: "Nursing care",
    description: "Thoughtful support for recovery and everyday care.",
    icon: HeartHandshake,
    color: "peach",
    label: "EVERYDAY SUPPORT",
  },
  {
    id: "srv_physio",
    title: "Physiotherapy",
    description: "Move better with rehabilitation in your own space.",
    icon: Activity,
    color: "lavender",
    label: "RECOVERY & MOVEMENT",
  },
  {
    id: "srv_lab",
    title: "Lab tests at home",
    description: "Convenient sample collection, right at your door.",
    icon: TestTubeDiagonal,
    color: "sand",
    label: "DIAGNOSTICS",
  },
];

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <LandingNav />
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <span className={styles.statusDot} /> A LITTLE CLOSER. A LOT
                MORE CARE.
              </span>
              <h1 id="hero-heading">
                Healthcare
                <br />
                that comes
                <br />
                <span className={styles.heroAccent}>home.</span>
                <Heart className={styles.heroHeart} aria-hidden="true" />
              </h1>
              <p>
                Find a doctor by specialty, choose the right expert, and book
                your appointment. Personal healthcare, in the comfort of home.
              </p>
              <div className={styles.heroActions}>
                <Link href="#find-doctors" className={styles.primaryButton}>
                  Find your doctor <ArrowUpRight size={19} aria-hidden="true" />
                </Link>
                <a href="#services" className={styles.textButton}>
                  Explore our services{" "}
                  <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
              <div className={styles.heroLocation}>
                <MapPin size={15} aria-hidden="true" />
                <span>
                  Bringing care home across <strong>Bengaluru</strong>
                </span>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.heroImage}>
                <Image
                  src="/images/home-care-hero.webp"
                  alt="A doctor sharing a reassuring moment with an older woman in her home"
                  fill
                  sizes="(max-width: 760px) 100vw, 55vw"
                  preload
                />
                <div className={styles.imageCaption}>
                  <span className={styles.captionDot} /> Real comfort. Personal
                  care.
                </div>
              </div>
              <div className={styles.careBadge}>
                <span>
                  <ShieldCheck size={23} aria-hidden="true" />
                </span>
                <div>
                  <strong>Care you can feel good about</strong>
                  <small>Experienced hands. A human touch.</small>
                </div>
              </div>
              <div className={styles.homeSeal} aria-hidden="true">
                <House size={27} strokeWidth={1.5} />
                <span>BETTER AT HOME</span>
              </div>
            </div>
          </div>
          <div className={`${styles.container} ${styles.assuranceStrip}`}>
            <span>
              <ShieldCheck aria-hidden="true" /> Verified care professionals
            </span>
            <span>
              <CalendarDays aria-hidden="true" /> Visits that fit your day
            </span>
            <span>
              <HeartHandshake aria-hidden="true" /> Care for the whole family
            </span>
            <span>
              <House aria-hidden="true" /> The comfort of your home
            </span>
          </div>
        </section>

        <DoctorFinder />

        <section
          id="services"
          className={`${styles.container} ${styles.servicesSection}`}
          aria-labelledby="services-heading"
        >
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>CARE, YOUR WAY</span>
              <h2 id="services-heading">What can we help you with?</h2>
            </div>
            <p>
              A little support or a path to recovery.
              <br />
              Find the right care for you and your family.
            </p>
          </div>
          <div className={styles.serviceGrid}>
            {services.map(
              ({ id, title, description, icon: Icon, color, label }) => (
                <Link
                  key={id}
                  href={`/patient/login?redirect=${encodeURIComponent(`/patient/book?service=${id}`)}`}
                  className={`${styles.serviceCard} ${styles[color]}`}
                >
                  <div className={styles.serviceCardTop}>
                    <span className={styles.serviceIcon}>
                      <Icon size={29} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <ArrowUpRight
                      className={styles.serviceArrow}
                      size={21}
                      aria-hidden="true"
                    />
                  </div>
                  <span className={styles.serviceLabel}>{label}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className={styles.serviceLink}>
                    Explore care <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ),
            )}
          </div>
          <div className={styles.servicesNote}>
            <span>
              <Bandage size={17} aria-hidden="true" /> Looking for wound care or
              another service?
            </span>
            <Link href={bookingHref}>
              View all services <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          id="why-homedigo"
          className={styles.whySection}
          aria-labelledby="why-heading"
        >
          <div className={`${styles.container} ${styles.whyGrid}`}>
            <div className={styles.whyVisual}>
              <Image
                src="/images/home-physiotherapy.webp"
                alt="A physiotherapist helping an older man with a gentle arm stretch at home"
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
              <div className={styles.whyImageNote}>
                <Heart size={20} aria-hidden="true" />
                <span>
                  Familiar spaces.
                  <br />
                  <strong>Extraordinary comfort.</strong>
                </span>
              </div>
            </div>
            <div className={styles.whyCopy}>
              <span className={styles.eyebrow}>THE HOMEDIGO DIFFERENCE</span>
              <h2 id="why-heading">
                Good care starts
                <br />
                with feeling <span>at home.</span>
              </h2>
              <p>
                Less travel. Less waiting. More time for what matters. We make
                it easier to care for yourself and the people you love.
              </p>
              <ul className={styles.benefits}>
                <li>
                  <span>
                    <Check size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>People first. Always.</h3>
                    <p>Personal attention from professionals who listen.</p>
                  </div>
                </li>
                <li>
                  <span>
                    <Check size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Your family, in the loop.</h3>
                    <p>Manage family profiles and appointments in one place.</p>
                  </div>
                </li>
                <li>
                  <span>
                    <Check size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>A simpler care experience.</h3>
                    <p>
                      Choose your service, review the details, and book online.
                    </p>
                  </div>
                </li>
              </ul>
              <a href="tel:+917695964741" className={styles.textButton}>
                Let’s talk about your care{" "}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className={`${styles.container} ${styles.stepsSection}`}
          aria-labelledby="steps-heading"
        >
          <div className={styles.centerHeading}>
            <span className={styles.eyebrow}>A FEW SIMPLE STEPS</span>
            <h2 id="steps-heading">Care is closer than you think.</h2>
            <p>From finding support to opening your door. We keep it simple.</p>
          </div>
          <div className={styles.stepsGrid}>
            {[
              {
                number: "01",
                icon: Stethoscope,
                title: "Tell us what you need",
                description:
                  "Choose the care that’s right for you or a loved one.",
              },
              {
                number: "02",
                icon: CalendarDays,
                title: "Make it your time",
                description:
                  "Add your address and select an available visit slot.",
              },
              {
                number: "03",
                icon: House,
                title: "Feel at home with care",
                description:
                  "Your care professional comes to you. Get comfortable.",
              },
            ].map(({ number, icon: Icon, title, description }) => (
              <div className={styles.step} key={number}>
                <div className={styles.stepTop}>
                  <span className={styles.stepIcon}>
                    <Icon size={27} strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <span className={styles.stepNumber}>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.ctaSection}`}
          aria-labelledby="cta-heading"
        >
          <div className={styles.cta}>
            <div>
              <span className={styles.eyebrow}>HERE FOR YOU. AND YOURS.</span>
              <h2 id="cta-heading">Let’s bring better care home.</h2>
              <p>Your next step to feeling better starts right here.</p>
            </div>
            <div className={styles.ctaActions}>
              <Link href={bookingHref} className={styles.lightButton}>
                Find your care <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
              <a href="tel:+917695964741">
                <Phone size={15} aria-hidden="true" /> Or call +91 76959 64741
              </a>
            </div>
            <Heart
              className={styles.ctaHeart}
              strokeWidth={0.7}
              aria-hidden="true"
            />
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerTop}`}>
          <div>
            <LandingBrand />
            <p>Expert care. A human touch. At home.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#services">Our services</a>
            <a href="#why-homedigo">Why HomeDigo</a>
            <Link href="/partner/login">
              Join as a care partner{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <a href="tel:+917695964741">Contact us</a>
          </nav>
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}>
          <span>
            © {new Date().getFullYear()} HomeDigo. All rights reserved.
          </span>
          <span>
            <MapPin size={13} aria-hidden="true" /> Made with care, for
            Bengaluru.
          </span>
          <Link href="/admin/login">Staff sign in</Link>
        </div>
      </footer>
    </div>
  );
}
