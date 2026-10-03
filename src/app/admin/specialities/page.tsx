'use client';

import React from 'react';
import SpecialitiesManager from '@/components/specialities/SpecialitiesManager';

export default function AdminSpecialitiesPage() {
  return <SpecialitiesManager portalRole="ADMIN" />;
}
