/** @type {import('tailwindcss').Config} */
const brandGold = {
  50: '#fcf8ef',
  100: '#f8f0db',
  200: '#efdfb5',
  300: '#e3ca89',
  400: '#d7b159',
  500: '#c9862b', // Official Minor Accent: #C9862B
  600: '#b26f21',
  700: '#91521c',
  800: '#76421c',
  900: '#63361b',
  950: '#381c0d',
};

const brandGreen = {
  50: '#f3f7f5',
  100: '#e1ece7',
  200: '#c5dbd1',
  300: '#9fc3b5',
  400: '#71a494',
  500: '#4b8575',
  600: '#3b6d60',
  700: '#30534a', // Official Major Brand Green: #30534A
  800: '#28443d',
  900: '#223833', // Deep Forest (replaces slate-900 / black)
  950: '#162522', // Deep Pine (replaces slate-950 / pure black)
};

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: brandGreen,
        gold: brandGold,
        amber: brandGold, // Harmonize all existing amber accents to brand gold #C9862B
      },
    },
  },
  plugins: [],
};
