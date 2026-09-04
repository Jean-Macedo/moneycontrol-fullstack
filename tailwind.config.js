/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        uber: '#111827', // grafite
        lazer: '#7c3aed', // roxo
        metro: '#0ea5e9', // azul
        surface: '#0f172a',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
