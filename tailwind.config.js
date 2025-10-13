// Localização: tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Configura os arquivos que o Tailwind deve escanear para classes
  content: [
    "./src/**/*.{html,ts}", // Inclui arquivos HTML e TypeScript na pasta src
  ],
  theme: {
    extend: {
      // Defina suas cores personalizadas aqui
      colors: {
        'bolao-green-dark': '#0A8F08', // Verde escuro principal
        'bolao-green-medium': '#10B981', // Verde médio para destaques
        'bolao-green-light': '#D1FAE5', // Verde claro para fundos sutis
        'bolao-blue-dark': '#1E3A8A', // Azul escuro para elementos de destaque
        'bolao-blue-medium': '#3B82F6', // Azul médio para fundos
        'bolao-blue-light': '#DBEAFE', // Azul claro para fundos sutis
        'bolao-red-dark': '#DC2626', // Vermelho para erros/alertas
        'bolao-red-light': '#FEE2E2', // Vermelho claro
        'bolao-gray-dark': '#1F2937', // Cinza escuro para texto principal
        'bolao-gray-medium': '#6B7280', // Cinza médio
        'bolao-gray-light': '#F3F4F6', // Cinza claro para fundos
        'bolao-text-black': '#1F2937', // Cor de texto padrão
        'bolao-card-light-gray': '#F9FAFB', // Cor para cards/elementos de UI
        'bolao-accent': '#6366F1', // Cor de destaque (ex: roxo/índigo)
        'bolao-warn': '#EF4444', // Cor de aviso/erro (vermelho)
      },
      // Defina sua fonte personalizada aqui (se estiver usando Inter, por exemplo)
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Exemplo: 'Inter' como fonte padrão
      },
    },
  },
  plugins: [],
}
