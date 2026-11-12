/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ethiopia: {
          green: '#009639',
          yellow: '#FFDE00',
          red: '#DA121A',
          blue: '#0F47AF',
        }
      }
    },
  },
  plugins: [],
}

