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
        stroke="#1E5FBF" 
        strokeWidth="3" 
        strokeLinecap="round"
      />
      {/* Connection nodes */}
      <circle cx="24" cy="12" r="3" fill="#8A2BE2" />
      <circle cx="24" cy="36" r="3" fill="#8A2BE2" />
      <circle cx="16" cy="24" r="3" fill="#008080" />
      <circle cx="32" cy="24" r="3" fill="#008080" />
      {/* Center circle */}
      <circle cx="24" cy="24" r="4" fill="#1E5FBF" />
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
          <span className={`${textSizes[size]} font-bold text-[#1E5FBF]`}>
            Medi-Connect
          </span>
          <span className="text-xs text-[#555555]">Healthcare Platform</span>
        </div>
      </div>
    );
  }

  // Primary logo
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconLogo />
      <span className={`${textSizes[size]} font-bold text-[#1E5FBF]`}>
        Medi-Connect
      </span>
    </div>
  );
}

export default Logo;