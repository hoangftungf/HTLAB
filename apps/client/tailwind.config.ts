import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#1a1a2e",
          light: "#16213e",
          dark: "#0f0f23",
        },
        accent: {
          DEFAULT: "#e94560",
          light: "#ff6b81",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
