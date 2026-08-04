import React from 'react';

interface MedicalCardProps {
  children: React.ReactNode;
  variant?: 'filled' | 'outlined' | 'pastel';
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  id?: string;
}

export function MedicalCard({
  children,
  variant = 'filled',
  className = '',
  hover = true,
  onClick,
  style,
  id
}: MedicalCardProps) {
  const baseClasses = 'rounded-xl p-6 transition-all duration-200';

  const variants = {
    filled: 'bg-[#FEFEFE] border-2 border-[#A8B6CC] shadow-[4px_4px_0_#A8B6CC]',
    outlined: 'bg-[#F8FAFF] border-2 border-[#C2CFE3] shadow-[3px_3px_0_#C2CFE3]',
    pastel: 'bg-gradient-to-br from-[#E0CFFF] to-[#C4DCFF] border-2 border-[#8A2BE2]/50 shadow-[4px_4px_0_#8A2BE2]'
  };

  const hoverClasses = hover
    ? 'card-3d cursor-pointer group'
    : '';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      id={id}
      className={`${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
      style={style}
    >
      <div>
        {children}
      </div>
    </div>
  );
}
