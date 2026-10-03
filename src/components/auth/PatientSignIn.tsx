"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getProviders, signIn, useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import LandingBrand from "@/components/landing/LandingBrand";
import { doctorBookingUrl, patientDestination } from "@/lib/patient-navigation";
import styles from "./patient-sign-in.module.css";

export default function PatientSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();
  const target = params.get("doctor")
    ? doctorBookingUrl(params.get("doctor")!)
    : patientDestination(params.get("redirect"));
  const selection = new URL(target, "https://homedigo.local").searchParams;
  const selectedDoctor = selection.get("doctor");
  const booking = target.startsWith("/patient/book");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [google, setGoogle] = useState(false);
  const [doctor, setDoctor] = useState<{
    name: string;
    speciality_name?: string;
  } | null>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace(target);
  }, [status, router, target]);

  useEffect(() => {
    let active = true;
    getProviders()
      .then((providers) => {
        if (active) setGoogle(Boolean(providers?.google));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedDoctor) return;
    const controller = new AbortController();
    fetch("/api/doctors", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!controller.signal.aborted)
          setDoctor(
            data?.doctors?.find(
              (item: { id: string }) => item.id === selectedDoctor,
            ) || null,
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [selectedDoctor]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone, password }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "We couldn’t create your account. Please try again.",
          );
        setMode("login");
        setNotice("Your account has been created. Sign in to continue.");
      }
      const result = await signIn("credentials-login", {
        email: email.trim().toLowerCase(),
        password,
        expectedRole: "PATIENT",
        redirect: false,
        callbackUrl: target,
      });
      if (!result?.ok || result.error)
        throw new Error(
          "We couldn’t sign you in. Check your email and password and try again.",
        );
      router.replace(target);
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Unable to sign in. Please try again.",
      );
      setBusy(false);
    }
  }

  if (status !== "unauthenticated")
    return (
      <div className={styles.loading} role="status">
        {status === "authenticated"
          ? "Opening your next step…"
          : "Getting things ready…"}
      </div>
    );

  return (
    <main className={styles.page}>
      <aside className={styles.story} aria-label="Healthcare at home">
        <div className={styles.storyBrand}>
          <LandingBrand />
        </div>
        <Image
          src="/images/home-care-hero.webp"
          alt="A doctor providing personal care to a woman at home"
          fill
          sizes="(max-width: 800px) 0px, 46vw"
          preload
          className={styles.storyImage}
        />
        <div className={styles.storyCopy}>
          <span className={styles.eyebrow}>GOOD CARE STARTS WITH YOU</span>
          <h2>
            A familiar place.
            <br />A little more care.
            <Heart size={36} aria-hidden="true" />
          </h2>
          <p>
            Your doctors, your appointments, your family.
            <br />
            One place to take care of what matters.
          </p>
          <div>
            <ShieldCheck size={18} aria-hidden="true" /> Personal care.
            Connected to you.
          </div>
        </div>
      </aside>
      <div className={styles.formSide}>
        <header className={styles.topBar}>
          <Link href="/#find-doctors">
            <ArrowLeft size={16} aria-hidden="true" /> Back to doctors
          </Link>
          <a href="tel:+917695964741">
            Need help? <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </header>
        <div className={styles.formWrap}>
          <div className={styles.mobileBrand}>
            <LandingBrand />
          </div>
          {booking && (
            <ol
              className={styles.progress}
              aria-label="Appointment booking progress"
            >
              <li aria-current="step">
                <span>1</span> Sign in
              </li>
              <li>
                <span>2</span> Appointment
              </li>
              <li>
                <span>3</span> Confirm
              </li>
            </ol>
          )}
          <span className={styles.eyebrow}>YOUR HOMEDIGO ACCOUNT</span>
          <h1>{mode === "login" ? "Welcome back." : "A healthier start."}</h1>
          <p className={styles.intro}>
            {mode === "login"
              ? booking
                ? "Sign in to continue with your appointment."
                : "Sign in to manage care for you and your family."
              : "Create your account. Keep your family’s care connected."}
          </p>
          {booking && (
            <div className={styles.selection}>
              <span>
                <Stethoscope size={21} aria-hidden="true" />
              </span>
              <div>
                <strong>
                  {doctor?.name ||
                    (selectedDoctor
                      ? "Your selected doctor"
                      : "Your care appointment")}
                </strong>
                <p>
                  {doctor?.speciality_name ||
                    "Your selection stays with you after sign-in."}
                </p>
              </div>
              <Check size={17} aria-hidden="true" />
            </div>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          )}
          <form onSubmit={submit} className={styles.form}>
            <fieldset disabled={busy}>
              {mode === "register" && (
                <label htmlFor="patient-name">
                  Full name
                  <div className={styles.inputWrap}>
                    <UserRound size={18} aria-hidden="true" />
                    <input
                      id="patient-name"
                      autoComplete="name"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                </label>
              )}
              <label htmlFor="patient-email">
                Email address
                <div className={styles.inputWrap}>
                  <Mail size={18} aria-hidden="true" />
                  <input
                    id="patient-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </label>
              {mode === "register" && (
                <label htmlFor="patient-phone">
                  Phone number
                  <div className={styles.inputWrap}>
                    <Phone size={18} aria-hidden="true" />
                    <input
                      id="patient-phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      maxLength={20}
                      pattern="[+0-9 ()-]{10,20}"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Your contact number"
                    />
                  </div>
                </label>
              )}
              <label htmlFor="patient-password">
                Password
                <div className={styles.inputWrap}>
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    id="patient-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      mode === "register"
                        ? "At least 8 characters"
                        : "Enter your password"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
              <button type="submit" className={styles.submit}>
                {busy
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in & continue"
                    : "Create account & continue"}
                {!busy && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </fieldset>
          </form>
          {google && (
            <>
              <div className={styles.divider}>
                <span>or</span>
              </div>
              <button
                type="button"
                className={styles.google}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await signIn("google", { callbackUrl: target });
                  } catch {
                    setError(
                      "Google sign-in could not be started. Please try again.",
                    );
                    setBusy(false);
                  }
                }}
              >
                Continue with Google{" "}
                <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            </>
          )}
          <p className={styles.switchMode}>
            {mode === "login" ? "New to HomeDigo?" : "Already have an account?"}{" "}
            <button
              disabled={busy}
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setNotice("");
              }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}{" "}
              <ArrowUpRight size={13} aria-hidden="true" />
            </button>
          </p>
          <p className={styles.privacy}>
            <CalendarDays size={15} aria-hidden="true" />
            {booking
              ? "Choose your visit details after signing in."
              : "Your appointments and family care, in one place."}
          </p>
        </div>
        <footer className={styles.footer}>
          Care that comes home.<span>HomeDigo</span>
        </footer>
      </div>
    </main>
  );
}
