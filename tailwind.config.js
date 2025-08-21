/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"], // optional: enable later if you add a dark toggle
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1200px" }
    },
    extend: {
      colors: {
        // Primaries
        ink: "#0A0A0A",        // almost black
        paper: "#FFFFFF",      // white
        // Accents (muted, modern)
        orange: { DEFAULT: "#FF7A1A", 50: "#FFF4EC", 100: "#FFE7D6", 200: "#FFC9A8", 300: "#FFAA79", 400: "#FF8C4B", 500: "#FF7A1A", 600: "#E2650E", 700: "#B14F0C", 800: "#7F3909", 900: "#4D2305" },
        green:  { DEFAULT: "#21B17C", 50: "#ECFDF6", 100: "#D1FAE8", 200: "#A7F3D0", 300: "#6EE7B7", 400: "#34D399", 500: "#21B17C", 600: "#159B6A", 700: "#107856", 800: "#0C5943", 900: "#093F31" },
        yellow: { DEFAULT: "#F4C21F", 50: "#FFFAE8", 100: "#FFF3C5", 200: "#FFE78C", 300: "#FEDF5A", 400: "#FBD129", 500: "#F4C21F", 600: "#D5A80F", 700: "#A5810C", 800: "#735A08", 900: "#4A3A05" },
        red:    { DEFAULT: "#E5484D", 50: "#FFF1F2", 100: "#FFE4E6", 200: "#FECDD3", 300: "#FDA4AF", 400: "#FB7185", 500: "#E5484D", 600: "#C0363C", 700: "#9A2B30", 800: "#6F1F22", 900: "#471416" },
        blue:   { DEFAULT: "#3B82F6", 50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD", 400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8", 800: "#1E40AF", 900: "#1E3A8A" }
      },
      borderRadius: {
        xl: "1rem",
        lg: "0.75rem"
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(10,10,10,0.06), 0 8px 24px rgba(10,10,10,0.06)"
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Inter', 'Roboto', 'Apple Color Emoji', 'Segoe UI Emoji']
      }
    }
  },
  plugins: []
};
