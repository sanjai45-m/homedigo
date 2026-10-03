import React from 'react';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import SpecialitiesDoctorSection from '@/components/landing/SpecialitiesDoctorSection';
import ServicesGrid from '@/components/landing/ServicesGrid';
import PortalsShowcase from '@/components/landing/PortalsShowcase';
import GovernanceSection from '@/components/landing/GovernanceSection';
import HowItWorks from '@/components/landing/HowItWorks';
import PartnerTrustSection from '@/components/landing/PartnerTrustSection';
import Footer from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* 1. Header & Navigation */}
      <Navbar />

      {/* 2. Hero Section with Search & Live Blueprint Preview */}
      <HeroSection />

      {/* 3. Medical Specialities & Top Verified Doctors Showcase */}
      <SpecialitiesDoctorSection />

      {/* 4. Services Catalog & Pricing */}
      <ServicesGrid />

      {/* 5. 4-Portal Blueprint Showcase (Patient, Partner, Admin, Public) */}
      <PortalsShowcase />

      {/* 6. 11-Step No-Show Governance & Quality Policy */}
      <GovernanceSection />

      {/* 7. Simple 4-Step Booking Workflow */}
      <HowItWorks />

      {/* 8. Clinical Vetting & Partner Trust */}
      <PartnerTrustSection />

      {/* 9. Global Footer */}
      <Footer />
    </main>
  );
}
