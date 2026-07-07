/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca APOINME — verde terroso, remetendo a natureza/terra.
        brand: {
          50: '#eef6f0',
          100: '#dcefe4',
          200: '#b9dfc9',
          300: '#8ac9a5',
          400: '#54ab7c',
          500: '#2f8e5e',
          600: '#1f7049',
          700: '#1a593c',
          800: '#174731',
          900: '#123a29',
        },
        // Superfícies e tinta (alinhado à paleta validada de dataviz).
        surface: '#fcfcfb',
        plane: '#f9f9f7',
        ink: {
          DEFAULT: '#0b0b0b',
          secondary: '#52514e',
          muted: '#898781',
        },
        hairline: '#e1e0d9',
        // Status (reservado — nunca reutilizar como cor de série).
        good: '#0ca30c',
        warning: '#fab219',
        serious: '#ec835a',
        critical: '#d03b3b',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,11,11,0.04), 0 1px 3px rgba(11,11,11,0.06)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};
