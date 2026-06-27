/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-dark': '#4f46e5',
        secondary: '#f1f5f9',
        accent: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        surface: '#ffffff',
        muted: '#64748b',
        border: '#e2e8f0',
      },
    },
  },
  plugins: [],
};
