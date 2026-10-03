'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: string;
  href?: string;
  className?: string;
}

export default function Logo({
  size = 'md',
  showBadge,
  href = '/',
  className = '',
}: LogoProps) {
  const sizeMap = {
    sm: { height: 36, width: 36 },
    md: { height: 48, width: 48 },
    lg: { height: 60, width: 60 },
    xl: { height: 76, width: 76 },
  };

  const badgeColorMap: Record<string, string> = {
    'SUPER ADMIN': 'bg-purple-50 text-purple-700 border-purple-200',
    'ADMIN': 'bg-amber-50 text-amber-800 border-amber-200',
    'PARTNER': 'bg-teal-50 text-teal-800 border-teal-200',
    'PATIENT': 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const badgeStyle = showBadge
    ? badgeColorMap[showBadge.toUpperCase()] || 'bg-slate-100 text-slate-700 border-slate-200'
    : '';

  const content = (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center">
        <Image
          src="/logo.png"
          alt="HomeDigo Logo"
          width={sizeMap[size].width}
          height={sizeMap[size].height}
          className="object-contain w-auto h-auto max-h-[48px] rounded-xl"
          priority
        />
      </div>

      {showBadge && (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${badgeStyle}`}
        >
          {showBadge}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
