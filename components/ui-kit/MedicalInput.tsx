import React from 'react';

interface MedicalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function MedicalInput({ 
  label, 
  error, 
  icon, 
  className = '', 
  ...props 
}: MedicalInputProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label className="text-sm font-medium text-[#333333]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6E6E]">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full rounded-xl border-2 border-[#E5E5E5] 
            bg-white px-4 py-3 
            ${icon ? 'pl-12' : ''}
            text-black placeholder:text-[#6E6E6E]
            focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#E8EAFF]
            transition-all duration-200
            ${error ? 'border-[#E53935]' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <span className="text-sm text-[#E53935]">{error}</span>
      )}
    </div>
  );
}
