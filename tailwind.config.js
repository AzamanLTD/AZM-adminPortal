/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm:  '4px',
        md:  '6px',
        DEFAULT: '8px',
        lg:  '8px',
        xl:  '12px',
        '2xl': '16px',
      },
      colors: {
        // CSS-var token shortcuts
        'az-bg':       'var(--az-bg)',
        'az-sidebar':  'var(--az-sidebar-bg)',
        'az-surface-0': 'var(--az-surface-0)',
        'az-surface-1': 'var(--az-surface-1)',
        'az-surface-2': 'var(--az-surface-2)',
        'az-border':   'var(--az-border)',
        'az-emerald':  'var(--az-emerald)',
        'az-text':     'var(--az-text)',
        'az-text-secondary': 'var(--az-text-secondary)',
        'az-text-muted': 'var(--az-text-muted)',
        // Legacy color names used in existing page files
        'az-black':    'var(--az-bg)',
        'az-card':     'var(--az-surface-0)',
        'az-card-bg':  'var(--az-surface-0)',
        'az-blue':     'var(--az-info)',
        'az-purple':   'var(--az-violet)',
        'az-amber':    'var(--az-warning)',
        'az-red':      'var(--az-danger)',
        'az-teal':     'var(--az-teal)',
        // shadcn tokens
        background: 'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT:            'hsl(var(--sidebar-background))',
          foreground:         'hsl(var(--sidebar-foreground))',
          primary:            'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent:             'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border:             'hsl(var(--sidebar-border))',
          ring:               'hsl(var(--sidebar-ring))',
        },
      },
      boxShadow: {
        'az-xs': 'var(--az-shadow-xs)',
        'az-sm': 'var(--az-shadow-sm)',
        'az-md': 'var(--az-shadow-md)',
        'az-lg': 'var(--az-shadow-lg)',
      },
      backgroundImage: {
        'az-gradient': 'linear-gradient(135deg, rgba(0,217,126,0.12) 0%, rgba(37,99,235,0.12) 100%)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in':       { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-8px)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        'scale-in':      { from: { transform: 'scale(0.97)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        'az-pulse':      { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        'az-spin':       { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'accordion-down':  'accordion-down 0.18s ease-out',
        'accordion-up':    'accordion-up 0.18s ease-out',
        'fade-in':         'fade-in 0.2s ease-out',
        'slide-in-left':   'slide-in-left 0.18s ease-out',
        'scale-in':        'scale-in 0.15s ease-out',
        'az-pulse':        'az-pulse 1.6s ease-in-out infinite',
        'az-spin':         'az-spin 0.7s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
