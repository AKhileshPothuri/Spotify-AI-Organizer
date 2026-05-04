import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Spotify design tokens
        spotify: {
          green:   '#1DB954',
          'green-bright': '#1ed760',
          black:   '#121212',
          surface: '#181818',
          elevated:'#282828',
          highlight:'#3E3E3E',
          'text-base':   '#FFFFFF',
          'text-subdued':'#B3B3B3',
          'text-muted':  '#6A6A6A',
        },
      },
      borderRadius: {
        card: '8px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
