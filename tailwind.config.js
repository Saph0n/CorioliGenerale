import { nextui } from "@nextui-org/react";

/** Verde brand — solo CTA solide e link attivi espliciti */
const brand = {
  50: "#F1F7F6",
  100: "#DEEFEA",
  200: "#BEE0D9",
  300: "#91C8BF",
  400: "#63A79C",
  500: "#428C81",
  600: "#316E66",
  700: "#2A5852",
  800: "#244843",
  900: "#1F3C38",
  950: "#0F2220",
};

const slate = {
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
};

/** primary-50…400 = neutri; 500+ = brand (evita wash verde su flat/bg) */
const primaryTheme = {
  50: slate[50],
  100: slate[100],
  200: slate[200],
  300: slate[300],
  400: slate[400],
  500: brand[600],
  600: brand[700],
  700: brand[800],
  800: brand[900],
  900: brand[950],
  DEFAULT: brand[800],
  foreground: "#FFFFFF",
};

const secondaryTheme = {
  ...slate,
  DEFAULT: slate[100],
  foreground: slate[700],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        /**
         * Un carattere solo, in tutta l'applicazione e in tutto il referto.
         *
         * Nel PDF il testo e' in Helvetica, che e' uno dei caratteri standard
         * del formato e quindi non viene incorporato nel file: a disegnarla e'
         * il lettore, e su Windows la sostituisce con Arial. Per far vedere a
         * schermo quello che esce dalla stampante l'ordine e' quello, Arial
         * prima: su Mac si ferma su Helvetica in tutti e due i posti.
         *
         * `sans` e' la famiglia predefinita di Tailwind, quindi sostituirla qui
         * cambia il carattere di ogni schermata; `referto` resta separata anche
         * se oggi contiene la stessa cosa, perche' i campi in cui si scrive il
         * referto devono seguire la stampa comunque, anche se un domani
         * l'interfaccia tornasse al carattere di sistema.
         */
        sans: ["Arial", "Helvetica", "sans-serif"],
        referto: ["Arial", "Helvetica", "sans-serif"],
      },
      colors: {
        brand,
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F1F5F9",
          page: "#F8FAFC",
        },
      },
    },
  },
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            background: { DEFAULT: slate[50] },
            foreground: { DEFAULT: slate[900] },
            focus: { DEFAULT: slate[400] },
            divider: { DEFAULT: slate[200] },
            default: {
              ...slate,
              DEFAULT: slate[200],
              foreground: slate[700],
            },
            content1: {
              DEFAULT: "#FFFFFF",
              foreground: slate[900],
            },
            content2: {
              DEFAULT: slate[100],
              foreground: slate[700],
            },
            content3: {
              DEFAULT: slate[200],
              foreground: slate[600],
            },
            primary: primaryTheme,
            secondary: secondaryTheme,
            success: {
              50: "#F0FDF4",
              100: "#DCFCE7",
              200: "#BBF7D0",
              300: "#86EFAC",
              400: "#4ADE80",
              500: "#22C55E",
              600: "#16A34A",
              700: "#15803D",
              800: "#166534",
              900: "#14532D",
              DEFAULT: "#16A34A",
              foreground: "#FFFFFF",
            },
          },
        },
      },
    }),
  ],
};
