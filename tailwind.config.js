/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        electoral: {
          navy: '#0f172a',
          blue: '#1d4ed8',
          yellow: '#eab308',
          green: '#15803d',
          red: '#dc2626',
          teal: '#0d9488',
          purple: '#7c3aed',
          orange: '#ea580c'
        }
      }
    },
  },
  plugins: [],
}
