"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  HeartPulse,
  MapPin,
  Search,
  SlidersHorizontal,
  Stethoscope,
  X,
} from "lucide-react";
import { doctorBookingUrl, patientSignInUrl } from "@/lib/patient-navigation";
import styles from "./doctor-finder.module.css";

type Specialty = { id: string; name: string };
type Doctor = {
  id: string;
  name: string;
  image?: string;
  speciality_id?: string;
  speciality_name?: string;
  specialization?: string;
  qualifications?: string;
  experience_years?: number;
  consultation_fee?: number | string | null;
  city?: string;
  location_name?: string;
  bio?: string;
};

function DoctorPortrait({ doctor }: { doctor: Doctor }) {
  const [failed, setFailed] = useState(false);
  const initials = doctor.name
    .replace(/^dr\.?\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <div className={styles.portrait}>
      {doctor.image && !failed ? (
        <Image
          src={doctor.image}
          alt={doctor.name}
          fill
          sizes="80px"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={doctor.name}>{initials}</span>
      )}
    </div>
  );
}

export default function DoctorFinder() {
  const { status } = useSession();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const responses = await Promise.all(
          ["/api/doctors", "/api/specialities"].map((url) =>
            fetch(url, { signal: controller.signal }),
          ),
        );
        if (responses.some((response) => !response.ok))
          throw new Error("Directory unavailable");
        const [doctorData, specialtyData] = await Promise.all(
          responses.map((response) => response.json()),
        );
        if (
          !Array.isArray(doctorData.doctors) ||
          !Array.isArray(specialtyData.specialities)
        )
          throw new Error("Invalid directory");
        setDoctors(doctorData.doctors);
        setSpecialties(specialtyData.specialities);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  const cities = [
    ...new Set(
      doctors
        .map((doctor) => doctor.city?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const search = query.trim().toLowerCase();
  const filtered = doctors.filter(
    (doctor) =>
      (!specialty || doctor.speciality_id === specialty) &&
      (!city || doctor.city?.trim() === city) &&
      (!search ||
        [
          doctor.name,
          doctor.speciality_name,
          doctor.specialization,
          doctor.qualifications,
          doctor.location_name,
          doctor.city,
        ].some((value) => value?.toLowerCase().includes(search))),
  );
  const visible = showAll ? filtered : filtered.slice(0, 6);
  const hasFilters = Boolean(query || specialty || city);
  const bookingLink = (id: string) =>
    status === "authenticated"
      ? doctorBookingUrl(id)
      : patientSignInUrl(doctorBookingUrl(id));
  const clear = () => {
    setQuery("");
    setSpecialty("");
    setCity("");
    setShowAll(false);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    document
      .getElementById("doctor-results")
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  };

  return (
    <section
      id="find-doctors"
      className={styles.finder}
      aria-labelledby="finder-heading"
    >
      <div className={styles.inner}>
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>
              THE RIGHT EXPERT. THE RIGHT CARE.
            </span>
            <h2 id="finder-heading">
              Find your doctor.
              <br className={styles.mobileBreak} /> Feel in good hands.
            </h2>
          </div>
          <p>
            Search by name or specialty, choose your doctor,
            <br />
            and book a visit in a few simple steps.
          </p>
        </div>
        <form
          className={styles.searchBar}
          onSubmit={submit}
          role="search"
          aria-label="Find a doctor"
        >
          <label className={styles.searchField}>
            <Search size={21} aria-hidden="true" />
            <span>
              <span className={styles.fieldLabel}>DOCTOR OR SPECIALTY</span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowAll(false);
                }}
                placeholder="Name, specialty or qualification"
                aria-label="Search doctors by name or specialty"
              />
            </span>
          </label>
          <label className={styles.selectField}>
            <SlidersHorizontal size={19} aria-hidden="true" />
            <span>
              <span className={styles.fieldLabel}>SPECIALTY</span>
              <select
                aria-label="Specialty"
                value={specialty}
                onChange={(event) => {
                  setSpecialty(event.target.value);
                  setShowAll(false);
                }}
              >
                <option value="">All specialties</option>
                {specialties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className={styles.selectField}>
            <MapPin size={19} aria-hidden="true" />
            <span>
              <span className={styles.fieldLabel}>LOCATION</span>
              <select
                aria-label="Doctor location"
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setShowAll(false);
                }}
              >
                <option value="">All locations</option>
                {cities.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </span>
          </label>
          <button className={styles.searchButton} type="submit">
            Find a doctor <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
        {specialties.length > 0 && (
          <div className={styles.specialties} aria-label="Browse specialties">
            <button
              type="button"
              aria-pressed={!specialty}
              onClick={() => {
                setSpecialty("");
                setShowAll(false);
              }}
            >
              <Stethoscope size={16} aria-hidden="true" />
              All specialties
            </button>
            {specialties.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={specialty === item.id}
                onClick={() => {
                  setSpecialty(item.id);
                  setShowAll(false);
                }}
              >
                <HeartPulse size={16} aria-hidden="true" />
                {item.name}
              </button>
            ))}
          </div>
        )}
        <div id="doctor-results" className={styles.results} aria-busy={loading}>
          <div className={styles.resultHeading}>
            <h3>
              {specialty
                ? specialties.find((item) => item.id === specialty)?.name
                : "Meet our doctors"}
            </h3>
            <span role="status" aria-live="polite">
              {loading
                ? "Finding your care team…"
                : error
                  ? "Directory unavailable"
                  : `${filtered.length} ${filtered.length === 1 ? "doctor" : "doctors"} found`}
            </span>
            {hasFilters && (
              <button onClick={clear} type="button">
                <X size={14} aria-hidden="true" /> Clear filters
              </button>
            )}
          </div>
          {loading ? (
            <div className={styles.cardGrid}>
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={styles.skeleton}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : error ? (
            <div className={styles.empty}>
              <Stethoscope size={30} aria-hidden="true" />
              <h3>We couldn’t load the doctors.</h3>
              <p>Please try again, or call our team for help finding care.</p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again <ArrowRight size={16} />
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <Search size={30} aria-hidden="true" />
              <h3>
                {hasFilters
                  ? "No doctors match your search."
                  : "Let’s find the right care for you."}
              </h3>
              <p>
                {hasFilters
                  ? "Try a different name, specialty or location."
                  : "Doctor appointments aren’t listed right now. Our care team can help you with available services."}
              </p>
              {hasFilters ? (
                <button type="button" onClick={clear}>
                  Clear filters <ArrowRight size={16} />
                </button>
              ) : (
                <a href="tel:+917695964741">
                  Talk to our care team <ArrowUpRight size={16} />
                </a>
              )}
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {visible.map((doctor) => {
                const fee =
                  doctor.consultation_fee === null ||
                  doctor.consultation_fee === undefined ||
                  doctor.consultation_fee === ""
                    ? null
                    : Number(doctor.consultation_fee);
                return (
                  <article key={doctor.id} className={styles.doctorCard}>
                    <div className={styles.doctorTop}>
                      <DoctorPortrait doctor={doctor} />
                      <div>
                        <span className={styles.verified}>
                          <BadgeCheck size={13} aria-hidden="true" /> Verified
                          doctor
                        </span>
                        <h3>{doctor.name}</h3>
                        <p>
                          {doctor.speciality_name ||
                            doctor.specialization ||
                            "Doctor"}
                        </p>
                      </div>
                    </div>
                    <p className={styles.qualifications}>
                      {doctor.qualifications ||
                        "Contact our team for qualification details"}
                    </p>
                    <div className={styles.doctorDetails}>
                      {Number(doctor.experience_years) > 0 && (
                        <span>
                          <Stethoscope size={15} aria-hidden="true" />
                          {doctor.experience_years} years of experience
                        </span>
                      )}
                      <span>
                        <MapPin size={15} aria-hidden="true" />
                        {doctor.location_name ||
                          doctor.city ||
                          "Confirm location when booking"}
                      </span>
                    </div>
                    <div className={styles.cardBottom}>
                      <div>
                        <small>Consultation</small>
                        <strong>
                          {fee !== null && Number.isFinite(fee)
                            ? new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0,
                              }).format(fee)
                            : "Confirm fee"}
                        </strong>
                      </div>
                      <Link
                        href={bookingLink(doctor.id)}
                        aria-label={`Book appointment with ${doctor.name}`}
                      >
                        Book appointment{" "}
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {!loading && !error && filtered.length > 6 && (
            <button
              type="button"
              className={styles.showMore}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? "Show fewer doctors"
                : `View all ${filtered.length} doctors`}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <p className={styles.help}>
          Not sure which specialist to choose?{" "}
          <a href="tel:+917695964741">
            We’re here to help <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </p>
      </div>
    </section>
  );
}
