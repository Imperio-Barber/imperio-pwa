import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        imperio: {
          black: '#080808',
          dark: '#111111',
          gold: '#d6b36a',
          light: '#f6f2ea'
        }
      }
    },
  },
  plugins: [],
}
export default config
