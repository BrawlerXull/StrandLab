import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F3EE",
        shell: "#ECE6DC",
        line: "#DCD3C5",
        ink: "#1F2A2A",
        muted: "#6B726E",
        teal: { DEFAULT: "#2F6B66", dark: "#214E4A", soft: "#DCEAE7" },
        amber: { DEFAULT: "#C8862E", soft: "#F6E7CF" },
        clay: { DEFAULT: "#B5543C", soft: "#F4DCD3" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: { card: "0 1px 2px rgba(31,42,42,.05), 0 10px 28px -14px rgba(31,42,42,.18)" },
    },
  },
  plugins: [],
};
export default config;
