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
  const baseClasses = 'rounded-2xl p-6 transition-all duration-300 perspective-1000';

  const variants = {
    filled: 'bg-white/90 backdrop-blur-sm shadow-lg border border-white/20',
    outlined: 'bg-white/80 backdrop-blur-sm border-2 border-[#E5E5E5]/50 shadow-md',
    pastel: 'bg-gradient-to-br from-[#F0EDFF]/90 to-[#E8EAFF]/90 backdrop-blur-sm border border-[#E8EAFF]/50 shadow-lg'
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hover || !onClick) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px) scale(1.02)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hover) return;
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0) scale(1)';
  };

  return (
    <div
      id={id}
      className={`${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
      style={{ ...style, transformStyle: 'preserve-3d' }}
    >
      <div style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </div>
  );
}
