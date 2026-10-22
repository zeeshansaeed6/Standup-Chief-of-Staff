/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0b0f19",
          card: "#131b2e",
          cardBorder: "#1f2a44",
          cyan: "#00f0ff",
          teal: "#0df2c9",
          accent: "#22d3ee",
          amber: "#f59e0b",
        },
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(0, 240, 255, 0.4)",
        "glow-lg": "0 0 45px -5px rgba(0, 240, 255, 0.6)",
        "glow-amber": "0 0 30px -5px rgba(245, 158, 11, 0.4)",
      },
      animation: {
        "pulse-glow": "pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "wave-bar": "waveBar 1.2s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        waveBar: {
          "0%, 100%": { height: "20%" },
          "50%": { height: "100%" },
        },
      },
    },
  },
  plugins: [],
};
