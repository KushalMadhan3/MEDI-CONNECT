import React from 'react';

interface StatusBadgeProps {
  status: 'completed' | 'scheduled' | 'pending' | 'cancelled' | 'rescheduled' | 'confirmed';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const variants = {
    completed: 'bg-[#E8F5E9] text-[#4CAF50] border-[#4CAF50]',
    scheduled: 'bg-[#E8EAFF] text-[#3F53D9] border-[#3F53D9]',
    pending: 'bg-[#FFF4E5] text-[#FFB020] border-[#FFB020]',
    cancelled: 'bg-[#FFEBEE] text-[#E53935] border-[#E53935]',
    rescheduled: 'bg-[#E8EAFF] text-[#3F53D9] border-[#3F53D9]',
    confirmed: 'bg-[#E8F5E9] text-[#4CAF50] border-[#4CAF50]' // Green like completed
  };

  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full 
      border text-sm font-medium
      ${variants[status]}
    `}>
      {children}
    </span>
  );
}
