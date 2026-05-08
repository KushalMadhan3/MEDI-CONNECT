import React from 'react';

export function HospitalIllustration({ className = '' }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 400 300" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Building base */}
      <rect x="80" y="100" width="240" height="180" fill="#E8EAFF" stroke="#3F53D9" strokeWidth="2" rx="8"/>
      
      {/* Roof */}
      <path d="M70 100 L200 40 L330 100" fill="#7C74EB" stroke="#3F53D9" strokeWidth="2"/>
      
      {/* Medical cross on roof */}
      <rect x="185" y="60" width="30" height="8" fill="white" rx="2"/>
      <rect x="195" y="50" width="10" height="28" fill="white" rx="2"/>
      
      {/* Windows - First floor */}
      <rect x="100" y="120" width="40" height="35" fill="white" stroke="#7C74EB" strokeWidth="2" rx="4"/>
      <rect x="160" y="120" width="40" height="35" fill="white" stroke="#7C74EB" strokeWidth="2" rx="4"/>
      <rect x="220" y="120" width="40" height="35" fill="white" stroke="#7C74EB" strokeWidth="2" rx="4"/>
      <rect x="280" y="120" width="40" height="35" fill="white" stroke="#7C74EB" strokeWidth="2" rx="4"/>
      
      {/* Windows - Second floor */}
      <rect x="100" y="170" width="40" height="35" fill="white" stroke="#7C74EB" strokeWidth="2" rx="4"/>
      <rect x="160" y="170" width="40" height="35" fill="white" stroke="#7C74EB" strokeWidth="2" rx="4"/>
      <rect x="220" y="170" width="40" height="35" fill="white" stroke="#7C74EB" strokeWidth="2" rx="4"/>
      <rect x="280" y="170" width="40" height="35" fill="white" stroke="#7C74EB" strokeWidth="2" rx="4"/>
      
      {/* Door */}
      <rect x="170" y="220" width="60" height="60" fill="#3F53D9" rx="4"/>
      <circle cx="215" cy="250" r="4" fill="white"/>
      
      {/* Trees */}
      <circle cx="40" cy="200" r="25" fill="#34D1BF" opacity="0.6"/>
      <rect x="35" y="210" width="10" height="40" fill="#6E6E6E" opacity="0.4"/>
      
      <circle cx="360" cy="200" r="25" fill="#34D1BF" opacity="0.6"/>
      <rect x="355" y="210" width="10" height="40" fill="#6E6E6E" opacity="0.4"/>
      
      {/* Ground */}
      <rect y="250" width="400" height="50" fill="#F0EDFF"/>
      
      {/* Ambulance */}
      <rect x="20" y="235" width="50" height="30" fill="white" stroke="#E53935" strokeWidth="2" rx="4"/>
      <rect x="35" y="220" width="20" height="15" fill="white" stroke="#E53935" strokeWidth="2" rx="2"/>
      <circle cx="30" cy="265" r="6" fill="#333333"/>
      <circle cx="60" cy="265" r="6" fill="#333333"/>
      <path d="M45 240 L50 240 M47.5 237.5 L47.5 242.5" stroke="#E53935" strokeWidth="2"/>
    </svg>
  );
}
