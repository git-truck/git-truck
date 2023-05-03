/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{tsx,html}"],
  theme: {
    extend: {
      animation: {
        "hide-initially": "0s 1s linear forwards hide_initially",
        blink: "1s linear infinite blink",
        "stroke-pulse": "1s ease-in-out infinite stroke_pulse",
      },
      fontFamily: {
        mono: ["Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
