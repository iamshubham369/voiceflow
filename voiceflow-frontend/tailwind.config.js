/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e1e9ff',
          200: '#c8daff',
          300: '#a1c2ff',
          400: '#719eff',
          500: '#4171f6',
          600: '#2b52db',
          700: '#203fb7',
          800: '#1e3594',
          900: '#1d3077',
          950: '#111a49',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'waveform-bounce': 'bounceBar 0.9s ease-in-out infinite',
      },
      keyframes: {
        bounceBar: {
          '0%, 100%': { transform: 'scaleY(0.2)' },
          '50%': { transform: 'scaleY(1.0)' },
        }
      }
    },
  },
  plugins: [],
}
