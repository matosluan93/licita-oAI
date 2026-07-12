import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif'],
      },
      colors: {
        ink: '#162033',
        muted: '#65758B',
        line: '#D9E1EC',
        aqua: '#0E9AA7',
        leaf: '#2F855A',
        amber: '#B7791F',
        coral: '#D65A31',
        stefanini: {
          navy: '#061B49',
          blue: '#2847A8',
          cyan: '#48BFD0',
          green: '#8DC63F',
          orange: '#FF7A1A',
          mist: '#EEF3F8',
        },
      },
      boxShadow: {
        soft: '0 18px 60px rgba(22, 32, 51, 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
