/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        asfarma: {
          orange: '#ea580c',
          orangeLight: '#ffedd5',
          orangeHover: '#c2410c',
          bg: '#f8f9fa',
          card: '#ffffff',
          border: '#e5e7eb',
        }
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(0) scale(0.8)', opacity: '1' },
          '100%': { transform: 'translateY(-180px) scale(1.4)', opacity: '0' },
        },
        pulseBorder: {
          '0%, 100%': { borderColor: 'rgba(234, 88, 12, 0.9)', boxShadow: '0 0 15px rgba(234, 88, 12, 0.5)' },
          '50%': { borderColor: 'rgba(234, 88, 12, 0.3)', boxShadow: '0 0 5px rgba(234, 88, 12, 0.2)' },
        }
      },
      animation: {
        'float-up': 'floatUp 2.5s ease-out forwards',
        'speaking': 'pulseBorder 1.5s infinite',
      }
    },
  },
  plugins: [],
}
