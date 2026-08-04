import React from 'react';

interface StatusBadgeProps {
  status: 'completed' | 'scheduled' | 'pending' | 'cancelled' | 'rescheduled' | 'confirmed';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const variants = {
    completed: 'bg-[#C8E6C9] text-[#008000] border-[#008000]',
    scheduled: 'bg-[#C4DCFF] text-[#1E5FBF] border-[#1E5FBF]',
    pending: 'bg-[#FFE0B2] text-[#FF8C00] border-[#FF8C00]',
    cancelled: 'bg-[#FFCDD2] text-[#CC0000] border-[#CC0000]',
    rescheduled: 'bg-[#C4DCFF] text-[#1E5FBF] border-[#1E5FBF]',
    confirmed: 'bg-[#C8E6C9] text-[#008000] border-[#008000]' // Green like completed
  };

  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full 
      border-2 text-xs font-bold
      ${variants[status]}
    `}>
      {children}
    </span>
  );
}
