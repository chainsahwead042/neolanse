/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: '#FFD700',
        'neon-dim': '#B8960C',
        'neon-bright': '#FFEC00',
        brick: '#1a1a1a',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
        body: ['"Barlow"', 'sans-serif'],
      }
    }
  },
  plugins: []
}
