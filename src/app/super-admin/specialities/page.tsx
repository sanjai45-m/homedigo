'use client';

import React from 'react';
import SpecialitiesManager from '@/components/specialities/SpecialitiesManager';

export default function SuperAdminSpecialitiesPage() {
  return <SpecialitiesManager portalRole="SUPER_ADMIN" />;
}
