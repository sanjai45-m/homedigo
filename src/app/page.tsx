import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import {
  homeDescription,
  homeStructuredData,
  homeTitle,
  isPreview,
  socialMetadata,
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
  ...socialMetadata,
  openGraph: { ...socialMetadata.openGraph, url: siteUrl },
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
