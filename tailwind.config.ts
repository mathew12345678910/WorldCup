import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── Font families ────────────────────────────────────────────────────
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },

      // ─── Color palette (mirrors design-tokens.ts) ─────────────────────────
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Background scale
        "bg-primary": "#030712",
        "bg-secondary": "#111827",
        "bg-card": "#1f2937",
        "bg-card-hover": "#374151",

        // Accent scale
        "accent-primary": "#6366f1",
        "accent-secondary": "#818cf8",
        "accent-success": "#10b981",
        "accent-warning": "#f59e0b",
        "accent-error": "#ef4444",
        "accent-info": "#3b82f6",

        // Text scale
        "text-primary": "#f9fafb",
        "text-secondary": "#9ca3af",
        "text-muted": "#6b7280",

        // Status
        "status-saving": "#f59e0b",
        "status-saved": "#10b981",
        "status-error": "#ef4444",
        "status-locked": "#6b7280",
      },

      // ─── Keyframes ────────────────────────────────────────────────────────
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(99,102,241,0)" },
          "50%": { boxShadow: "0 0 18px rgba(99,102,241,0.45)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },

      // ─── Animation utilities ──────────────────────────────────────────────
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },

      // ─── Box shadows ──────────────────────────────────────────────────────
      boxShadow: {
        card: "0 4px 6px -1px rgba(0,0,0,0.3)",
        "card-hover": "0 10px 15px -3px rgba(0,0,0,0.4)",
        glow: "0 0 15px rgba(99,102,241,0.3)",
        "glow-lg": "0 0 30px rgba(99,102,241,0.4)",
      },

      // ─── Border radius extensions ─────────────────────────────────────────
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
