import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#071f18",
          900: "#0b3d2e",
          800: "#12543f",
          700: "#1a6b50",
          600: "#22815f"
        },
        gold: {
          500: "#c9a227",
          400: "#e0c05a",
          300: "#f0d98a"
        },
        cream: {
          50: "#fbf8f1",
          100: "#f5f0e6",
          200: "#ebe3d1"
        },
        ink: "#1f2933"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        card: "0 18px 40px -24px rgba(11, 61, 46, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
