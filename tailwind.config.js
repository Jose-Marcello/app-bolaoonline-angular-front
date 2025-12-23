/** @type {import('tailwindcss').Config} */
module.exports = {
  // 💥 ESTA É A CORREÇÃO ESSENCIAL
  content: [
    './src/**/*.{html,ts,scss}', 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}