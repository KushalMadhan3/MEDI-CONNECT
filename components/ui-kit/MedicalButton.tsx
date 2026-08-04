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
  const baseClasses = 'rounded-lg font-bold transition-all duration-150 btn-3d disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';
  
  const variants = {
    primary: 'bg-gradient-to-b from-[#2E7CE0] to-[#1E5FBF] text-white border-2 border-[#0E3D85] shadow-[0_5px_0_#0E3D85] hover:from-[#3A8AF0] hover:to-[#2E63C8] hover:shadow-[0_6px_0_#0E3D85]',
    secondary: 'bg-gradient-to-b from-[#A14EF0] to-[#8A2BE2] text-white border-2 border-[#5E1FAE] shadow-[0_5px_0_#5E1FAE] hover:from-[#B25FF5] hover:to-[#9B39EC] hover:shadow-[0_6px_0_#5E1FAE]',
    outlined: 'bg-white text-[#1E5FBF] border-2 border-[#1E5FBF] shadow-[0_4px_0_#1E5FBF] hover:bg-[#E4EFFF] hover:text-[#8A2BE2] hover:border-[#8A2BE2] hover:shadow-[0_4px_0_#8A2BE2]',
    ghost: 'text-[#1E5FBF] hover:bg-[#E4EFFF] hover:text-[#8A2BE2]'
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
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
      )}
    </button>
  );
}
