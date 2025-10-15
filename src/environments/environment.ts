/*export const environment = {
  production: false,
  apiUrl: '/api', 
  imagesUrl: '/assets/images/'
};
*/

export const environment = {
  production: false,
  // Aponte para o endereço local do seu backend.
  // A porta padrão para o Kestrel é 5000/5001 (HTTP/HTTPS),
  // mas pode variar dependendo da sua configuração.
  apiUrl: 'https://localhost:5289', // Exemplo de porta
  imagesUrl: '/assets/images/'
};
