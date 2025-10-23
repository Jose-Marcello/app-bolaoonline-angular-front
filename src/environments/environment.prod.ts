

export const environment = {
  production: true,
  // NOVO: Aponta para o Backend hospedado no Heroku (com SSL gratuito)
  apiUrl: 'https://bolao-online-final-65cf977b9a18.herokuapp.com', 
  // O Front-end agora vai se comunicar com o Back-end no Heroku.
  
  // O imagesUrl pode precisar ser ajustado se o armazenamento de imagens também foi migrado.
  // Por enquanto, aponte para o backend, assumindo que ele serve as imagens.
  imagesUrl: 'https://bolao-online-final-65cf977b9a18.herokuapp.com'
};

/*
export const environment = {
  production: true,
  // Use seu domínio personalizado para todas as chamadas de API
  apiUrl: 'https://app.palpitesbolao.com.br',
  imagesUrl: 'https://app.palpitesbolao.com.br'
};

  
  //apiUrl: 'https://bolaoonline-docker.azurewebsites.net',
  //imagesUrl: 'https://bolaoonline-docker.azurewebsites.net',

  // apiUrl: 'https://bolaoonline-testes4.azurewebsites.net',
  // imagesUrl: 'https://bolaoonline-testes4.azurewebsites.net' 
