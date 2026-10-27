/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FFFFFF',
          text: '#17221C',
          'text-secondary': '#65736A',
          mint: '#EAF4EC',
          'mint-dark': '#EDF6F0',
          'card-green': '#F4FAF6',
          emerald: '#22C55E', // Vibrant green from reference screenshot (#22c55e)
          'emerald-dark': '#16A34A', // Rich leaf green (#16a34a)
          'emerald-deep': '#15803D', // Deep accent green (#15803d)
          'emerald-light': '#4ADE80', // Soft glow green (#4ade80)
          border: '#DFE9E2',
          muted: '#F7FAF8',
        },
        severity: {
          critical: {
            text: '#B91C1C',
            bg: '#FEF2F2',
            border: '#FCA5A5',
            badge: '#991B1B',
          },
          high: {
            text: '#C2410C',
            bg: '#FFF7ED',
            border: '#FDBA74',
            badge: '#9A3412',
          },
          medium: {
            text: '#B45309',
            bg: '#FFFBEB',
            border: '#FCD34D',
            badge: '#92400E',
          },
          low: {
            text: '#15803D',
            bg: '#ECFDF5',
            border: '#A7F3D0',
            badge: '#166534',
          },
          info: {
            text: '#334155',
            bg: '#F1F5F9',
            border: '#CBD5E1',
            badge: '#1E293B',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(23, 34, 28, 0.05), 0 1px 2px 0 rgba(23, 34, 28, 0.03)',
        'card': '0 4px 14px -2px rgba(23, 34, 28, 0.07), 0 2px 6px -1px rgba(23, 34, 28, 0.04)',
        'elevated': '0 14px 32px -4px rgba(23, 34, 28, 0.09), 0 4px 12px -2px rgba(23, 34, 28, 0.05)',
        'glow-green': '0 0 24px -4px rgba(34, 197, 94, 0.35)',
      }
    },
  },
  plugins: [],
}
