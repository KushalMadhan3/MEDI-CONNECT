import React from 'react';

interface LogoProps {
  variant?: 'primary' | 'icon' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ variant = 'primary', size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  } as const;

  const iconPixelSizes = {
    sm: 32,
    md: 48,
    lg: 64
  } as const;

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  } as const;

  const iconSize = iconPixelSizes[size];

  // Icon-only logo (Medical cross + connection nodes)
  const IconLogo = () => (
    <svg 
      className={`${sizeClasses[size]} shrink-0`} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      width={iconSize}
      height={iconSize}
    >
      {/* Medical cross */}
      <path 
        d="M24 8V40M12 24H36" 
        stroke="#3F53D9" 
        strokeWidth="3" 
        strokeLinecap="round"
      />
      {/* Connection nodes */}
      <circle cx="24" cy="12" r="3" fill="#7C74EB" />
      <circle cx="24" cy="36" r="3" fill="#7C74EB" />
      <circle cx="16" cy="24" r="3" fill="#34D1BF" />
      <circle cx="32" cy="24" r="3" fill="#34D1BF" />
      {/* Center circle */}
      <circle cx="24" cy="24" r="4" fill="#3F53D9" />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={className}>
        <IconLogo />
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <IconLogo />
        <div className="flex flex-col">
          <span className={`${textSizes[size]} font-bold text-[#3F53D9]`}>
            Medi-Connect
          </span>
          <span className="text-xs text-[#6E6E6E]">Healthcare Platform</span>
        </div>
      </div>
    );
  }

  // Primary logo
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconLogo />
      <span className={`${textSizes[size]} font-bold text-[#3F53D9]`}>
        Medi-Connect
      </span>
    </div>
  );
}

export default Logo;