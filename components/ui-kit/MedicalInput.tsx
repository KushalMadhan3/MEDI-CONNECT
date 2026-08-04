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
        <label className="text-sm font-bold text-[#1A1A1A]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555]">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full rounded-md border-2 border-[#808080] 
            bg-white px-4 py-3 
            ${icon ? 'pl-12' : ''}
            text-black placeholder:text-[#555555]
            shadow-[inset_2px_2px_0_#E0E0E0]
            focus:border-[#1E5FBF] focus:outline-none focus:ring-2 focus:ring-[#C4DCFF]
            transition-all duration-150
            ${error ? 'border-[#CC0000]' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <span className="text-sm text-[#CC0000]">{error}</span>
      )}
    </div>
  );
}
