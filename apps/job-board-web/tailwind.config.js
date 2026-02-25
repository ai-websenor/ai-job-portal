const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
      },
      container: {
        center: true,
        padding: "1rem",
        screens: {
          "2xl": "1500px",
        },
      },
      colors: {
        primary: "#8070EF",
        secondary: "#f2f1fd",
      },
      borderColor: {
        primary: "#8070EF",
        secondary: "#f2f1fd",
      },
      backgroundColor: {
        primary: "#8070EF",
        secondary: "#f2f1fd",
      },
    },
  },
  plugins: [heroui()],
};
