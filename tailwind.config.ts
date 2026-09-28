import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12161C",
        surface: "#1C222B",
        surface2: "#232A34",
        line: "#2D3540",
        paper: "#EDEAE2",
        muted: "#7C8591",
        amber: "#E8A33D",
        teal: "#5FD9C3",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
