import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4fbe8",
          100: "#e6f5cc",
          200: "#cdeb99",
          300: "#b4e166",
          400: "#9ed05a",
          500: "#86BD40",
          600: "#6da030",
          700: "#567d26",
          800: "#3f5b1c",
          900: "#283912",
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"],
        display: ["var(--font-quicksand)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
