import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        accent: {
          orange: "#f97316",
          green: "#16a34a",
        },
        "admin-green": "#2d6a2d",
        secondary: "#1a6fd4",
        dark: "#1a1a1a",
      },
    },
  },
  plugins: [],
};

export default config;
