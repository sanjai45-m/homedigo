import { Suspense } from "react";
import type { Metadata } from "next";
import PatientSignIn from "@/components/auth/PatientSignIn";
import styles from "@/components/auth/patient-sign-in.module.css";

export const metadata: Metadata = {
  title: "Sign in | HomeDigo",
  robots: { index: false, follow: false },
};

export default function PatientLoginPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading} role="status">
          Getting things ready…
        </div>
      }
    >
      <PatientSignIn />
    </Suspense>
  );
}
