const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["themes/**/*.html", "./content/**/*.md"],
  theme: {
    extend: {
      colors: {
        "dos-pink": "#f72585",
        "dos-blue": "#4cc9f0",
        "dos-white": "#fafafa",
        "dos-black": "#333",
        "dos-background": "#34404e"
      },
      fontFamily: {
        sans: ['"Saira"', ...defaultTheme.fontFamily.sans]
      }
    }
  },
  variants: {},
  plugins: []
};
