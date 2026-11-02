/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Paleta oficial MedAlert (misma que lib/theme/colors.dart de la app móvil)
      colors: {
        pulse: { DEFAULT: '#E63946', dark: '#C62F3B' },
        mint: '#4DAE91',
        amber: { DEFAULT: '#E8A33D' },
        night: { DEFAULT: '#0C1420', 800: '#0F1923', 700: '#152230', 600: '#1C2C3D' },
        canvas: '#F2EDE4',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
