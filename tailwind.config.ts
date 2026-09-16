import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Tight, consistent radii — professional/enterprise feel (no pill cards).
    borderRadius: {
      none: "0px",
      sm: "2px",
      DEFAULT: "3px",
      md: "4px",
      lg: "4px",
      xl: "4px",
      "2xl": "4px",
      "3xl": "4px",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Neutral gray scale mapped onto our ink tokens so pages reskin automatically.
        ink: {
          950: "#101828",
          700: "#344054",
          500: "#667085",
          400: "#98A2B3",
          200: "#E4E7EC",
          100: "#F2F4F7",
          50: "#F9FAFB",
        },
        brand: {
          700: "#2A31D8",
          600: "#3641F5",
          500: "#465FFF",
          400: "#7592FF",
          100: "#DDE9FF",
          50: "#ECF3FF",
        },
        success: { 50: "#ECFDF3", 500: "#12B76A", 600: "#039855" },
        warning: { 50: "#FFFAEB", 500: "#F79009", 600: "#DC6803" },
        error: { 50: "#FEF3F2", 500: "#F04438", 600: "#D92D20" },
        info: { 50: "#F0F9FF", 500: "#0BA5EC", 600: "#0086C9" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04)",
        pop: "0 8px 24px rgba(16,24,40,0.14)",
        doc: "0 1px 3px rgba(16,24,40,0.06), 0 10px 24px rgba(16,24,40,0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
