import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Comic book palette
        comic: {
          pink: '#FF3D77',
          'pink-hover': '#E02860',
          yellow: '#FFD600',
          blue: '#4FC3F7',
          green: '#00D26A',
          cream: '#FFF8F0',
          black: '#0A0A0A',
        },
        // Legacy aliases so existing code doesn't break immediately
        brand: {
          bg: '#FFF8F0',
          red: '#FF3D77',
          'red-hover': '#E02860',
          text: '#0A0A0A',
          muted: '#555555',
          card: '#FFFFFF',
          border: '#0A0A0A',
        },
      },
      fontFamily: {
        pretendard: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        bungee: ['Bungee', 'cursive'],
      },
      boxShadow: {
        comic: '4px 4px 0 #0A0A0A',
        'comic-md': '6px 6px 0 #0A0A0A',
        'comic-lg': '8px 8px 0 #0A0A0A',
        'comic-xl': '12px 12px 0 #0A0A0A',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};

export default config;
