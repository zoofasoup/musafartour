import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Onest', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Onest', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Onest', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          press: "hsl(var(--brand-press))",
          foreground: "hsl(var(--brand-foreground))",
          soft: "hsl(var(--brand-soft))",
        },
        amber: {
          DEFAULT: "hsl(var(--amber))",
          soft: "hsl(var(--amber-soft))",
        },
        field: {
          DEFAULT: "hsl(var(--field))",
          hover: "hsl(var(--field-hover))",
        },
        "status-ok": {
          bg: "hsl(var(--status-ok-bg))",
          fg: "hsl(var(--status-ok-fg))",
          border: "hsl(var(--status-ok-border))",
          text: "hsl(var(--status-ok-text))",
        },
        "status-warn": {
          bg: "hsl(var(--status-warn-bg))",
          fg: "hsl(var(--status-warn-fg))",
          border: "hsl(var(--status-warn-border))",
          text: "hsl(var(--status-warn-text))",
        },
        "status-info": {
          bg: "hsl(var(--status-info-bg))",
          fg: "hsl(var(--status-info-fg))",
          border: "hsl(var(--status-info-border))",
        },
        "status-over": {
          bg: "hsl(var(--status-over-bg))",
          fg: "hsl(var(--status-over-fg))",
          border: "hsl(var(--status-over-border))",
        },
        "status-bad": {
          bg: "hsl(var(--status-bad-bg))",
          fg: "hsl(var(--status-bad-fg))",
          border: "hsl(var(--status-bad-border))",
          text: "hsl(var(--status-bad-text))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      // DESIGN.md: lg 12 (cards, dialogs), md 8 (buttons, inputs), sm 6 (status). xl, 2xl and 3xl keep Tailwind's 12, 16 and 24.
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
      },
      // Two shadow levels, tinted with the neutral. sm/DEFAULT/md are level 1; lg and above are level 2.
      boxShadow: {
        sm: "0 4px 14px -2px rgb(var(--shadow-rgb) / 0.16), 0 1px 2px rgb(var(--shadow-rgb) / 0.12)",
        DEFAULT: "0 4px 14px -2px rgb(var(--shadow-rgb) / 0.16), 0 1px 2px rgb(var(--shadow-rgb) / 0.12)",
        md: "0 4px 14px -2px rgb(var(--shadow-rgb) / 0.16), 0 1px 2px rgb(var(--shadow-rgb) / 0.12)",
        lg: "0 16px 40px rgb(var(--shadow-rgb) / 0.22), 0 2px 8px rgb(var(--shadow-rgb) / 0.10)",
        xl: "0 16px 40px rgb(var(--shadow-rgb) / 0.22), 0 2px 8px rgb(var(--shadow-rgb) / 0.10)",
        "2xl": "0 16px 40px rgb(var(--shadow-rgb) / 0.22), 0 2px 8px rgb(var(--shadow-rgb) / 0.10)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "spin-slow": {
          from: {
            transform: "translateX(-50%) rotate(0deg)",
          },
          to: {
            transform: "translateX(-50%) rotate(360deg)",
          },
        },
        "cart-pop": {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "30%": { transform: "scale(1.35) rotate(-10deg)" },
          "55%": { transform: "scale(0.9) rotate(6deg)" },
          "80%": { transform: "scale(1.08) rotate(-2deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "spin-slow": "spin-slow 40s linear infinite",
        "cart-pop": "cart-pop 0.5s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
