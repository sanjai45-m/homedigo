"use client";

import { useEffect, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { patientSignInUrl } from "@/lib/patient-navigation";

export default function BookingGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const destination = `/patient/book${params.size ? `?${params.toString()}` : ""}`;

  useEffect(() => {
    if (status === "unauthenticated")
      router.replace(patientSignInUrl(destination));
  }, [status, router, destination]);

  if (status !== "authenticated")
    return (
      <div className="p-12 text-center text-teal-800" role="status">
        {status === "loading"
          ? "Checking your account…"
          : "Taking you to sign in…"}
      </div>
    );
  return <>{children}</>;
}
