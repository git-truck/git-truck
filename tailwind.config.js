/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{tsx,html}'
  ],
  theme: {
    extend: {
      animation: {
        "hide-initially": "0s 1s linear forwards hide_initially"
      }
    },
  },
  plugins: [],
}
