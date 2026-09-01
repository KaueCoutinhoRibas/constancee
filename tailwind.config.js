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
        surface: {
          bg: '#0D0E12',       // Fundo escuro principal
          card: '#14161D',     // Cards em camada
          hover: '#1B1E28',    // Efeito hover
          border: '#262938',   // Bordas sutis
          muted: '#32364A',
        },
        brand: {
          DEFAULT: '#9146FF',  // Roxo principal estilo Twitch
          hover: '#772CE8',
          subtle: 'rgba(145, 70, 255, 0.12)',
          border: 'rgba(145, 70, 255, 0.3)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}