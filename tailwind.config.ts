import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        background: {
          primary: "rgb(var(--bg-primary) / <alpha-value>)",
          secondary: "rgb(var(--bg-secondary) / <alpha-value>)",
          tertiary: "rgb(var(--bg-tertiary) / <alpha-value>)",
        },
        surface: {
          elevated: "rgb(var(--surface-elevated-rgb) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--text-primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary-rgb) / <alpha-value>)",
          tertiary: "rgb(var(--text-tertiary-rgb) / <alpha-value>)",
          inverse: "rgb(var(--text-inverse-rgb) / <alpha-value>)",
        },
        brand: {
          primary: "rgb(var(--brand-primary-rgb) / <alpha-value>)",
          "primary-hover": "rgb(var(--brand-primary-hover-rgb) / <alpha-value>)",
          "primary-active": "rgb(var(--brand-primary-active-rgb) / <alpha-value>)",
          "primary-muted": "rgb(var(--brand-primary-muted-rgb) / <alpha-value>)",
          "primary-surface": "rgb(var(--brand-primary-surface-rgb) / <alpha-value>)",
          secondary: "rgb(var(--brand-secondary-rgb) / <alpha-value>)",
          "secondary-muted": "rgb(var(--brand-secondary-muted-rgb) / <alpha-value>)",
        },
        border: {
          default: "rgb(var(--border-default-rgb) / <alpha-value>)",
          strong: "rgb(var(--border-strong-rgb) / <alpha-value>)",
          focus: "rgb(var(--border-focus-rgb) / <alpha-value>)",
        },
        state: {
          success: "rgb(var(--state-success-rgb) / <alpha-value>)",
          warning: "rgb(var(--state-warning-rgb) / <alpha-value>)",
          error: "rgb(var(--state-error-rgb) / <alpha-value>)",
          info: "rgb(var(--state-info-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
    },
  },
};

export default config;
