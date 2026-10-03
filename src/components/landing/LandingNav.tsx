"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import LandingBrand from "./LandingBrand";
import styles from "./landing.module.css";

const links = [
  { href: "#find-doctors", label: "Find a doctor" },
  { href: "#services", label: "Our services" },
  { href: "#why-homedigo", label: "Why HomeDigo" },
  { href: "#how-it-works", label: "How it works" },
];

export default function LandingNav() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const dashboard =
    role === "SUPER_ADMIN"
      ? "/super-admin/dashboard"
      : role === "ADMIN"
        ? "/admin/dashboard"
        : role === "PARTNER"
          ? "/partner/dashboard"
          : "/patient/dashboard";

  return (
    <header
      className={styles.header}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className={`${styles.container} ${styles.navbar}`}>
        <LandingBrand />
        <nav className={styles.desktopNav} aria-label="Main navigation">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.navActions}>
          <Link
            className={styles.signIn}
            href={session ? dashboard : "/patient/login"}
          >
            {session ? "My account" : "Sign in"}
          </Link>
          <Link
            className={styles.navBook}
            href="/patient/login?redirect=%2Fpatient%2Fbook"
          >
            Book a visit <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <button
            ref={menuButton}
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        className={styles.mobileNav}
        aria-label="Mobile navigation"
        hidden={!menuOpen}
      >
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        ))}
        <Link
          href={session ? dashboard : "/patient/login"}
          onClick={() => setMenuOpen(false)}
        >
          {session ? "My account" : "Sign in"}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
