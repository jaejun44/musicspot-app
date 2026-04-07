import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0A0A0A',
          red: '#E84040',
          'red-hover': '#D03030',
          text: '#FFFFFF',
          muted: '#A0A0A0',
          card: '#1A1A1A',
          border: '#2A2A2A',
        },
      },
      fontFamily: {
        pretendard: ['Pretendard', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
