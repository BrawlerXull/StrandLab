import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Colours are CSS variables (see globals.css) so the high-contrast mode can swap the palette.
      colors: {
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        shell: "rgb(var(--c-shell) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        teal: { DEFAULT: "rgb(var(--c-teal) / <alpha-value>)", dark: "rgb(var(--c-teal-dark) / <alpha-value>)", soft: "rgb(var(--c-teal-soft) / <alpha-value>)" },
        amber: { DEFAULT: "rgb(var(--c-amber) / <alpha-value>)", soft: "rgb(var(--c-amber-soft) / <alpha-value>)" },
        clay: { DEFAULT: "rgb(var(--c-clay) / <alpha-value>)", soft: "rgb(var(--c-clay-soft) / <alpha-value>)" },
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
