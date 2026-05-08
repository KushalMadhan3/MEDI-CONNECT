import React from 'react';

interface MedicalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outlined' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function MedicalButton({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}: MedicalButtonProps) {
  const baseClasses = 'rounded-xl font-medium transition-all duration-300 btn-3d disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';
  
  const variants = {
    primary: 'bg-gradient-to-r from-[#3F53D9] to-[#7C74EB] text-white hover:from-[#3346B8] hover:to-[#6B63D8] shadow-lg shadow-[#3F53D9]/30 hover:shadow-xl hover:shadow-[#3F53D9]/40',
    secondary: 'bg-gradient-to-r from-[#7C74EB] to-[#9B8FFF] text-white hover:from-[#6B63D8] hover:to-[#8B7FE8] shadow-lg shadow-[#7C74EB]/30 hover:shadow-xl hover:shadow-[#7C74EB]/40',
    outlined: 'border-2 border-[#3F53D9] text-[#3F53D9] bg-white/80 backdrop-blur-sm hover:bg-gradient-to-r hover:from-[#E8EAFF] hover:to-[#F0EDFF] hover:border-[#7C74EB] hover:text-[#7C74EB] shadow-md hover:shadow-lg',
    ghost: 'text-[#3F53D9] hover:bg-gradient-to-r hover:from-[#E8EAFF]/50 hover:to-[#F0EDFF]/50 backdrop-blur-sm'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      {(variant === 'primary' || variant === 'secondary') && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
      )}
    </button>
  );
}
