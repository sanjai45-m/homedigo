import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import {
  homeDescription,
  homeStructuredData,
  homeTitle,
  isPreview,
  siteName,
  siteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: homeTitle },
  description: homeDescription,
  alternates: { canonical: "/" },
  robots: {
    index: !isPreview,
    follow: true,
    googleBot: {
      index: !isPreview,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName,
    title: homeTitle,
    description: homeDescription,
    images: [{
      url: "/images/home-care-hero.webp",
      width: 1440,
      height: 960,
      alt: "HomeDigo home healthcare: a doctor visiting a patient at home",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: [{
      url: "/images/home-care-hero.webp",
      alt: "HomeDigo home healthcare: a doctor visiting a patient at home",
    }],
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  );
}
