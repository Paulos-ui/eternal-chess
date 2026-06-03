import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          900: "#05070F",
          800: "#070A14",
          700: "#0A0E1C",
          600: "#111827",
        },
        ice: {
          DEFAULT: "#22D3EE",
          bright: "#67E8F9",
          deep: "#00C2FF",
          frost: "#CFFAFE",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "monospace"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        ice: "0 0 0 1px rgba(34,211,238,0.25), 0 0 24px -4px rgba(34,211,238,0.45)",
        "ice-lg": "0 0 0 1px rgba(34,211,238,0.35), 0 0 60px -8px rgba(34,211,238,0.55)",
      },
      keyframes: {
        "frost-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "drift": {
          "0%": { transform: "translateY(0px)" },
          "100%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "frost-pulse": "frost-pulse 3s ease-in-out infinite",
        "drift": "drift 6s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
