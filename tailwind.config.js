/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      'light',
      'dark',
      'cupcake',
      'pastel',
      'dracula',
      'wireframe',
      'cyberpunk',
      'forest',
      'luxury',
      'retro',
      'synthwave',
      'valentine',
      'halloween',
      'garden',
      'lofi',
      'fantasy',
    ], // Add the themes you want to use
  },
}
