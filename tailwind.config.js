/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
      },
      animation: {
        'pulse-warm': 'pulse-warm 2.5s ease-in-out infinite',
        'float': 'float 5s ease-in-out infinite',
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'float-med': 'float-slow 5.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-warm': {
          '0%, 100%': { boxShadow: '0 4px 20px rgba(251,146,60,0.3), 0 0 0 0 rgba(251,146,60,0)' },
          '50%': { boxShadow: '0 4px 32px rgba(251,146,60,0.55), 0 0 0 8px rgba(251,146,60,0.08)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-9px) rotate(14deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-6px) rotate(-10deg)' },
        },
      },
    },
  },
  plugins: [],
}
