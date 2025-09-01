/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: "#ff0033",
        neon2: "#ff4d6d",
        dark: "#0a0b0f",
      },
    },
  },
  plugins: [],
}
