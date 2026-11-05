/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Paleta MedAlert · Panel hospitalario (tomada de hospital.html).
      // Tema claro, Segoe UI, acentos rojo + navy, verde/ámbar para estados.
      colors: {
        pulse: { DEFAULT: '#d9152e', dark: '#b80e26' },
        rose: '#fff0f1',
        mint: '#1d745b',
        mintBg: '#e9f5ef',
        amber: { DEFAULT: '#946019' },
        amberBg: '#fff5df',
        navy: { DEFAULT: '#132536', 2: '#20384a' },
        ink: '#1a2d3c',
        muted: '#607181',
        line: '#e1e7ec',
        surface: '#ffffff',
        wash: '#f5f7f8',
        // Alias retro-compatibles: todas las referencias previas al tema oscuro
        // apuntan ahora a tonos claros, para que el refactor no rompa clases.
        night: { DEFAULT: '#132536', 800: '#f5f7f8', 700: '#ffffff', 600: '#e1e7ec' },
        canvas: '#f5f7f8',
      },
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'Arial', 'sans-serif'],
        display: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(19, 37, 54, 0.04), 0 4px 10px rgba(19, 37, 54, 0.04)',
      },
    },
  },
  plugins: [],
}
