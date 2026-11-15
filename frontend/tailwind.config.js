/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#052b24', light: '#0a4035', dark: '#021511' },
        accent: { DEFAULT: '#00b990', light: '#0b9f7e', dark: '#08775f' },
        surface: { DEFAULT: '#061d19', card: '#092f28' },
        ink: { DEFAULT: '#eafff7', muted: '#a2beb5' },
        line: { DEFAULT: '#16483e' }
      },
      fontFamily: { sans: ['DM Sans', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 9px 28px rgba(0,0,0,.14)',
        'card-hover': '0 16px 34px rgba(0,0,0,.25), 0 0 24px rgba(0,201,162,.08)'
      }
    }
  },
  plugins: []
}
