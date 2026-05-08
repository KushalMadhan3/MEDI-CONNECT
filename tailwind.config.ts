import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./App.tsx",
    "./main.tsx",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      perspective: {
        '1000': '1000px',
        '1500': '1500px',
        '2000': '2000px',
      },
      transformStyle: {
        '3d': 'preserve-3d',
      },
      backfaceVisibility: {
        'hidden': 'hidden',
      },
      animation: {
        'float-3d': 'float3D 6s ease-in-out infinite',
        'rotate-3d': 'rotate3D 8s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'shimmer': 'shimmer 3s infinite',
        'gradient': 'gradientShift 15s ease infinite',
      },
      keyframes: {
        float3D: {
          '0%, 100%': { transform: 'translateY(0px) rotateX(0deg) rotateY(0deg)' },
          '25%': { transform: 'translateY(-15px) rotateX(5deg) rotateY(2deg)' },
          '50%': { transform: 'translateY(-20px) rotateX(0deg) rotateY(0deg)' },
          '75%': { transform: 'translateY(-15px) rotateX(-5deg) rotateY(-2deg)' },
        },
        rotate3D: {
          '0%': { transform: 'rotateY(0deg) rotateX(0deg)' },
          '25%': { transform: 'rotateY(5deg) rotateX(2deg)' },
          '50%': { transform: 'rotateY(0deg) rotateX(0deg)' },
          '75%': { transform: 'rotateY(-5deg) rotateX(-2deg)' },
          '100%': { transform: 'rotateY(0deg) rotateX(0deg)' },
        },
        glow: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(63, 83, 217, 0.3), 0 0 40px rgba(124, 116, 235, 0.2), 0 0 60px rgba(52, 209, 191, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(63, 83, 217, 0.5), 0 0 60px rgba(124, 116, 235, 0.3), 0 0 90px rgba(52, 209, 191, 0.2)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

