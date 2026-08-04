import React from 'react';

export function MedicalBackground() {
  return (
    <svg 
      className="fixed top-0 right-0 w-1/2 h-full opacity-5 pointer-events-none z-0"
      viewBox="0 0 600 800" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stethoscope */}
      <path 
        d="M200 150 Q250 180 250 230 L250 380 Q250 420 280 440 Q310 460 340 440 Q370 420 370 380 L370 230 Q370 180 420 150" 
        stroke="#1E5FBF" 
        strokeWidth="4" 
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="200" cy="130" r="20" fill="#8A2BE2" />
      <circle cx="420" cy="130" r="20" fill="#8A2BE2" />
      <circle cx="310" cy="470" r="30" fill="#008080" opacity="0.6" />
      
      {/* Medical cross */}
      <path d="M480 200 L480 280 M440 240 L520 240" stroke="#8A2BE2" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
      
      {/* Pills */}
      <ellipse cx="150" cy="400" rx="20" ry="35" fill="#FF8C00" opacity="0.3" transform="rotate(45 150 400)" />
      <ellipse cx="500" cy="450" rx="18" ry="32" fill="#CC0000" opacity="0.3" transform="rotate(-30 500 450)" />
      
      {/* Heart rate line */}
      <path 
        d="M50 600 L100 600 L120 560 L140 640 L160 600 L550 600" 
        stroke="#1E5FBF" 
        strokeWidth="3" 
        fill="none"
        opacity="0.3"
      />
      
      {/* DNA Helix */}
      <path 
        d="M100 100 Q120 120 120 140 Q120 160 100 180 Q80 200 80 220 Q80 240 100 260" 
        stroke="#008080" 
        strokeWidth="3" 
        fill="none"
        opacity="0.4"
      />
      <path 
        d="M120 100 Q100 120 100 140 Q100 160 120 180 Q140 200 140 220 Q140 240 120 260" 
        stroke="#008080" 
        strokeWidth="3" 
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}
