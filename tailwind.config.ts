import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf4",
          100: "#d6f5e3",
          200: "#b0e9cb",
          300: "#7dd6ab",
          400: "#47bd86",
          500: "#22a06b",
          600: "#158055",
          700: "#126647",
          800: "#12513a",
          900: "#104331",
          950: "#06251c",
        },
      },
      fontfamily: {},
    },
  },
  plugins: [],
};

export default config;
