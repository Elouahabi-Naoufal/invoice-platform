import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // TailAdmin gray scale (mapped onto our ink tokens so pages reskin automatically)
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
      borderRadius: {
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,0.08)",
        pop: "0 12px 32px rgba(16,24,40,0.18)",
        doc: "0 2px 8px rgba(16,24,40,0.08), 0 12px 32px rgba(16,24,40,0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
