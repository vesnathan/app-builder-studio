import { nextui } from "@nextui-org/react";

const tailwindConfig = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../../node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  screens: {
    xs: "0px",
  },
  theme: {
    extend: {
      colors: {
        // App Builder Studio brand colors
        brand: {
          blue: "#2563EB", // primary blue
          blueLight: "#38BDF8", // accent blue
          purple: "#7C3AED", // creative / studio feel
          pink: "#EC4899", // gradient accent
          orange: "#F97316", // builder / action
          green: "#22C55E", // success / deploy
        },
        // Legacy support for existing classes
        "brand-green": "#22C55E",
        "brand-dark": "#0F172A",
        // UI neutrals
        surface: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #2563EB, #7C3AED, #EC4899, #F97316)",
      },
      fontFamily: {
        josefin: ['"Josefin Sans"', "sans-serif"],
        "roboto-slab": ['"Roboto Slab"', "serif"],
      },
    },
  },
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            background: "#FFFFFF",
            foreground: "#0F172A",
            primary: {
              50: "#EFF6FF",
              100: "#DBEAFE",
              200: "#BFDBFE",
              300: "#93C5FD",
              400: "#60A5FA",
              500: "#3B82F6",
              600: "#2563EB", // Brand blue
              700: "#1D4ED8",
              800: "#1E40AF",
              900: "#1E3A8A",
              DEFAULT: "#2563EB",
              foreground: "#FFFFFF",
            },
            secondary: {
              50: "#F5F3FF",
              100: "#EDE9FE",
              200: "#DDD6FE",
              300: "#C4B5FD",
              400: "#A78BFA",
              500: "#8B5CF6",
              600: "#7C3AED", // Brand purple
              700: "#6D28D9",
              800: "#5B21B6",
              900: "#4C1D95",
              DEFAULT: "#7C3AED",
              foreground: "#FFFFFF",
            },
            success: {
              DEFAULT: "#22C55E",
              foreground: "#FFFFFF",
            },
            focus: "#2563EB",
          },
        },
        dark: {
          colors: {
            background: "#0F172A",
            foreground: "#F8FAFC",
            primary: {
              50: "#EFF6FF",
              100: "#DBEAFE",
              200: "#BFDBFE",
              300: "#93C5FD",
              400: "#60A5FA",
              500: "#3B82F6",
              600: "#2563EB",
              700: "#1D4ED8",
              800: "#1E40AF",
              900: "#1E3A8A",
              DEFAULT: "#2563EB",
              foreground: "#FFFFFF",
            },
            secondary: {
              50: "#F5F3FF",
              100: "#EDE9FE",
              200: "#DDD6FE",
              300: "#C4B5FD",
              400: "#A78BFA",
              500: "#8B5CF6",
              600: "#7C3AED",
              700: "#6D28D9",
              800: "#5B21B6",
              900: "#4C1D95",
              DEFAULT: "#7C3AED",
              foreground: "#FFFFFF",
            },
            success: {
              DEFAULT: "#22C55E",
              foreground: "#FFFFFF",
            },
            focus: "#2563EB",
          },
        },
      },
    }),
  ],
};

export default tailwindConfig;
