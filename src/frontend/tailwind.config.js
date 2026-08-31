import typography from '@tailwindcss/typography';
import containerQueries from '@tailwindcss/container-queries';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['index.html', 'src/**/*.{js,ts,jsx,tsx,html,css}'],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px'
            }
        },
        extend: {
            colors: {
                border: 'var(--border)',
                input: 'var(--input)',
                ring: 'oklch(var(--ring) / <alpha-value>)',
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                primary: {
                    DEFAULT: 'var(--primary)',
                    foreground: 'var(--primary-foreground)'
                },
                secondary: {
                    DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
                    foreground: 'var(--secondary-foreground)'
                },
                destructive: {
                    DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
                    foreground: 'var(--destructive-foreground)'
                },
                muted: {
                    DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
                    foreground: 'var(--muted-foreground)'
                },
                accent: {
                    DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
                    foreground: 'var(--accent-foreground)'
                },
                popover: {
                    DEFAULT: 'var(--popover)',
                    foreground: 'var(--popover-foreground)'
                },
                card: {
                    DEFAULT: 'var(--card)',
                    foreground: 'var(--card-foreground)'
                },
                chart: {
                    1: 'oklch(var(--chart-1))',
                    2: 'oklch(var(--chart-2))',
                    3: 'oklch(var(--chart-3))',
                    4: 'oklch(var(--chart-4))',
                    5: 'oklch(var(--chart-5))'
                },
                sidebar: {
                    DEFAULT: 'oklch(var(--sidebar))',
                    foreground: 'oklch(var(--sidebar-foreground))',
                    primary: 'oklch(var(--sidebar-primary))',
                    'primary-foreground': 'oklch(var(--sidebar-primary-foreground))',
                    accent: 'oklch(var(--sidebar-accent))',
                    'accent-foreground': 'oklch(var(--sidebar-accent-foreground))',
                    border: 'oklch(var(--sidebar-border))',
                    ring: 'oklch(var(--sidebar-ring))'
                }
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            boxShadow: {
                xs: '0 1px 2px 0 rgba(0,0,0,0.05)',
                deposit: '0 8px 32px rgba(0,0,0,0.35), 0 4px 16px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
                'token-selected': '0 0 0 1px #22d3ee, 0 4px 16px rgba(34,211,238,0.2)',
                'shell-glow': '0 0 60px rgba(139,92,246,0.35), 0 0 120px rgba(139,92,246,0.15)',
                'error-panel': '0 4px 20px rgba(248,113,113,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
                'resume-banner': '0 4px 24px rgba(34,211,238,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
                /* Institutional — hairline rings replace glows on the main page */
                hairline: '0 0 0 1px rgba(255,255,255,0.09)',
                'hairline-strong': '0 0 0 1px rgba(255,255,255,0.16)'
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'countdown-pulse': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.45' }
                },
                'shell-drift': {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '25%': { transform: 'translateY(-7px) rotate(-1.5deg)' },
                    '50%': { transform: 'translateY(-14px) rotate(1.5deg)' },
                    '75%': { transform: 'translateY(-10px) rotate(0.75deg)' }
                },
                'ledger-pulse': {
                    '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(251,191,36,0.6)' },
                    '50%': { opacity: '0.6', boxShadow: '0 0 0 6px rgba(251,191,36,0)' }
                },
                'resume-pulse': {
                    '0%, 100%': { boxShadow: '0 4px 24px rgba(34,211,238,0.12), inset 0 1px 0 rgba(255,255,255,0.08)' },
                    '50%': { boxShadow: '0 4px 32px rgba(34,211,238,0.28), inset 0 1px 0 rgba(255,255,255,0.12)' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'countdown-pulse': 'countdown-pulse 1.6s ease-in-out infinite',
                'shell-drift': 'shell-drift 6s ease-in-out infinite',
                'ledger-pulse': 'ledger-pulse 1.6s ease-in-out infinite',
                'resume-pulse': 'resume-pulse 2.4s ease-in-out infinite'
            }
        }
    },
    plugins: [typography, containerQueries, animate]
};
