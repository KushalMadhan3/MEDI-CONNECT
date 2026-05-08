import React from 'react';

export function MedicalIcons() {
  return null;
}

// Doctor Consultation Icon
export function DoctorIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="20" r="10" stroke="#3F53D9" strokeWidth="2" fill="#E8EAFF"/>
      <path d="M18 44 C18 36 24 32 32 32 C40 32 46 36 46 44 L46 52 L18 52 Z" fill="#7C74EB" stroke="#3F53D9" strokeWidth="2"/>
      <path d="M28 36 L36 36 M32 32 L32 40" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Appointment Calendar Icon
export function AppointmentIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="16" width="40" height="36" rx="4" fill="#E8EAFF" stroke="#3F53D9" strokeWidth="2"/>
      <rect x="12" y="16" width="40" height="10" fill="#7C74EB"/>
      <line x1="22" y1="12" x2="22" y2="20" stroke="#3F53D9" strokeWidth="2" strokeLinecap="round"/>
      <line x1="42" y1="12" x2="42" y2="20" stroke="#3F53D9" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="22" cy="36" r="2" fill="#3F53D9"/>
      <circle cx="32" cy="36" r="2" fill="#3F53D9"/>
      <circle cx="42" cy="36" r="2" fill="#3F53D9"/>
      <circle cx="22" cy="44" r="2" fill="#3F53D9"/>
      <circle cx="32" cy="44" r="2" fill="#E53935"/>
    </svg>
  );
}

// Medical Records Icon
export function RecordsIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="8" width="32" height="48" rx="4" fill="#E8EAFF" stroke="#3F53D9" strokeWidth="2"/>
      <line x1="24" y1="20" x2="40" y2="20" stroke="#7C74EB" strokeWidth="2" strokeLinecap="round"/>
      <line x1="24" y1="28" x2="40" y2="28" stroke="#7C74EB" strokeWidth="2" strokeLinecap="round"/>
      <line x1="24" y1="36" x2="36" y2="36" stroke="#7C74EB" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="32" cy="44" r="6" fill="#34D1BF" opacity="0.3"/>
      <path d="M32 41 L32 47 M29 44 L35 44" stroke="#34D1BF" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// Pharmacy Icon
export function PharmacyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="24" width="24" height="28" rx="4" fill="#E8EAFF" stroke="#3F53D9" strokeWidth="2"/>
      <path d="M32 29 L32 47 M23 38 L41 38" stroke="#E53935" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="28" cy="16" r="4" fill="#34D1BF" opacity="0.4"/>
      <circle cx="38" cy="14" r="3" fill="#7C74EB" opacity="0.4"/>
      <circle cx="46" cy="36" r="3" fill="#FFB020" opacity="0.4"/>
    </svg>
  );
}

// Specialties Icon
export function SpecialtiesIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="28" r="12" fill="#E8EAFF" stroke="#3F53D9" strokeWidth="2"/>
      <path d="M32 22 L32 34 M26 28 L38 28" stroke="#7C74EB" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 42 C22 42 26 38 32 38 C38 38 42 42 42 42" stroke="#3F53D9" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="20" cy="50" r="3" fill="#34D1BF"/>
      <circle cx="32" cy="50" r="3" fill="#34D1BF"/>
      <circle cx="44" cy="50" r="3" fill="#34D1BF"/>
    </svg>
  );
}

// Location Icon
export function LocationIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 12 C24 12 18 18 18 26 C18 34 32 52 32 52 C32 52 46 34 46 26 C46 18 40 12 32 12 Z" fill="#E8EAFF" stroke="#3F53D9" strokeWidth="2"/>
      <circle cx="32" cy="26" r="6" fill="#7C74EB"/>
    </svg>
  );
}

// Second Opinion Icon
export function SecondOpinionIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="10" fill="#E8EAFF" stroke="#3F53D9" strokeWidth="2"/>
      <circle cx="40" cy="40" r="10" fill="#F0EDFF" stroke="#7C74EB" strokeWidth="2"/>
      <path d="M30 30 L34 34" stroke="#34D1BF" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 22 L22 26 M20 24 L24 24" stroke="#3F53D9" strokeWidth="1.5"/>
      <path d="M38 38 L38 42 M36 40 L40 40" stroke="#7C74EB" strokeWidth="1.5"/>
    </svg>
  );
}
