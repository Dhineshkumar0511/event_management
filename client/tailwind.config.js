/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        neural: {
          void: '#060612',
          deep: '#0a0b1e',
          surface: '#10122a',
          elevated: '#161842',
          overlay: '#1c1f50',
        },
        accent: {
          cyan: '#00e5ff',
          purple: '#8b5cf6',
          magenta: '#f43f8a',
          green: '#00f5a0',
          amber: '#ffbe0b',
        },
        primary: {
          50: '#e6fcff',
          100: '#b3f5ff',
          200: '#80edff',
          300: '#4de6ff',
          400: '#1adfff',
          500: '#00e5ff',
          600: '#00b8cc',
          700: '#008a99',
          800: '#005c66',
          900: '#002e33',
        },
        success: {
          50: '#e6fff5',
          400: '#34d399',
          500: '#00f5a0',
          600: '#00c27f',
        },
        warning: {
          50: '#fffbeb',
          400: '#ffc93d',
          500: '#ffbe0b',
          600: '#d99f00',
        },
        danger: {
          50: '#fff1f5',
          400: '#f76da0',
          500: '#f43f8a',
          600: '#d62872',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideInUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'data-stream': 'dataStream 3s ease infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'floatOrbit 6s ease-in-out infinite',
        'neural-pulse': 'neuralPulse 2s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'node-float': 'nodeFloat 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'neural': '0 20px 60px rgba(0, 0, 0, 0.4)',
        'neural-lg': '0 30px 80px rgba(0, 0, 0, 0.5)',
        'glow-cyan': '0 0 40px rgba(0, 229, 255, 0.15)',
        'glow-purple': '0 0 40px rgba(139, 92, 246, 0.15)',
        'glow-magenta': '0 0 40px rgba(244, 63, 138, 0.15)',
      },
    },
  },
  plugins: [],
}
