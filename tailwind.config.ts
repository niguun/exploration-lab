import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#F5F0E8',
        cream: '#EDE7DB',
        parchment: '#E8E0D0',
        navy: { DEFAULT: '#1B2A4A', light: '#2D3F5E' },
        graphite: '#4A5568',
        muted: '#7A8599',
        brass: '#B08D57',
        amber: { DEFAULT: '#C49A3C', light: '#D4A847' },
        teal: { DEFAULT: '#2B7A78', light: '#3AAFA9' },
        'warm-red': '#C65D4A',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
