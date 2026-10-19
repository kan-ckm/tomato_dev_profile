import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/config/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b0f",
        surface: "rgba(255, 255, 255, 0.04)",
        "surface-hover": "rgba(255, 255, 255, 0.08)",
        border: "rgba(255, 255, 255, 0.08)",
        "border-hover": "rgba(178, 137, 239, 0.4)",
        accent: "#b289ef",
        accent2: "#9661ff",
        accent3: "#d4a8ff",
        text: "#f0edf7",
        muted: "rgba(240, 237, 247, 0.45)",
      },
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        display: ["'Syne'", "sans-serif"],
        numeric: ["'Rubik'", "sans-serif"],
        strip: ["'Bitcount Single'", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        "card-sm": "12px",
        panel: "24px",
      },
      boxShadow: {
        glow: "0 0 40px rgba(178, 137, 239, 0.15)",
        panel: "0 10px 30px rgba(0, 0, 0, 0.2)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        spinSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        statusPulse: {
          "0%": { transform: "translate(-50%, -50%) scale(1)", opacity: "0.8" },
          "60%, 100%": { transform: "translate(-50%, -50%) scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease both",
        "spin-slow": "spinSlow 6s linear infinite",
        "status-pulse": "statusPulse 4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
