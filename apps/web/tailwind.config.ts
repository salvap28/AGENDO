import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pulse: {
          violet: "#7B6CFF",
          blue: "#88C9FF",
          turquoise: "#56E1E9",
          base: "#0C0B13",
          warm: "#F5F5F7",
          mist: "rgba(255,255,255,0.55)",
          ink: "#ffffff",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(123,108,255,.25)",
        panel: "0 10px 30px rgba(0,0,0,.35)",
        "panel-soft": "0 45px 120px rgba(8,7,15,.55)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
}
export default config
