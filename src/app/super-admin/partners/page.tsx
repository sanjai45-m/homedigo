'use client';

import React from 'react';
import PartnersManager from '@/components/partners/PartnersManager';

export default function SuperAdminPartnersPage() {
  return <PartnersManager portalRole="SUPER_ADMIN" />;
}
