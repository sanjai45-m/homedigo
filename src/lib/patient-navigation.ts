/** Only allow known patient destinations after authentication. */
export function patientDestination(value: string | null): string {
  const fallback = "/patient/dashboard";
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return fallback;
  try {
    const url = new URL(value, "https://homedigo.local");
    const allowed = [
      "/patient/book",
      "/patient/dashboard",
      "/patient/appointments",
      "/patient/family",
      "/patient/addresses",
      "/patient/invoices",
    ];
    if (
      url.origin !== "https://homedigo.local" ||
      !allowed.includes(url.pathname)
    )
      return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function doctorBookingUrl(doctorId: string): string {
  return `/patient/book?${new URLSearchParams({ doctor: doctorId, service: "srv_doc" })}`;
}

export function patientSignInUrl(destination: string): string {
  return `/patient/login?${new URLSearchParams({ redirect: patientDestination(destination) })}`;
}
