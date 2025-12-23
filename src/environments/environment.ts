export const environment = {
  production: false,
 // URL do backend que está no ACA do Azured:
  //apiUrl:'https://api-bancodeitens-qa.thankfultree-b9485fed.brazilsouth.azurecontainerapps.io',
  // URL do backend que está no Railway:
  //apiUrl: 'https://bancodeitens-v4-production.up.railway.app' 

  //apiUrl: '/',
  apiUrl: 'https://localhost:5001',
  imagesUrl: '/assets/images/',

 // 🔑 FLAG CRÍTICA: Ativa o MOCK para reenvio de e-mail no desenvolvimento
  isMockEnabled: true

};