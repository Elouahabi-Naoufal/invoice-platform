import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#1C1917",
          700: "#44403C",
          500: "#78716C",
          400: "#A8A29E",
          200: "#E7E5E4",
          100: "#F5F5F4",
          50: "#FAFAF9",
        },
        brand: {
          700: "#1D4ED8",
          600: "#2563EB",
          50: "#EFF6FF",
        },
      },
      borderRadius: {
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,25,23,.06)",
        pop: "0 8px 24px rgba(28,25,23,.12)",
        doc: "0 2px 8px rgba(28,25,23,.08), 0 12px 32px rgba(28,25,23,.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
