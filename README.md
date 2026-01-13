# Bolão Online - Frontend (Angular 17+)

Este repositório contém o Frontend da plataforma **Bolão Online**, uma Single Page Application (SPA) desenvolvida em Angular para oferecer uma experiência de usuário fluida, responsiva e integrada a uma API robusta em .NET 8.

## 🚀 Tecnologias Utilizadas
* **Angular 17+**: Framework base para construção de componentes modulares.
* **TypeScript**: Tipagem estática para maior segurança e produtividade.
* **RxJS**: Programação reativa para gestão de fluxos de dados e chamadas assíncronas.
* **SASS (SCSS)**: Estilização avançada com variáveis e mixins.

## 🏗️ Arquitetura do Projeto
O projeto segue as melhores práticas de organização de pastas para escalabilidade:

* **Core**: Contém módulos globais, interceptadores JWT, guardas de rota (AuthGuard) e serviços base.
* **Features**: Módulos organizados por funcionalidades de negócio (Apostas, Resultados, Perfil).
* **Services**: Camada dedicada para comunicação isolada com a API REST utilizando HttpClient.
* **Models**: Definição de Interfaces e DTOs que garantem a tipagem correta dos dados vindos do backend.

## 🔒 Segurança e Integração
* **JWT Interceptor**: Anexa automaticamente o token de autenticação em todas as requisições para áreas protegidas.
* **Auth Guard**: Protege rotas sensíveis, garantindo que apenas usuários autenticados acessem funcionalidades de apostas.

## 🛠️ Como executar o projeto
1. Certifique-se de ter o [Node.js](https://nodejs.org/) e o Angular CLI instalados.
2. Clone o repositório.
3. Execute `npm install` para baixar as dependências.
4. Execute `ng serve` para iniciar o servidor de desenvolvimento.
5. Acesse `http://localhost:4200` no seu navegador.