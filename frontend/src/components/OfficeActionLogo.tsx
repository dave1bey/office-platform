import React from 'react';

interface OfficeActionLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
}

export const OfficeActionLogo: React.FC<OfficeActionLogoProps> = ({
  size = 36,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        {/* Main Background Gradient: Deep Royal Blue to Indigo */}
        <linearGradient id="oa-bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>

        {/* Card Gradient: Clean White to Soft Ice Blue */}
        <linearGradient id="oa-card" x1="16" y1="14" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F5F9" />
        </linearGradient>

        {/* Action Checkmark Emerald Gradient */}
        <linearGradient id="oa-emerald" x1="22" y1="26" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Accent Pulse / Flame Cyan Gradient */}
        <linearGradient id="oa-cyan" x1="38" y1="40" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Subtle Drop Shadow */}
        <filter id="oa-shadow" x="0" y="2" width="64" height="64" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#1e3a8a" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Outer Squircle Container */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="15"
        fill="url(#oa-bg)"
        filter="url(#oa-shadow)"
      />

      {/* Subtle Inner Highlight Border */}
      <rect
        x="4.5"
        y="4.5"
        width="55"
        height="55"
        rx="14.5"
        stroke="#93C5FD"
        strokeOpacity="0.35"
        strokeWidth="1"
      />

      {/* Action Plan Sheet / Folder (Slightly tilted background sheet) */}
      <rect
        x="20"
        y="13"
        width="28"
        height="35"
        rx="4"
        fill="#93C5FD"
        fillOpacity="0.4"
      />

      {/* Foreground Action Plan Board */}
      <rect
        x="16"
        y="16"
        width="32"
        height="38"
        rx="5"
        fill="url(#oa-card)"
      />

      {/* Clipboard Clip at Top */}
      <rect
        x="26"
        y="13"
        width="12"
        height="5"
        rx="2"
        fill="#3B82F6"
      />
      <circle cx="32" cy="15.5" r="1.2" fill="#FFFFFF" />

      {/* Checklist Line 1 (With Checkmark) */}
      <circle cx="22" cy="25" r="2.5" fill="url(#oa-emerald)" />
      <path
        d="M20.8 25.1L21.7 26L23.4 24"
        stroke="#FFFFFF"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="27" y="24" width="16" height="2.2" rx="1.1" fill="#475569" />

      {/* Checklist Line 2 (In Progress Action) */}
      <circle cx="22" cy="32" r="2.5" fill="#3B82F6" />
      <path
        d="M21.2 32H22.8"
        stroke="#FFFFFF"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <rect x="27" y="31" width="13" height="2.2" rx="1.1" fill="#64748B" />

      {/* Performance Bar Chart Accent (Bottom Right of Sheet) */}
      <rect x="22" y="44" width="3" height="4" rx="1" fill="#CBD5E1" />
      <rect x="27" y="41" width="3" height="7" rx="1" fill="#93C5FD" />
      <rect x="32" y="38" width="3" height="10" rx="1" fill="#3B82F6" />
      <rect x="37" y="36" width="3" height="12" rx="1" fill="#10B981" />

      {/* Dynamic Action Arrow / Momentum Badge */}
      <circle cx="46" cy="46" r="7" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.8" />
      <path
        d="M44 46.2L45.5 47.7L48.2 44.5"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

