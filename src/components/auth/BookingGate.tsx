"use client";

import { useEffect, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { patientSignInUrl } from "@/lib/patient-navigation";

export default function BookingGate({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const identity = session?.user as { id?: string; role?: string } | undefined;
  const isPatient = status === 'authenticated' && identity?.role === 'PATIENT' && Boolean(identity.id);
  const router = useRouter();
  const params = useSearchParams();
  const destination = `/patient/book${params.size ? `?${params.toString()}` : ""}`;

  useEffect(() => {
    if (status !== 'loading' && !isPatient)
      router.replace(patientSignInUrl(destination));
  }, [status, isPatient, router, destination]);

  if (!isPatient)
    return (
      <div className="p-12 text-center text-teal-800" role="status">
        {status === "loading"
          ? "Checking your account…"
          : "Taking you to sign in…"}
      </div>
    );
  return <>{children}</>;
}
