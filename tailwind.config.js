/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        duoc: {
          green: '#8DC63F',
          navy: '#003366',
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        duoctheme: {
          primary: '#003366',
          'primary-content': '#ffffff',
          secondary: '#8DC63F',
          'secondary-content': '#ffffff',
          accent: '#f5a623',
          neutral: '#f0f4f8',
          'base-100': '#ffffff',
          'base-200': '#f8fafc',
          'base-300': '#e8edf2',
          info: '#3b82f6',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    ],
  },
}
