/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF9F6', // Warm off-white
        surface: '#FFFFFF',
        primary: {
          50: '#F0FDF8',
          100: '#CCFBF1',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E', // Main Teal
          800: '#115E59',
          900: '#134E4A',
        },
        text: {
          main: '#1C1917', // stone-900
          muted: '#57534E', // stone-600
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
