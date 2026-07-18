import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12151A",
        surface: "#181C23",
        surface2: "#1E232B",
        border: "#2A2F38",
        ivory: "#EDE8DD",
        muted: "#8B8F98",
        brass: "#C89B3C",
        brassDim: "#9C7A2E",
        emerald: "#3E8E77",
        rust: "#B4482D",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
