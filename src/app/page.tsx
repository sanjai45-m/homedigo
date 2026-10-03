import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "HomeDigo | Find a doctor & book care at home",
  description:
    "Find doctors by specialty and location, explore their profiles, and book your appointment with HomeDigo. Personal healthcare in the comfort of your home.",
};

export default function HomePage() {
  return <LandingPage />;
}
