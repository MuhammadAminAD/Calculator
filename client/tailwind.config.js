/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'calc-bg': '#0f172a',
        'calc-surface': '#1e293b',
        'calc-accent': '#38bdf8',
        'calc-text': '#f1f5f9',
      },
    },
  },
  plugins: [],
}
