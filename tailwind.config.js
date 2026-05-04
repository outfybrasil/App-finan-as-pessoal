/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            /* ── Existing semantic tokens (keeps backward compat) ── */
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

                /* ── Monolith Slate explicit tokens ── */
                ms: {
                    base:      '#0e0e10',  /* The Void */
                    low:       '#131316',  /* surface-container-low */
                    container: '#19191d',  /* surface-container */
                    high:      '#1f1f24',  /* surface-container-high */
                    highest:   '#25252b',  /* surface-container-highest */
                    primary:   '#4edea3',  /* Income / CTA */
                    'on-primary': '#004a31',
                    secondary: '#ff6f7e',  /* Expense */
                    tertiary:  '#ffb148',  /* Warning / Pending */
                    on:        '#e7e4ec',  /* on-surface */
                    muted:     '#acaab1',  /* on-surface-variant */
                    outline:   '#47474e',  /* outline-variant */
                },
            },

            /* ── Border radius: 4px base (Monolith sharpness) ── */
            borderRadius: {
                DEFAULT: '4px',
                sm:  '2px',
                md:  '4px',
                lg:  '8px',
                xl:  '8px',
                '2xl': '8px',
                '3xl': '8px',
                full: '9999px',
            },

            /* ── Font families ── */
            fontFamily: {
                sans:    ['Inter', 'system-ui', 'sans-serif'],
                manrope: ['Manrope', 'Inter', 'sans-serif'],
                inter:   ['Inter', 'system-ui', 'sans-serif'],
            },

            /* ── Spacing — 8px grid ── */
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
            },
        },
    },
    plugins: [],
}
