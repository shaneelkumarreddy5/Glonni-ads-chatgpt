import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        glonni: {
          ink: "#101828",
          green: "#18a05e",
          mint: "#e9fff3",
          gold: "#ffb020",
          line: "#e7ebf0",
        },
      },
      boxShadow: {
        soft: "0 18px 55px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
